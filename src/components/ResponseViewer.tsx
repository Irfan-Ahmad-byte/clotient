import { useState } from "react";
import { CheckCircle2, XCircle, AlertCircle, FileCode, List, FileTerminal, ShieldAlert } from "lucide-react";
import { HttpResponsePayload } from "../types";

interface ResponseViewerProps {
  response: HttpResponsePayload | null;
  loading: boolean;
  logs: string[];
  assertions: { passed: boolean; message: string }[];
  errorMsg?: string;
}

type ResponseTab = "body" | "headers" | "logs" | "tests";
type BodyFormat = "pretty" | "raw" | "preview";

export default function ResponseViewer({
  response,
  loading,
  logs,
  assertions,
  errorMsg
}: ResponseViewerProps) {
  const [activeTab, setActiveTab] = useState<ResponseTab>("body");
  const [bodyFormat, setBodyFormat] = useState<BodyFormat>("pretty");

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-gray-950 text-gray-400 select-none">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-3"></div>
        <p className="text-sm">Sending Request...</p>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-gray-950 text-red-400 p-6 select-none">
        <AlertCircle className="w-10 h-10 mb-3" />
        <h4 className="font-semibold mb-1">Request Execution Failed</h4>
        <p className="text-xs text-gray-500 font-mono text-center max-w-md break-words bg-red-950/20 border border-red-900/30 p-3 rounded">
          {errorMsg}
        </p>
      </div>
    );
  }

  if (!response) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-gray-950 text-gray-500 select-none text-center">
        <FileCode className="w-12 h-12 text-gray-700 mb-3 animate-pulse" />
        <p className="text-sm font-medium text-gray-400">No Response Received</p>
        <p className="text-xs text-gray-600 mt-1 max-w-xs">
          Enter a URL and click Send in the query builder to dispatch an API request.
        </p>
      </div>
    );
  }

  // Formatting helpers
  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getStatusColor = (status: number) => {
    if (status >= 200 && status < 300) return "bg-emerald-950/40 text-emerald-400 border-emerald-850/50";
    if (status >= 300 && status < 400) return "bg-amber-950/40 text-amber-400 border-amber-850/50";
    return "bg-red-950/40 text-red-400 border-red-850/50";
  };

  const getPrettyBody = () => {
    try {
      const parsed = JSON.parse(response.body);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return response.body;
    }
  };

  const isHtml = response.contentType.includes("html");

  return (
    <div className="flex-1 flex flex-col bg-gray-950 overflow-hidden text-sm">
      {/* Response Metrics Header */}
      <div className="px-6 py-3 bg-gray-900 border-b border-gray-800 flex items-center justify-between flex-wrap gap-3 select-none">
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-gray-500">Status:</span>
          <span className={`px-2 py-0.5 rounded border text-xs font-mono font-bold ${getStatusColor(response.status)}`}>
            {response.status} {response.statusText}
          </span>
        </div>

        <div className="flex items-center gap-4 text-xs text-gray-400 font-mono">
          <div className="flex items-center gap-1.5">
            <span className="text-gray-600 font-sans font-semibold">Time:</span>
            <span className="text-indigo-400 font-bold">{response.timeMs} ms</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-gray-600 font-sans font-semibold">Size:</span>
            <span className="text-indigo-400 font-bold">{formatSize(response.sizeBytes)}</span>
          </div>
        </div>
      </div>

      {/* Response View Navigation tabs */}
      <div className="flex bg-gray-900/50 border-b border-gray-850 px-4 justify-between items-center select-none shrink-0">
        <div className="flex">
          <button
            className={`py-2.5 px-4 text-xs font-medium border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === "body"
                ? "border-indigo-500 text-indigo-400 bg-gray-950/40"
                : "border-transparent text-gray-500 hover:text-gray-300"
            }`}
            onClick={() => setActiveTab("body")}
          >
            <FileCode className="w-3.5 h-3.5" /> Body
          </button>
          <button
            className={`py-2.5 px-4 text-xs font-medium border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === "headers"
                ? "border-indigo-500 text-indigo-400 bg-gray-950/40"
                : "border-transparent text-gray-500 hover:text-gray-300"
            }`}
            onClick={() => setActiveTab("headers")}
          >
            <List className="w-3.5 h-3.5" /> Headers
          </button>
          <button
            className={`py-2.5 px-4 text-xs font-medium border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === "logs"
                ? "border-indigo-500 text-indigo-400 bg-gray-950/40"
                : "border-transparent text-gray-500 hover:text-gray-300"
            }`}
            onClick={() => setActiveTab("logs")}
          >
            <FileTerminal className="w-3.5 h-3.5" /> Console {logs.length > 0 && <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></span>}
          </button>
          <button
            className={`py-2.5 px-4 text-xs font-medium border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === "tests"
                ? "border-indigo-500 text-indigo-400 bg-gray-950/40"
                : "border-transparent text-gray-500 hover:text-gray-300"
            }`}
            onClick={() => setActiveTab("tests")}
          >
            <ShieldAlert className="w-3.5 h-3.5" /> Tests {assertions.length > 0 && <span className="ml-1 text-[10px] px-1 bg-gray-800 rounded">{assertions.filter(a => a.passed).length}/{assertions.length}</span>}
          </button>
        </div>

        {activeTab === "body" && (
          <div className="flex bg-gray-950 border border-gray-800 rounded p-0.5 text-[10px] uppercase font-bold text-gray-500">
            <button
              className={`px-2 py-0.5 rounded-sm transition cursor-pointer ${bodyFormat === "pretty" ? "bg-gray-800 text-gray-200" : "hover:text-gray-300"}`}
              onClick={() => setBodyFormat("pretty")}
            >
              Pretty
            </button>
            <button
              className={`px-2 py-0.5 rounded-sm transition cursor-pointer ${bodyFormat === "raw" ? "bg-gray-800 text-gray-200" : "hover:text-gray-300"}`}
              onClick={() => setBodyFormat("raw")}
            >
              Raw
            </button>
            <button
              className={`px-2 py-0.5 rounded-sm transition cursor-pointer ${bodyFormat === "preview" ? "bg-gray-800 text-gray-200" : "hover:text-gray-300"}`}
              onClick={() => setBodyFormat("preview")}
            >
              Preview
            </button>
          </div>
        )}
      </div>

      {/* Main Tab Contents */}
      <div className="flex-1 overflow-hidden p-4 relative">
        {activeTab === "body" && (
          <div className="h-full flex flex-col overflow-hidden">
            {bodyFormat === "pretty" && (
              <pre className="flex-1 overflow-auto text-xs font-mono bg-gray-900 border border-gray-850 p-4 rounded text-gray-300 select-text leading-relaxed">
                <code>{getPrettyBody()}</code>
              </pre>
            )}

            {bodyFormat === "raw" && (
              <pre className="flex-1 overflow-auto text-xs font-mono bg-gray-900 border border-gray-850 p-4 rounded text-gray-300 select-text whitespace-pre-wrap break-all leading-relaxed">
                <code>{response.body}</code>
              </pre>
            )}

            {bodyFormat === "preview" && (
              <div className="flex-1 border border-gray-850 rounded bg-white overflow-hidden relative">
                {isHtml ? (
                  <iframe
                    srcDoc={response.body}
                    title="Response HTML Preview"
                    sandbox="allow-scripts"
                    className="w-full h-full border-none bg-white"
                  ></iframe>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-gray-400 bg-gray-900 text-xs">
                    HTML Preview is only available for HTML Content-Types.
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === "headers" && (
          <div className="h-full overflow-auto border border-gray-850 rounded bg-gray-900">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-gray-950 border-b border-gray-850 text-gray-400 font-semibold uppercase">
                <tr>
                  <th className="p-3 w-1/3">Header Key</th>
                  <th className="p-3 w-2/3">Value</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(response.headers).map(([key, val]) => (
                  <tr key={key} className="border-b border-gray-950 hover:bg-gray-950/20 select-text">
                    <td className="p-3 font-medium text-indigo-400 font-mono">{key}</td>
                    <td className="p-3 text-gray-300 font-mono break-all">{val}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === "logs" && (
          <div className="h-full overflow-auto font-mono text-xs p-4 bg-gray-900 border border-gray-850 rounded text-gray-300 space-y-1.5">
            {logs.length === 0 ? (
              <div className="text-gray-500 text-center py-8">
                Console is empty. Use `cs.log()` in scripts to log messages here.
              </div>
            ) : (
              logs.map((log, index) => (
                <div key={index} className="border-b border-gray-850/40 pb-1 last:border-0 leading-relaxed select-text">
                  <span className="text-indigo-400 font-bold mr-2">[{index + 1}]</span>
                  {log}
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === "tests" && (
          <div className="h-full overflow-auto p-4 bg-gray-900 border border-gray-850 rounded space-y-2.5">
            {assertions.length === 0 ? (
              <div className="text-gray-500 text-center py-8">
                No tests ran. Add `cs.assert()` in your post-request scripts to run validations.
              </div>
            ) : (
              assertions.map((a, index) => (
                <div
                  key={index}
                  className={`flex items-center gap-3 p-3 rounded border select-text ${
                    a.passed
                      ? "bg-emerald-950/15 border-emerald-900/35 text-emerald-300"
                      : "bg-red-950/15 border-red-900/35 text-red-300"
                  }`}
                >
                  {a.passed ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-400 shrink-0" />
                  )}
                  <div className="flex-1">
                    <span className="text-[10px] font-bold uppercase mr-2 tracking-wide font-sans">
                      {a.passed ? "Pass" : "Fail"}
                    </span>
                    <p className="text-xs font-mono inline-block">{a.message}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
