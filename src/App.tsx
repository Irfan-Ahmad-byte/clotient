import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import packageJson from "../package.json";
import "./App.css";
import Sidebar from "./components/Sidebar";
import RequestBuilder from "./components/RequestBuilder";
import ResponseViewer from "./components/ResponseViewer";
import CodeGenerator from "./components/CodeGenerator";
import { ClotientCollection, ClotientRequest, Environment, HistoryItem, HttpResponsePayload } from "./types";
import { executeScript, SandboxContext } from "./utils/scriptSandbox";
import { resolveVariables } from "./utils/envResolver";

const uuid = () => Math.random().toString(36).substring(2, 11);

const createNewBlankRequest = (name: string = "New Request"): ClotientRequest => ({
  id: uuid(),
  name,
  method: "GET",
  url: "https://httpbin.org/get",
  headers: [],
  params: [],
  body: { type: "none", rawText: "", urlencoded: [], formData: [] },
  scripts: { preRequest: "", postRequest: "" },
  auth: { type: "none" }
});

const defaultCollections: ClotientCollection[] = [
  {
    id: uuid(),
    name: "HTTPBin Demo API",
    folders: [],
    requests: [
      {
        id: uuid(),
        name: "GET JSON Data",
        method: "GET",
        url: "https://httpbin.org/json",
        headers: [{ id: uuid(), key: "Accept", value: "application/json", enabled: true }],
        params: [],
        body: { type: "none", rawText: "", urlencoded: [], formData: [] },
        scripts: {
          preRequest: `cs.log("Pre-request executed!");\ncs.request.headers.add("X-Pre-Header", "added-value");`,
          postRequest: `cs.log("Post-request executing assertions...");\ncs.assert(cs.response.status === 200, "Response status should be 200 OK");\nconst parsed = cs.response.json();\ncs.assert(parsed.slideshow !== undefined, "Verify slides list exists");`
        },
        auth: { type: "none" }
      },
      {
        id: uuid(),
        name: "POST Echo Variables",
        method: "POST",
        url: "https://httpbin.org/post",
        headers: [{ id: uuid(), key: "Content-Type", value: "application/json", enabled: true }],
        params: [],
        body: {
          type: "json",
          rawText: `{\n  "app": "Clotient",\n  "status": "ready",\n  "env_value": "{{host}}"\n}`
        },
        scripts: {
          preRequest: `cs.log("Setting header pre-request");`,
          postRequest: `cs.assert(cs.response.status === 200, "Should echo back 200 status");`
        },
        auth: { type: "none" }
      }
    ]
  }
];

const defaultEnvironments: Environment[] = [
  {
    id: uuid(),
    name: "Demo Environment",
    variables: [
      { id: uuid(), key: "host", value: "https://httpbin.org", enabled: true },
      { id: uuid(), key: "token", value: "demo_secure_token_12345", enabled: true }
    ]
  }
];

export default function App() {
  // Navigation & Active state
  const [collections, setCollections] = useState<ClotientCollection[]>([]);
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [activeRequest, setActiveRequest] = useState<ClotientRequest | null>(null);
  const [activeEnv, setActiveEnv] = useState<Environment | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  // App load states
  const [loadingApp, setLoadingApp] = useState(true);
  const [loaded, setLoaded] = useState(false);

  // Request runtime states
  const [loadingRequest, setLoadingRequest] = useState(false);
  const [response, setResponse] = useState<HttpResponsePayload | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [assertions, setAssertions] = useState<{ passed: boolean; message: string }[]>([]);
  const [errorMsg, setErrorMsg] = useState("");

  // Cancellation reference
  const activeRequestId = useRef<string | null>(null);

  // App-level Custom prompt dialog modal
  const [promptOpen, setPromptOpen] = useState(false);
  const [promptConfig, setPromptConfig] = useState<{
    title: string;
    message: string;
    placeholder?: string;
    defaultValue?: string;
    onConfirm: (val: string) => void;
  } | null>(null);

  // Snippets Generator states
  const [showCodeGenModal, setShowCodeGenModal] = useState(false);

  // 1. Initial Load from Local Storage on Mount
  useEffect(() => {
    document.title = `Clotient Studio - v${packageJson.version}`;
    async function loadData() {
      try {
        const collectionsStr: string = await invoke("load_data", { fileName: "collections.json" });
        const environmentsStr: string = await invoke("load_data", { fileName: "environments.json" });
        const historyStr: string = await invoke("load_data", { fileName: "history.json" });

        const loadedCollections = collectionsStr ? JSON.parse(collectionsStr) : defaultCollections;
        const loadedEnvironments = environmentsStr ? JSON.parse(environmentsStr) : defaultEnvironments;
        const loadedHistory = historyStr ? JSON.parse(historyStr) : [];

        setCollections(loadedCollections);
        setEnvironments(loadedEnvironments);
        setHistory(loadedHistory);

        // Set default active request
        if (loadedCollections.length > 0) {
          if (loadedCollections[0].requests.length > 0) {
            setActiveRequest(loadedCollections[0].requests[0]);
          } else if (loadedCollections[0].folders.length > 0 && loadedCollections[0].folders[0].requests.length > 0) {
            setActiveRequest(loadedCollections[0].folders[0].requests[0]);
          } else {
            setActiveRequest(createNewBlankRequest());
          }
        } else {
          setActiveRequest(createNewBlankRequest());
        }

        // Set active environment
        if (loadedEnvironments.length > 0) {
          setActiveEnv(loadedEnvironments[0]);
        }
      } catch (e) {
        // Fallback to defaults
        setCollections(defaultCollections);
        setEnvironments(defaultEnvironments);
        setHistory([]);
        setActiveRequest(defaultCollections[0].requests[0]);
        if (defaultEnvironments.length > 0) {
          setActiveEnv(defaultEnvironments[0]);
        }
      } finally {
        setLoadingApp(false);
        setLoaded(true);
      }
    }
    loadData();
  }, []);

  // 2. Auto-save changes to disk on data modifications
  useEffect(() => {
    if (!loaded) return;
    async function saveData() {
      try {
        await invoke("save_data", { fileName: "collections.json", content: JSON.stringify(collections) });
      } catch (e) {
        console.error("Save collections failed", e);
      }
    }
    saveData();
  }, [collections, loaded]);

  useEffect(() => {
    if (!loaded) return;
    async function saveData() {
      try {
        await invoke("save_data", { fileName: "environments.json", content: JSON.stringify(environments) });
      } catch (e) {
        console.error("Save environments failed", e);
      }
    }
    saveData();
  }, [environments, loaded]);

  useEffect(() => {
    if (!loaded) return;
    async function saveData() {
      try {
        await invoke("save_data", { fileName: "history.json", content: JSON.stringify(history) });
      } catch (e) {
        console.error("Save history failed", e);
      }
    }
    saveData();
  }, [history, loaded]);

  // Handler to update selected request details in collections mapping
  const handleActiveRequestChange = (updated: ClotientRequest) => {
    setActiveRequest(updated);

    setCollections((prevCollections) =>
      prevCollections.map((c) => {
        // If request is at the collection top-level
        const hasReqAtTop = c.requests.some((r) => r.id === updated.id);
        if (hasReqAtTop) {
          return {
            ...c,
            requests: c.requests.map((r) => (r.id === updated.id ? updated : r))
          };
        }

        // If request is inside a folder
        const hasReqInFolder = c.folders.some((f) => f.requests.some((r) => r.id === updated.id));
        if (hasReqInFolder) {
          return {
            ...c,
            folders: c.folders.map((f) => ({
              ...f,
              requests: f.requests.map((r) => (r.id === updated.id ? updated : r))
            }))
          };
        }

        return c;
      })
    );
  };

  // 3. Main Query Dispatcher
  const handleSendRequest = async () => {
    if (!activeRequest) return;

    setLoadingRequest(true);
    setResponse(null);
    setLogs([]);
    setAssertions([]);
    setErrorMsg("");

    const reqId = uuid();
    activeRequestId.current = reqId;

    let requestCopy = JSON.parse(JSON.stringify(activeRequest)) as ClotientRequest;
    const runLogs: string[] = [];
    const runAssertions: { passed: boolean; message: string }[] = [];

    // Local environment copy that scripts can read/write to
    const envVars: Record<string, string> = {};
    if (activeEnv) {
      activeEnv.variables.forEach((v) => {
        if (v.enabled && v.key) envVars[v.key] = v.value;
      });
    }

    const sandboxEnv: SandboxContext["env"] = {
      get: (key) => envVars[key] || "",
      set: (key, value) => {
        envVars[key] = value;
        runLogs.push(`cs.env.set: Set variable "${key}" = "${value}"`);
      }
    };

    const sandboxRequest: SandboxContext["request"] = {
      headers: {
        add: (k, v) => {
          requestCopy.headers.push({ id: uuid(), key: k, value: v, enabled: true });
          runLogs.push(`cs.request.headers.add: Added header "${k}: ${v}"`);
        },
        remove: (k) => {
          requestCopy.headers = requestCopy.headers.filter((h) => h.key.toLowerCase() !== k.toLowerCase());
          runLogs.push(`cs.request.headers.remove: Removed header "${k}"`);
        }
      }
    };

    // A. Pre-request Script Sandbox run
    if (requestCopy.scripts.preRequest) {
      runLogs.push("--- Running Pre-request Script ---");
      const preResult = executeScript(requestCopy.scripts.preRequest, {
        env: sandboxEnv,
        request: sandboxRequest
      });
      runLogs.push(...preResult.logs);
      runAssertions.push(...preResult.assertions);
    }

    // B. Resolve Environment Variables
    const url = resolveVariables(requestCopy.url, activeEnv, envVars);

    // Validation 1: Unresolved environment variables keys remaining in URL path
    if (/\{\{[^}]+\}\}/.test(url)) {
      const matches = url.match(/\{\{([^}]+)\}\}/g);
      setErrorMsg(`Validation Error: Unresolved environment variables: ${matches?.join(", ")}. Please define or enable them in your environment settings.`);
      setLoadingRequest(false);
      activeRequestId.current = null;
      return;
    }

    // Validation 2: Ensure URL parses cleanly
    try {
      new URL(url);
    } catch {
      setErrorMsg(`Validation Error: "${url}" is not a valid absolute URL. Please ensure it starts with http:// or https://`);
      setLoadingRequest(false);
      activeRequestId.current = null;
      return;
    }

    // Resolve Headers
    const headersMap: Record<string, string> = {};
    requestCopy.headers.forEach((h) => {
      if (h.enabled && h.key) {
        headersMap[h.key] = resolveVariables(h.value, activeEnv, envVars);
      }
    });

    // Resolve Auth structures
    if (requestCopy.auth.type === "bearer" && requestCopy.auth.bearerToken) {
      const resolvedToken = resolveVariables(requestCopy.auth.bearerToken, activeEnv, envVars);
      headersMap["Authorization"] = `Bearer ${resolvedToken}`;
    } else if (requestCopy.auth.type === "basic" && requestCopy.auth.basicUsername) {
      const u = resolveVariables(requestCopy.auth.basicUsername, activeEnv, envVars);
      const p = resolveVariables(requestCopy.auth.basicPassword || "", activeEnv, envVars);
      // base64 encoding basic credentials
      headersMap["Authorization"] = `Basic ${btoa(`${u}:${p}`)}`;
    }

    // Resolve Request payload details
    let bodyText: string | null = null;
    let formDataList: [string, string][] | null = null;

    if (requestCopy.body.type === "json" || requestCopy.body.type === "raw") {
      bodyText = resolveVariables(requestCopy.body.rawText, activeEnv, envVars);
    } else if (requestCopy.body.type === "urlencoded" && requestCopy.body.urlencoded) {
      formDataList = requestCopy.body.urlencoded
        .filter((x) => x.enabled && x.key)
        .map((x) => [x.key, resolveVariables(x.value, activeEnv, envVars)]);
    } else if (requestCopy.body.type === "form-data" && requestCopy.body.formData) {
      formDataList = requestCopy.body.formData
        .filter((x) => x.enabled && x.key)
        .map((x) => [x.key, resolveVariables(x.value, activeEnv, envVars)]);
    }

    // C. Dispatch Request to Rust Backend Command
    try {
      const rustRes: any = await invoke("send_http_request", {
        req: {
          url,
          method: requestCopy.method,
          headers: headersMap,
          body_type: requestCopy.body.type,
          body_text: bodyText,
          form_data: formDataList,
          timeout_ms: 30000
        }
      });

      // Abort updating UI states if request was cancelled
      if (activeRequestId.current !== reqId) {
        return;
      }

      const responsePayload: HttpResponsePayload = {
        status: rustRes.status,
        statusText: rustRes.status_text,
        headers: rustRes.headers,
        body: rustRes.body,
        timeMs: rustRes.time_ms,
        sizeBytes: rustRes.size_bytes,
        contentType: rustRes.content_type
      };

      setResponse(responsePayload);

      // D. Post-request Script (Tests/Assertions) Sandbox run
      if (requestCopy.scripts.postRequest) {
        runLogs.push("--- Running Post-request Script ---");
        const postResult = executeScript(requestCopy.scripts.postRequest, {
          env: sandboxEnv,
          request: sandboxRequest,
          response: {
            status: responsePayload.status,
            json: () => JSON.parse(responsePayload.body),
            text: () => responsePayload.body
          }
        });
        runLogs.push(...postResult.logs);
        runAssertions.push(...postResult.assertions);
      }

      // E. Append to History list
      const newHistoryItem: HistoryItem = {
        id: uuid(),
        url: requestCopy.url,
        method: requestCopy.method,
        timestamp: Date.now(),
        request: JSON.parse(JSON.stringify(activeRequest)), // store original query config
        response: responsePayload
      };
      setHistory((prevHistory) => [newHistoryItem, ...prevHistory].slice(0, 100)); // cap at 100 history items

      // F. If variables were updated in Sandbox environment, sync them back to the active environment!
      if (activeEnv) {
        const updatedVariables = activeEnv.variables.map((v) => {
          if (envVars[v.key] !== undefined) {
            return { ...v, value: envVars[v.key] };
          }
          return v;
        });

        // Add newly set variables not in activeEnv list
        Object.keys(envVars).forEach((key) => {
          if (!activeEnv.variables.some((v) => v.key === key)) {
            updatedVariables.push({
              id: uuid(),
              key,
              value: envVars[key],
              enabled: true
            });
          }
        });

        setEnvironments((prevEnvs) =>
          prevEnvs.map((e) => (e.id === activeEnv.id ? { ...e, variables: updatedVariables } : e))
        );
        setActiveEnv({ ...activeEnv, variables: updatedVariables });
      }

      setLogs(runLogs);
      setAssertions(runAssertions);
    } catch (err: any) {
      if (activeRequestId.current !== reqId) {
        return;
      }
      setErrorMsg(err.toString());
      setLogs(runLogs);
      setAssertions(runAssertions);
    } finally {
      if (activeRequestId.current === reqId) {
        setLoadingRequest(false);
      }
    }
  };

  const handleCancelRequest = () => {
    activeRequestId.current = null;
    setLoadingRequest(false);
    setErrorMsg("Request cancelled by user");
  };

  const handleCreateEnvVar = (key: string) => {
    if (!activeEnv) return;
    setPromptConfig({
      title: "Create Environment Variable",
      message: `Specify initial value for variable "${key}":`,
      placeholder: "Variable Value",
      defaultValue: "",
      onConfirm: (enteredValue: string) => {
        const newVar = {
          id: uuid(),
          key,
          value: enteredValue,
          enabled: true
        };
        const updatedVars = [...activeEnv.variables, newVar];
        setEnvironments((prevEnvs) =>
          prevEnvs.map((e) => (e.id === activeEnv.id ? { ...e, variables: updatedVars } : e))
        );
        setActiveEnv({ ...activeEnv, variables: updatedVars });
        setPromptOpen(false);
      }
    });
    setPromptOpen(true);
  };

  // Collections CRUD handlers
  const handleCreateCollection = (name: string) => {
    const newColl: ClotientCollection = {
      id: uuid(),
      name,
      requests: [],
      folders: []
    };
    setCollections([...collections, newColl]);
  };

  const handleDeleteCollection = (id: string) => {
    setCollections(collections.filter((c) => c.id !== id));
  };

  const handleCreateFolder = (collectionId: string, name: string) => {
    setCollections(
      collections.map((c) => {
        if (c.id !== collectionId) return c;
        return {
          ...c,
          folders: [...c.folders, { id: uuid(), name, requests: [] }]
        };
      })
    );
  };

  const handleCreateRequest = (collectionId: string, folderId: string | null, name: string) => {
    const newReq = createNewBlankRequest(name);
    setCollections(
      collections.map((c) => {
        if (c.id !== collectionId) return c;

        if (folderId === null) {
          return {
            ...c,
            requests: [...c.requests, newReq]
          };
        } else {
          return {
            ...c,
            folders: c.folders.map((f) => (f.id === folderId ? { ...f, requests: [...f.requests, newReq] } : f))
          };
        }
      })
    );
    setActiveRequest(newReq);
  };

  const handleDeleteRequest = (collectionId: string, folderId: string | null, reqId: string) => {
    setCollections(
      collections.map((c) => {
        if (c.id !== collectionId) return c;

        if (folderId === null) {
          return {
            ...c,
            requests: c.requests.filter((r) => r.id !== reqId)
          };
        } else {
          return {
            ...c,
            folders: c.folders.map((f) =>
              f.id === folderId ? { ...f, requests: f.requests.filter((r) => r.id !== reqId) } : f
            )
          };
        }
      })
    );
    if (activeRequest?.id === reqId) {
      setActiveRequest(null);
    }
  };

  const handleImportCollection = (imported: ClotientCollection) => {
    setCollections([...collections, imported]);
    if (imported.requests.length > 0) {
      setActiveRequest(imported.requests[0]);
    } else if (imported.folders.length > 0 && imported.folders[0].requests.length > 0) {
      setActiveRequest(imported.folders[0].requests[0]);
    }
  };

  if (loadingApp) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#0b0f19] text-[#e5e7eb] select-none">
        <div className="text-center font-sans">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <h2 className="text-md font-semibold text-gray-300">Initializing Clotient Studio...</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#0b0f19] text-[#e5e7eb] overflow-hidden font-sans">
      {/* Sidebar Panel */}
      <Sidebar
        collections={collections}
        environments={environments}
        history={history}
        activeRequest={activeRequest}
        activeEnv={activeEnv}
        onSelectRequest={(req) => {
          setActiveRequest(req);
          setResponse(null);
          setLogs([]);
          setAssertions([]);
          setErrorMsg("");
        }}
        onSelectEnv={setActiveEnv}
        onCreateCollection={handleCreateCollection}
        onCreateFolder={handleCreateFolder}
        onCreateRequest={handleCreateRequest}
        onDeleteRequest={handleDeleteRequest}
        onDeleteCollection={handleDeleteCollection}
        onImportCollection={handleImportCollection}
        onUpdateEnvironments={setEnvironments}
        onClearHistory={() => setHistory([])}
      />

      {/* Main Request Workspace Panel */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {activeRequest ? (
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden divide-y divide-gray-800">
            {/* Upper: Request Builder */}
            <div className="flex-[6] min-h-0 flex flex-col">
              <RequestBuilder
                request={activeRequest}
                onChange={handleActiveRequestChange}
                onSend={handleSendRequest}
                onGenerateCode={() => setShowCodeGenModal(true)}
                loading={loadingRequest}
                activeEnv={activeEnv}
                onCancel={handleCancelRequest}
                onCreateEnvVar={handleCreateEnvVar}
              />
            </div>

            {/* Lower: Response Viewer */}
            <div className="flex-[4] min-h-0 flex flex-col">
              <ResponseViewer
                response={response}
                loading={loadingRequest}
                logs={logs}
                assertions={assertions}
                errorMsg={errorMsg}
              />
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-500 bg-gray-950/10 select-none p-6 animate-in fade-in duration-300">
            <div className="w-16 h-16 mb-4 rounded-xl bg-gray-950/40 p-2 border border-gray-800 shadow-xl flex items-center justify-center">
              <img src="/logo.png" className="w-12 h-12 rounded-lg" alt="Clotient Logo" />
            </div>
            <h3 className="text-sm font-semibold text-gray-300 mb-1.5 tracking-wide">Clotient Studio</h3>
            <p className="text-xs text-gray-500 max-w-sm text-center leading-relaxed mb-6">
              A local-first, lightweight REST client. Create or select a request from the sidebar to begin.
            </p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-[11px] border-t border-gray-900/60 pt-6 w-full max-w-xs text-gray-400">
              <div className="flex justify-between gap-4"><span className="text-gray-500">Create Request</span><kbd className="bg-gray-850 px-1.5 py-0.5 rounded text-[10px] text-gray-300 font-semibold border border-gray-800">Ctrl + N</kbd></div>
              <div className="flex justify-between gap-4"><span className="text-gray-500">Send Request</span><kbd className="bg-gray-850 px-1.5 py-0.5 rounded text-[10px] text-gray-300 font-semibold border border-gray-800">Ctrl + Enter</kbd></div>
              <div className="flex justify-between gap-4"><span className="text-gray-500">Import Collection</span><kbd className="bg-gray-850 px-1.5 py-0.5 rounded text-[10px] text-gray-300 font-semibold border border-gray-800">Ctrl + I</kbd></div>
              <div className="flex justify-between gap-4"><span className="text-gray-500">Close Tabs</span><kbd className="bg-gray-850 px-1.5 py-0.5 rounded text-[10px] text-gray-300 font-semibold border border-gray-800">Esc</kbd></div>
            </div>
          </div>
        )}
      </div>

      {/* Code Snippets Modal */}
      {showCodeGenModal && activeRequest && (
        <CodeGenerator
          request={activeRequest}
          activeEnv={activeEnv}
          onClose={() => setShowCodeGenModal(false)}
        />
      )}

      {/* Custom dialog prompt overlay modal */}
      {promptOpen && promptConfig && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-lg w-full max-w-sm overflow-hidden text-sm shadow-2xl animate-in fade-in duration-200">
            <div className="p-4 bg-[#0e1322] border-b border-gray-850 flex justify-between items-center select-none">
              <h4 className="text-gray-100 font-semibold">{promptConfig.title}</h4>
              <button onClick={() => setPromptOpen(false)} className="text-gray-400 hover:text-white cursor-pointer">✕</button>
            </div>
            <div className="p-4 space-y-3">
              <p className="text-xs text-gray-400 leading-relaxed select-text">{promptConfig.message}</p>
              <input
                type="text"
                id="app-prompt-input"
                className="w-full bg-[#0e1322] border border-gray-850 rounded px-3 py-2 text-xs outline-none text-gray-250 focus:border-indigo-500 font-medium"
                placeholder={promptConfig.placeholder}
                defaultValue={promptConfig.defaultValue}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const val = (document.getElementById("app-prompt-input") as HTMLInputElement)?.value || "";
                    promptConfig.onConfirm(val);
                  } else if (e.key === "Escape") {
                    setPromptOpen(false);
                  }
                }}
              />
            </div>
            <div className="px-4 py-3 bg-[#0e1322] border-t border-gray-800 flex justify-end gap-2.5 select-none">
              <button
                onClick={() => setPromptOpen(false)}
                className="px-3.5 py-1.5 border border-gray-705 hover:bg-gray-800 text-gray-300 rounded text-xs transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const val = (document.getElementById("app-prompt-input") as HTMLInputElement)?.value || "";
                  promptConfig.onConfirm(val);
                }}
                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs transition font-semibold cursor-pointer"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
