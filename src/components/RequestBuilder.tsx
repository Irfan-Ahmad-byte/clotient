import { useState, useEffect, useRef } from "react";
import { Send, Code, Trash2, ChevronDown, XCircle } from "lucide-react";
import { ClotientRequest, KeyValue, BodyType, Environment } from "../types";

interface RequestBuilderProps {
  request: ClotientRequest;
  onChange: (req: ClotientRequest) => void;
  onSend: () => void;
  onGenerateCode: () => void;
  loading: boolean;
  activeEnv: Environment | null;
  onCancel: () => void;
  onCreateEnvVar?: (key: string, value: string) => void;
}

type TabType = "params" | "headers" | "body" | "auth" | "scripts";

export default function RequestBuilder({
  request,
  onChange,
  onSend,
  onGenerateCode,
  loading,
  activeEnv,
  onCancel,
  onCreateEnvVar
}: RequestBuilderProps) {
  const [activeTab, setActiveTab] = useState<TabType>("params");
  const [bodyTab, setBodyTab] = useState<BodyType>(request.body.type);
  const [scriptSubTab, setScriptSubTab] = useState<"pre" | "post">("pre");

  // Autocomplete suggestions states
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionIndex, setSuggestionIndex] = useState(0);
  const [suggestTriggerPos, setSuggestTriggerPos] = useState<{ start: number; end: number } | null>(null);
  
  // Custom dropdown states & refs
  const [showMethodDropdown, setShowMethodDropdown] = useState(false);
  const [showAuthDropdown, setShowAuthDropdown] = useState(false);

  const methodDropdownRef = useRef<HTMLDivElement | null>(null);
  const authDropdownRef = useRef<HTMLDivElement | null>(null);
  const urlInputRef = useRef<HTMLInputElement | null>(null);

  // Close dropdowns on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (methodDropdownRef.current && !methodDropdownRef.current.contains(event.target as Node)) {
        setShowMethodDropdown(false);
      }
      if (authDropdownRef.current && !authDropdownRef.current.contains(event.target as Node)) {
        setShowAuthDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Keep body tab in sync with request changes
  useEffect(() => {
    setBodyTab(request.body.type);
  }, [request.body.type]);

  const updateRequest = (fields: Partial<ClotientRequest>) => {
    onChange({ ...request, ...fields });
  };

  const updateBody = (fields: Partial<ClotientRequest["body"]>) => {
    onChange({
      ...request,
      body: { ...request.body, ...fields }
    });
  };

  // Helper to ensure key-value tables have a trailing empty row for ease of adding
  const ensureTrailingEmptyRow = (list: KeyValue[]): KeyValue[] => {
    const listCopy = [...list];
    const last = listCopy[listCopy.length - 1];
    if (!last || last.key.trim() !== "" || last.value.trim() !== "") {
      listCopy.push({
        id: Math.random().toString(36).substring(2, 11),
        key: "",
        value: "",
        enabled: true,
        description: ""
      });
    }
    return listCopy;
  };

  // Generic key-value update handler
  const handleKeyValueChange = (
    list: KeyValue[],
    index: number,
    fields: Partial<KeyValue>,
    onSave: (newList: KeyValue[]) => void
  ) => {
    const newList = [...list];
    newList[index] = { ...newList[index], ...fields };

    // Auto-append trailing empty row if user typed in the last row
    if (index === list.length - 1 && (fields.key !== undefined || fields.value !== undefined)) {
      newList.push({
        id: Math.random().toString(36).substring(2, 11),
        key: "",
        value: "",
        enabled: true,
        description: ""
      });
    }
    onSave(newList);
  };

  const handleKeyValueDelete = (list: KeyValue[], index: number, onSave: (newList: KeyValue[]) => void) => {
    const newList = list.filter((_, idx) => idx !== index);
    onSave(newList);
  };

  // Sync parameters to/from URL string
  const syncParamsToUrl = (paramsList: KeyValue[]) => {
    const activeParams = paramsList.filter((p) => p.enabled && p.key.trim());
    if (activeParams.length === 0) {
      // Remove query string
      const urlBase = request.url.split("?")[0];
      updateRequest({ url: urlBase, params: paramsList });
      return;
    }

    const searchParams = new URLSearchParams();
    activeParams.forEach((p) => searchParams.append(p.key, p.value));
    const urlBase = request.url.split("?")[0];
    updateRequest({
      url: `${urlBase}?${searchParams.toString()}`,
      params: paramsList
    });
  };

  const handleUrlChange = (newUrl: string) => {
    // Attempt to parse query params from URL
    try {
      const qIdx = newUrl.indexOf("?");
      if (qIdx !== -1) {
        const queryStr = newUrl.substring(qIdx + 1);
        const searchParams = new URLSearchParams(queryStr);
        const newParams: KeyValue[] = [];
        
        searchParams.forEach((value, key) => {
          newParams.push({
            id: Math.random().toString(36).substring(2, 11),
            key,
            value,
            enabled: true,
            description: ""
          });
        });
        
        // Add trailing empty row
        newParams.push({
          id: Math.random().toString(36).substring(2, 11),
          key: "",
          value: "",
          enabled: true,
          description: ""
        });

        onChange({
          ...request,
          url: newUrl,
          params: newParams
        });
        return;
      }
    } catch {
      // fallback to basic write
    }

    onChange({ ...request, url: newUrl });
  };

  // Autocomplete core methods
  const availableVars = activeEnv?.variables.filter((v) => v.enabled && v.key) || [];

  const handleUrlInputChange = (val: string, cursorSel: number) => {
    handleUrlChange(val);

    const textBeforeCursor = val.substring(0, cursorSel);
    const lastOpenIdx = textBeforeCursor.lastIndexOf("{{");
    const lastCloseIdx = textBeforeCursor.lastIndexOf("}}");

    if (lastOpenIdx !== -1 && lastOpenIdx > lastCloseIdx) {
      const query = textBeforeCursor.substring(lastOpenIdx + 2);
      const matches = availableVars
        .map((v) => v.key)
        .filter((k) => k.toLowerCase().includes(query.toLowerCase()));

      // Add inline variable creation choice
      if (activeEnv && query.trim().length > 0) {
        if (!matches.some(m => m.toLowerCase() === query.toLowerCase())) {
          matches.push(`__create_var:${query.trim()}`);
        }
      }

      if (matches.length > 0) {
        setSuggestions(matches);
        setSuggestionIndex(0);
        setShowSuggestions(true);
        setSuggestTriggerPos({ start: lastOpenIdx, end: cursorSel });
        return;
      }
    }
    setShowSuggestions(false);
  };

  const handleUrlKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (showSuggestions) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSuggestionIndex((prev) => (prev + 1) % suggestions.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSuggestionIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length);
      } else if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        selectSuggestion(suggestionIndex);
      } else if (e.key === "Escape") {
        setShowSuggestions(false);
      }
    } else {
      if (e.key === "Enter" && !loading) {
        onSend();
      }
    }
  };

  const selectSuggestion = (index: number) => {
    if (!suggestTriggerPos || !urlInputRef.current) return;
    const selectedVar = suggestions[index];
    const val = request.url;

    let targetKey = selectedVar;
    if (selectedVar.startsWith("__create_var:")) {
      targetKey = selectedVar.substring("__create_var:".length);
      if (onCreateEnvVar) {
        onCreateEnvVar(targetKey, "");
      }
    }

    const before = val.substring(0, suggestTriggerPos.start);
    
    // Swallow any closing brackets that exist after the start index to prevent duplicates
    let after = val.substring(suggestTriggerPos.end);
    const nextCloseIdx = val.indexOf("}}", suggestTriggerPos.start);
    if (nextCloseIdx !== -1 && nextCloseIdx >= suggestTriggerPos.start) {
      after = val.substring(nextCloseIdx + 2);
    }

    const newVal = `${before}{{${targetKey}}}${after}`;

    handleUrlChange(newVal);
    setShowSuggestions(false);

    const input = urlInputRef.current;
    setTimeout(() => {
      input.focus();
      const newCursorPos = suggestTriggerPos.start + targetKey.length + 4; // "{{var}}"
      input.setSelectionRange(newCursorPos, newCursorPos);
    }, 10);
  };

  // Ensure initial empty rows
  const displayParams = ensureTrailingEmptyRow(request.params);
  const displayHeaders = ensureTrailingEmptyRow(request.headers);
  const displayUrlencoded = ensureTrailingEmptyRow(request.body.urlencoded || []);
  const displayFormData = ensureTrailingEmptyRow(request.body.formData || []);

  const methods = ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS", "HEAD"] as const;

  return (
    <div className="flex-1 flex flex-col bg-gray-900 border-b border-gray-800 overflow-hidden text-sm relative">
      {/* Top Address & Action Bar */}
      <div className="p-4 bg-gray-950 flex items-center gap-2 select-none shrink-0 border-b border-gray-850 z-20">
        
        {/* Method selector custom dropdown menu */}
        <div className="relative shrink-0" ref={methodDropdownRef}>
          <button
            onClick={() => setShowMethodDropdown(!showMethodDropdown)}
            className={`font-mono font-bold text-xs uppercase pl-3 pr-8 py-2 bg-gray-900 border border-gray-800 rounded outline-none flex items-center gap-1 cursor-pointer hover:bg-gray-850 transition relative ${
              request.method === "GET"
                ? "text-emerald-400"
                : request.method === "POST"
                ? "text-indigo-400"
                : request.method === "PUT"
                ? "text-amber-400"
                : request.method === "DELETE"
                ? "text-red-400"
                : "text-gray-300"
            }`}
          >
            {request.method}
            <ChevronDown className="w-3.5 h-3.5 text-gray-500 absolute right-2.5 top-1/2 -translate-y-1/2" />
          </button>
          
          {showMethodDropdown && (
            <div className="absolute top-full left-0 z-50 mt-1 bg-gray-950 border border-gray-850 rounded shadow-2xl py-1 w-28 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-100">
              {methods.map((m) => (
                <div
                  key={m}
                  className={`px-3 py-1.5 font-mono text-xs cursor-pointer transition select-none ${
                    request.method === m
                      ? "bg-indigo-950/40 text-indigo-400 font-bold"
                      : m === "GET"
                      ? "text-emerald-405 hover:bg-gray-900 hover:text-emerald-400"
                      : m === "POST"
                      ? "text-indigo-405 hover:bg-gray-900 hover:text-indigo-400"
                      : m === "PUT"
                      ? "text-amber-455 hover:bg-gray-900 hover:text-amber-400"
                      : m === "DELETE"
                      ? "text-red-455 hover:bg-gray-900 hover:text-red-400"
                      : "text-gray-400 hover:bg-gray-900 hover:text-gray-200"
                  }`}
                  onClick={() => {
                    updateRequest({ method: m });
                    setShowMethodDropdown(false);
                  }}
                >
                  {m}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex-1 relative">
          <input
            type="text"
            ref={urlInputRef}
            className="w-full font-mono text-xs px-3 py-2 bg-gray-900 border border-gray-800 rounded outline-none text-gray-200 focus:border-indigo-500 placeholder-gray-650"
            placeholder="https://api.example.com/endpoint"
            value={request.url}
            onChange={(e) => handleUrlInputChange(e.target.value, e.target.selectionStart || 0)}
            onKeyDown={handleUrlKeyDown}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          />

          {/* Autocomplete Dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-[#0e1322] border border-gray-800 rounded shadow-2xl max-h-48 overflow-y-auto animate-in fade-in duration-100">
              {suggestions.map((s, idx) => {
                const isCreateRow = s.startsWith("__create_var:");
                const displayKey = isCreateRow ? s.substring("__create_var:".length) : s;

                return (
                  <div
                    key={s}
                    className={`px-3 py-1.5 text-xs font-mono cursor-pointer transition select-none flex items-center justify-between ${
                      idx === suggestionIndex
                        ? "bg-indigo-950 text-indigo-300 font-bold"
                        : "text-gray-400 hover:bg-gray-900 hover:text-gray-200"
                    }`}
                    onMouseDown={(e) => {
                      e.preventDefault(); // prevent blur
                      selectSuggestion(idx);
                    }}
                  >
                    {isCreateRow ? (
                      <span className="text-emerald-400 font-semibold flex items-center gap-1">
                        + Create variable <code className="bg-emerald-950/40 px-1.5 py-0.5 rounded text-emerald-300 font-mono text-[10px]">{`{{${displayKey}}}`}</code>
                      </span>
                    ) : (
                      <>
                        <span>{`{{${displayKey}}}`}</span>
                        <span className="text-[10px] text-gray-550 font-sans truncate max-w-xs">
                          {activeEnv?.variables.find((v) => v.key === displayKey)?.value || ""}
                        </span>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {loading ? (
          <button
            className="px-5 py-2 bg-red-950/40 hover:bg-red-900/50 text-red-400 border border-red-900/30 rounded font-semibold text-xs flex items-center gap-1.5 cursor-pointer transition select-none"
            onClick={onCancel}
          >
            <XCircle className="w-3.5 h-3.5" />
            Cancel
          </button>
        ) : (
          <button
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded font-medium text-xs flex items-center gap-1.5 cursor-pointer transition select-none disabled:opacity-50"
            onClick={onSend}
            disabled={loading}
          >
            <Send className="w-3.5 h-3.5" />
            Send
          </button>
        )}

        <button
          className="p-2 bg-gray-850 hover:bg-gray-800 text-gray-400 hover:text-white rounded border border-gray-700 transition cursor-pointer"
          title="Generate Request Snippet"
          onClick={onGenerateCode}
        >
          <Code className="w-4 h-4" />
        </button>
      </div>

      {/* Tabs list */}
      <div className="flex border-b border-gray-800 bg-[#0e1322]/30 px-4 select-none shrink-0">
        <button
          className={`py-2 px-4 text-xs font-semibold border-b-2 transition cursor-pointer ${
            activeTab === "params" ? "border-indigo-500 text-indigo-400 bg-gray-900/10" : "border-transparent text-gray-550 hover:text-gray-350"
          }`}
          onClick={() => setActiveTab("params")}
        >
          Params
        </button>
        <button
          className={`py-2 px-4 text-xs font-semibold border-b-2 transition cursor-pointer ${
            activeTab === "headers" ? "border-indigo-500 text-indigo-400 bg-gray-900/10" : "border-transparent text-gray-550 hover:text-gray-350"
          }`}
          onClick={() => setActiveTab("headers")}
        >
          Headers
        </button>
        <button
          className={`py-2 px-4 text-xs font-semibold border-b-2 transition cursor-pointer ${
            activeTab === "body" ? "border-indigo-500 text-indigo-400 bg-gray-900/10" : "border-transparent text-gray-550 hover:text-gray-350"
          }`}
          onClick={() => setActiveTab("body")}
        >
          Body
        </button>
        <button
          className={`py-2 px-4 text-xs font-semibold border-b-2 transition cursor-pointer ${
            activeTab === "auth" ? "border-indigo-500 text-indigo-400 bg-gray-900/10" : "border-transparent text-gray-550 hover:text-gray-350"
          }`}
          onClick={() => setActiveTab("auth")}
        >
          Auth
        </button>
        <button
          className={`py-2 px-4 text-xs font-semibold border-b-2 transition cursor-pointer ${
            activeTab === "scripts" ? "border-indigo-500 text-indigo-400 bg-gray-900/10" : "border-transparent text-gray-550 hover:text-gray-350"
          }`}
          onClick={() => setActiveTab("scripts")}
        >
          Scripts
        </button>
      </div>

      {/* Tab Panel Body */}
      <div className="flex-1 overflow-y-auto p-4 bg-gray-905/50">
        {/* PARAMS TAB */}
        {activeTab === "params" && (
          <div className="border border-gray-800 rounded bg-[#0e1322]/80 overflow-hidden">
            <table className="w-full text-xs border-collapse">
              <thead className="bg-gray-900 border-b border-gray-800 text-gray-400 uppercase font-semibold select-none">
                <tr>
                  <th className="p-2 w-8 text-center">Active</th>
                  <th className="p-2 w-1/3">Key</th>
                  <th className="p-2 w-1/3">Value</th>
                  <th className="p-2 w-1/3">Description</th>
                  <th className="p-2 w-10 text-center">Del</th>
                </tr>
              </thead>
              <tbody>
                {displayParams.map((p, idx) => (
                  <tr key={p.id} className="border-b border-gray-900 hover:bg-gray-900/30">
                    <td className="p-2 text-center">
                      <input
                        type="checkbox"
                        checked={p.enabled}
                        onChange={(e) =>
                          handleKeyValueChange(displayParams, idx, { enabled: e.target.checked }, syncParamsToUrl)
                        }
                        className="accent-indigo-500 cursor-pointer"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="text"
                        placeholder="Key"
                        value={p.key}
                        onChange={(e) =>
                          handleKeyValueChange(displayParams, idx, { key: e.target.value }, syncParamsToUrl)
                        }
                        className="w-full bg-transparent outline-none text-gray-300 font-mono text-xs"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="text"
                        placeholder="Value"
                        value={p.value}
                        onChange={(e) =>
                          handleKeyValueChange(displayParams, idx, { value: e.target.value }, syncParamsToUrl)
                        }
                        className="w-full bg-transparent outline-none text-gray-300 font-mono text-xs"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="text"
                        placeholder="Description"
                        value={p.description || ""}
                        onChange={(e) =>
                          handleKeyValueChange(displayParams, idx, { description: e.target.value }, syncParamsToUrl)
                        }
                        className="w-full bg-transparent outline-none text-gray-300 text-xs"
                      />
                    </td>
                    <td className="p-2 text-center">
                      {idx < displayParams.length - 1 && (
                        <button
                          onClick={() => handleKeyValueDelete(request.params, idx, syncParamsToUrl)}
                          className="text-gray-500 hover:text-red-400 transition cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* HEADERS TAB */}
        {activeTab === "headers" && (
          <div className="border border-gray-800 rounded bg-[#0e1322]/80 overflow-hidden">
            <table className="w-full text-xs border-collapse">
              <thead className="bg-gray-900 border-b border-gray-800 text-gray-400 uppercase font-semibold select-none">
                <tr>
                  <th className="p-2 w-8 text-center">Active</th>
                  <th className="p-2 w-1/3">Key</th>
                  <th className="p-2 w-1/3">Value</th>
                  <th className="p-2 w-1/3">Description</th>
                  <th className="p-2 w-10 text-center">Del</th>
                </tr>
              </thead>
              <tbody>
                {displayHeaders.map((h, idx) => (
                  <tr key={h.id} className="border-b border-gray-900 hover:bg-gray-900/30">
                    <td className="p-2 text-center">
                      <input
                        type="checkbox"
                        checked={h.enabled}
                        onChange={(e) =>
                          handleKeyValueChange(displayHeaders, idx, { enabled: e.target.checked }, (list) =>
                            updateRequest({ headers: list })
                          )
                        }
                        className="accent-indigo-500 cursor-pointer"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="text"
                        placeholder="Key"
                        value={h.key}
                        onChange={(e) =>
                          handleKeyValueChange(displayHeaders, idx, { key: e.target.value }, (list) =>
                            updateRequest({ headers: list })
                          )
                        }
                        className="w-full bg-transparent outline-none text-gray-300 font-mono text-xs"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="text"
                        placeholder="Value"
                        value={h.value}
                        onChange={(e) =>
                          handleKeyValueChange(displayHeaders, idx, { value: e.target.value }, (list) =>
                            updateRequest({ headers: list })
                          )
                        }
                        className="w-full bg-transparent outline-none text-gray-300 font-mono text-xs"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="text"
                        placeholder="Description"
                        value={h.description || ""}
                        onChange={(e) =>
                          handleKeyValueChange(displayHeaders, idx, { description: e.target.value }, (list) =>
                            updateRequest({ headers: list })
                          )
                        }
                        className="w-full bg-transparent outline-none text-gray-300 text-xs"
                      />
                    </td>
                    <td className="p-2 text-center">
                      {idx < displayHeaders.length - 1 && (
                        <button
                          onClick={() =>
                            handleKeyValueDelete(request.headers, idx, (list) => updateRequest({ headers: list }))
                          }
                          className="text-gray-500 hover:text-red-400 transition cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* BODY TAB */}
        {activeTab === "body" && (
          <div className="flex flex-col h-full overflow-hidden">
            {/* Body Mode Selector */}
            <div className="flex gap-4 mb-3 text-xs select-none border-b border-gray-800 pb-2">
              {(["none", "json", "urlencoded", "form-data"] as const).map((mode) => (
                <label key={mode} className="flex items-center gap-1.5 text-gray-400 hover:text-gray-200 cursor-pointer">
                  <input
                    type="radio"
                    name="body-mode"
                    checked={bodyTab === mode}
                    onChange={() => {
                      setBodyTab(mode);
                      updateBody({ type: mode });
                    }}
                    className="accent-indigo-500"
                  />
                  <span className="capitalize">{mode === "urlencoded" ? "x-www-form-urlencoded" : mode}</span>
                </label>
              ))}
            </div>

            {/* Body Content Fields */}
            {bodyTab === "none" && (
              <div className="text-center py-8 text-xs text-gray-650">
                This request does not send a body payload.
              </div>
            )}

            {bodyTab === "json" && (
              <textarea
                className="w-full h-44 bg-[#0e1322] border border-gray-800 rounded p-3 text-xs font-mono text-gray-350 outline-none focus:border-indigo-500 leading-relaxed resize-y select-text"
                placeholder='{\n  "key": "value"\n}'
                value={request.body.rawText || ""}
                onChange={(e) => updateBody({ rawText: e.target.value })}
              />
            )}

            {bodyTab === "urlencoded" && (
              <div className="border border-gray-800 rounded bg-[#0e1322]/80 overflow-hidden">
                <table className="w-full text-xs border-collapse">
                  <thead className="bg-gray-900 border-b border-gray-800 text-gray-400 uppercase font-semibold select-none">
                    <tr>
                      <th className="p-2 w-8 text-center">Active</th>
                      <th className="p-2 w-1/2">Key</th>
                      <th className="p-2 w-1/2">Value</th>
                      <th className="p-2 w-10 text-center">Del</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayUrlencoded.map((x, idx) => (
                      <tr key={x.id} className="border-b border-gray-900 hover:bg-gray-900/30">
                        <td className="p-2 text-center">
                          <input
                            type="checkbox"
                            checked={x.enabled}
                            onChange={(e) =>
                              handleKeyValueChange(displayUrlencoded, idx, { enabled: e.target.checked }, (list) =>
                                updateBody({ urlencoded: list })
                              )
                            }
                            className="accent-indigo-500 cursor-pointer"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="text"
                            placeholder="Key"
                            value={x.key}
                            onChange={(e) =>
                              handleKeyValueChange(displayUrlencoded, idx, { key: e.target.value }, (list) =>
                                updateBody({ urlencoded: list })
                              )
                            }
                            className="w-full bg-transparent outline-none text-gray-300 font-mono text-xs"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="text"
                            placeholder="Value"
                            value={x.value}
                            onChange={(e) =>
                              handleKeyValueChange(displayUrlencoded, idx, { value: e.target.value }, (list) =>
                                updateBody({ urlencoded: list })
                              )
                            }
                            className="w-full bg-transparent outline-none text-gray-300 font-mono text-xs"
                          />
                        </td>
                        <td className="p-2 text-center">
                          {idx < displayUrlencoded.length - 1 && (
                            <button
                              onClick={() =>
                                handleKeyValueDelete(request.body.urlencoded || [], idx, (list) =>
                                  updateBody({ urlencoded: list })
                                )
                              }
                              className="text-gray-505 hover:text-red-400 transition cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {bodyTab === "form-data" && (
              <div className="border border-gray-800 rounded bg-[#0e1322]/80 overflow-hidden">
                <table className="w-full text-xs border-collapse">
                  <thead className="bg-gray-900 border-b border-gray-800 text-gray-400 uppercase font-semibold select-none">
                    <tr>
                      <th className="p-2 w-8 text-center">Active</th>
                      <th className="p-2 w-1/2">Key</th>
                      <th className="p-2 w-1/2">Value</th>
                      <th className="p-2 w-10 text-center">Del</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayFormData.map((x, idx) => (
                      <tr key={x.id} className="border-b border-gray-900 hover:bg-gray-900/30">
                        <td className="p-2 text-center">
                          <input
                            type="checkbox"
                            checked={x.enabled}
                            onChange={(e) =>
                              handleKeyValueChange(displayFormData, idx, { enabled: e.target.checked }, (list) =>
                                updateBody({ formData: list })
                              )
                            }
                            className="accent-indigo-500 cursor-pointer"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="text"
                            placeholder="Key"
                            value={x.key}
                            onChange={(e) =>
                              handleKeyValueChange(displayFormData, idx, { key: e.target.value }, (list) =>
                                updateBody({ formData: list })
                              )
                            }
                            className="w-full bg-transparent outline-none text-gray-300 font-mono text-xs"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="text"
                            placeholder="Value"
                            value={x.value}
                            onChange={(e) =>
                              handleKeyValueChange(displayFormData, idx, { value: e.target.value }, (list) =>
                                updateBody({ formData: list })
                              )
                            }
                            className="w-full bg-transparent outline-none text-gray-300 font-mono text-xs"
                          />
                        </td>
                        <td className="p-2 text-center">
                          {idx < displayFormData.length - 1 && (
                            <button
                              onClick={() =>
                                handleKeyValueDelete(request.body.formData || [], idx, (list) =>
                                  updateBody({ formData: list })
                                )
                              }
                              className="text-gray-505 hover:text-red-400 transition cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* AUTH TAB */}
        {activeTab === "auth" && (
          <div className="space-y-4 max-w-lg">
            {/* Custom dropdown menu select wrapper for Auth selector */}
            <div className="flex flex-col gap-1.5 select-none relative w-full" ref={authDropdownRef}>
              <label className="text-xs text-gray-400 font-medium">Auth Type</label>
              <div className="relative">
                <button
                  onClick={() => setShowAuthDropdown(!showAuthDropdown)}
                  className="bg-gray-950 border border-gray-800 text-gray-300 rounded pl-3 pr-8 py-1.5 w-full text-xs outline-none text-left flex items-center justify-between hover:bg-gray-900 transition cursor-pointer"
                >
                  <span>
                    {request.auth.type === "none"
                      ? "No Auth"
                      : request.auth.type === "bearer"
                      ? "Bearer Token"
                      : "Basic Auth"}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-gray-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </button>
                
                {showAuthDropdown && (
                  <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-[#0e1322] border border-gray-850 rounded shadow-2xl py-1 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-100">
                    {(["none", "bearer", "basic"] as const).map((type) => (
                      <div
                        key={type}
                        className={`px-3 py-1.5 text-xs cursor-pointer transition select-none ${
                          request.auth.type === type
                            ? "bg-indigo-955/50 text-indigo-400 font-bold"
                            : "text-gray-400 hover:bg-gray-900 hover:text-gray-205"
                        }`}
                        onClick={() => {
                          updateRequest({
                            auth: { ...request.auth, type }
                          });
                          setShowAuthDropdown(false);
                        }}
                      >
                        {type === "none" ? "No Auth" : type === "bearer" ? "Bearer Token" : "Basic Auth"}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {request.auth.type === "bearer" && (
              <div className="flex flex-col gap-1.5 select-text">
                <label className="text-xs text-gray-400 font-medium">Token</label>
                <input
                  type="text"
                  placeholder="Bearer Token value"
                  className="bg-[#0e1322] border border-gray-800 text-gray-300 rounded px-3 py-1.5 text-xs outline-none focus:border-indigo-550 font-mono"
                  value={request.auth.bearerToken || ""}
                  onChange={(e) =>
                    updateRequest({
                      auth: { ...request.auth, bearerToken: e.target.value }
                    })
                  }
                />
              </div>
            )}

            {request.auth.type === "basic" && (
              <div className="grid grid-cols-2 gap-3 select-text">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-gray-400 font-medium">Username</label>
                  <input
                    type="text"
                    placeholder="Username"
                    className="bg-[#0e1322] border border-gray-800 text-gray-300 rounded px-3 py-1.5 text-xs outline-none focus:border-indigo-555 font-mono"
                    value={request.auth.basicUsername || ""}
                    onChange={(e) =>
                      updateRequest({
                        auth: { ...request.auth, basicUsername: e.target.value }
                      })
                    }
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-gray-400 font-medium">Password</label>
                  <input
                    type="password"
                    placeholder="Password"
                    className="bg-[#0e1322] border border-gray-800 text-gray-300 rounded px-3 py-1.5 text-xs outline-none focus:border-indigo-555 font-mono"
                    value={request.auth.basicPassword || ""}
                    onChange={(e) =>
                      updateRequest({
                        auth: { ...request.auth, basicPassword: e.target.value }
                      })
                    }
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* SCRIPTS TAB */}
        {activeTab === "scripts" && (
          <div className="flex flex-col h-full overflow-hidden select-none">
            {/* Sub Tabs */}
            <div className="flex border-b border-gray-800 mb-3 bg-[#0e1322]/20 rounded-t">
              <button
                className={`py-1.5 px-3 text-xs font-semibold border-b-2 transition cursor-pointer ${
                  scriptSubTab === "pre" ? "border-cyan-400 text-cyan-400" : "border-transparent text-gray-550 hover:text-gray-350"
                }`}
                onClick={() => setScriptSubTab("pre")}
              >
                Pre-request Script (cs.env.*)
              </button>
              <button
                className={`py-1.5 px-3 text-xs font-semibold border-b-2 transition cursor-pointer ${
                  scriptSubTab === "post" ? "border-cyan-400 text-cyan-400" : "border-transparent text-gray-555 hover:text-gray-350"
                }`}
                onClick={() => setScriptSubTab("post")}
              >
                Post-request Script (cs.response.*)
              </button>
            </div>

            {/* Script Textareas */}
            {scriptSubTab === "pre" ? (
              <div className="flex flex-col gap-2">
                <textarea
                  className="w-full h-40 bg-[#0e1322] border border-gray-800 rounded p-3 text-xs font-mono text-gray-350 outline-none focus:border-indigo-500 leading-relaxed resize-y select-text"
                  placeholder='// Run before request goes out. Modify variables or add headers:\ncs.env.set("api_key", "secret123");\ncs.request.headers.add("X-Custom", "added-by-script");\ncs.log("Pre-request script fired!");'
                  value={request.scripts.preRequest}
                  onChange={(e) =>
                    updateRequest({
                      scripts: { ...request.scripts, preRequest: e.target.value }
                    })
                  }
                />
                <span className="text-[10px] text-gray-555 leading-relaxed">
                  Namespace <strong>cs</strong> is exposed. Available methods: <code>cs.env.get(k)</code>, <code>cs.env.set(k, v)</code>, <code>cs.request.headers.add(k, v)</code>, <code>cs.request.headers.remove(k)</code>.
                </span>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <textarea
                  className="w-full h-40 bg-[#0e1322] border border-gray-800 rounded p-3 text-xs font-mono text-gray-350 outline-none focus:border-indigo-500 leading-relaxed resize-y select-text"
                  placeholder='// Run after response arrives. Inspect data and run tests:\ncs.log("Status received: " + cs.response.status);\n\ncs.assert(cs.response.status === 200, "Should return 200 status code");\nconst json = cs.response.json();\ncs.assert(json.url === "https://httpbin.org/get", "Verify URL matches");'
                  value={request.scripts.postRequest}
                  onChange={(e) =>
                    updateRequest({
                      scripts: { ...request.scripts, postRequest: e.target.value }
                    })
                  }
                />
                <span className="text-[10px] text-gray-555 leading-relaxed">
                  Namespace <strong>cs</strong> is exposed. Available methods: <code>cs.response.status</code>, <code>cs.response.json()</code>, <code>cs.response.text()</code>, <code>cs.assert(condition, desc)</code>, <code>cs.log(...)</code>.
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
