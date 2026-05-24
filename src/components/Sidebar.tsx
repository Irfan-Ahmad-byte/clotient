import { useState, useEffect, useRef } from "react";
import { 
  Folder, 
  Plus, 
  Trash2, 
  Import, 
  Download, 
  Settings, 
  Globe, 
  Search,
  ChevronDown,
  ChevronRight,
  Eye
} from "lucide-react";
import { ClotientCollection, ClotientRequest, Environment, HistoryItem } from "../types";
import { importPostmanCollection, exportToPostmanCollection } from "../utils/postmanParser";

interface SidebarProps {
  collections: ClotientCollection[];
  environments: Environment[];
  history: HistoryItem[];
  activeRequest: ClotientRequest | null;
  activeEnv: Environment | null;
  onSelectRequest: (req: ClotientRequest) => void;
  onSelectEnv: (env: Environment | null) => void;
  onCreateCollection: (name: string) => void;
  onCreateFolder: (collectionId: string, name: string) => void;
  onCreateRequest: (collectionId: string, folderId: string | null, name: string) => void;
  onDeleteRequest: (collectionId: string, folderId: string | null, reqId: string) => void;
  onDeleteCollection: (collectionId: string) => void;
  onImportCollection: (collection: ClotientCollection) => void;
  onUpdateEnvironments: (envs: Environment[]) => void;
  onClearHistory: () => void;
}

export default function Sidebar({
  collections,
  environments,
  history,
  activeRequest,
  activeEnv,
  onSelectRequest,
  onSelectEnv,
  onCreateCollection,
  onCreateFolder,
  onCreateRequest,
  onDeleteRequest,
  onDeleteCollection,
  onImportCollection,
  onUpdateEnvironments,
  onClearHistory
}: SidebarProps) {
  const [activeTab, setActiveTab] = useState<"collections" | "history">("collections");
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
  const [showEnvModal, setShowEnvModal] = useState(false);
  const [showQuickLook, setShowQuickLook] = useState(false);

  // Custom environment dropdown states
  const [showEnvDropdown, setShowEnvDropdown] = useState(false);
  const envDropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (envDropdownRef.current && !envDropdownRef.current.contains(event.target as Node)) {
        setShowEnvDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // For inline creates
  const [showNewCollection, setShowNewCollection] = useState(false);
  const [newCollName, setNewCollName] = useState("");

  // Custom Modal dialog states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogConfig, setDialogConfig] = useState<{
    type: "prompt" | "confirm";
    title: string;
    message?: string;
    placeholder?: string;
    defaultValue?: string;
    onConfirm: (val?: string) => void;
  } | null>(null);

  const showCustomPrompt = (title: string, placeholder: string, defaultValue: string, onConfirm: (val: string) => void) => {
    setDialogConfig({
      type: "prompt",
      title,
      placeholder,
      defaultValue,
      onConfirm: (val) => {
        if (val !== undefined && val.trim()) {
          onConfirm(val.trim());
        }
        setDialogOpen(false);
      }
    });
    setDialogOpen(true);
  };

  const showCustomConfirm = (title: string, message: string, onConfirm: () => void) => {
    setDialogConfig({
      type: "confirm",
      title,
      message,
      onConfirm: () => {
        onConfirm();
        setDialogOpen(false);
      }
    });
    setDialogOpen(true);
  };

  const toggleFolder = (id: string) => {
    setExpandedFolders((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleImportClick = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const col = importPostmanCollection(text);
        onImportCollection(col);
      } catch (err: any) {
        showCustomConfirm("Import Error", "Failed to parse Postman collection: " + err.message, () => {});
      }
    };
    input.click();
  };

  const handleExport = (collection: ClotientCollection) => {
    try {
      const pmJson = exportToPostmanCollection(collection);
      const blob = new Blob([JSON.stringify(pmJson, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${collection.name}.postman_collection.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      showCustomConfirm("Export Error", "Failed to export: " + err.message, () => {});
    }
  };

  return (
    <div className="w-80 border-r border-gray-800 bg-gray-900 flex flex-col h-full text-sm select-none relative">
      {/* Brand Header */}
      <div className="p-4 border-b border-gray-850 bg-gray-950/20 flex items-center gap-2.5 select-none shrink-0">
        <img src="/logo.png" className="w-6 h-6 rounded" alt="Clotient Logo" />
        <span className="font-bold text-xs text-gray-100 tracking-wider">CLOTIENT</span>
        <span className="text-[9px] text-cyan-400 font-bold bg-cyan-950/40 border border-cyan-800/30 px-1.5 py-0.5 rounded ml-auto">STUDIO</span>
      </div>

      {/* Upper Area: Environment Selection */}
      <div className="p-4 border-b border-gray-800 flex items-center justify-between gap-2 relative">
        <div className="flex items-center gap-2 text-gray-400 w-full">
          <Globe className="w-4 h-4 text-cyan-400 shrink-0" />
          <div className="relative flex-1" ref={envDropdownRef}>
            <button
              onClick={() => setShowEnvDropdown(!showEnvDropdown)}
              className="bg-gray-800 text-gray-200 border border-gray-700 rounded pl-2.5 pr-8 py-1.5 w-full text-xs outline-none text-left flex items-center justify-between hover:bg-gray-750 transition cursor-pointer relative"
            >
              <span className="truncate">{activeEnv?.name || "No Environment"}</span>
              <ChevronDown className="w-3.5 h-3.5 text-gray-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </button>
            
            {showEnvDropdown && (
              <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-[#0e1322] border border-gray-800 rounded shadow-2xl py-1 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-100">
                <div
                  className={`px-3 py-1.5 text-xs cursor-pointer transition select-none ${
                    !activeEnv
                      ? "bg-indigo-950/40 text-indigo-400 font-bold"
                      : "text-gray-400 hover:bg-gray-900 hover:text-gray-200"
                  }`}
                  onClick={() => {
                    onSelectEnv(null);
                    setShowEnvDropdown(false);
                  }}
                >
                  No Environment
                </div>
                {environments.map((env) => (
                  <div
                    key={env.id}
                    className={`px-3 py-1.5 text-xs cursor-pointer transition select-none truncate ${
                      activeEnv?.id === env.id
                        ? "bg-indigo-950/40 text-indigo-400 font-bold"
                        : "text-gray-400 hover:bg-gray-900 hover:text-gray-200"
                    }`}
                    onClick={() => {
                      onSelectEnv(env);
                      setShowEnvDropdown(false);
                    }}
                  >
                    {env.name}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {activeEnv && (
          <button
            className={`p-1.5 rounded border transition cursor-pointer ${
              showQuickLook
                ? "bg-indigo-950 text-indigo-400 border-indigo-550/40"
                : "bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white border-gray-700"
            }`}
            title="Environment Quick Look"
            onClick={() => setShowQuickLook(!showQuickLook)}
          >
            <Eye className="w-4 h-4" />
          </button>
        )}

        <button
          className="p-1.5 bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white rounded border border-gray-700 transition cursor-pointer"
          title="Manage Environments"
          onClick={() => setShowEnvModal(true)}
        >
          <Settings className="w-4 h-4" />
        </button>

        {/* Quick Look Popover */}
        {showQuickLook && activeEnv && (
          <div className="absolute top-full left-4 right-4 z-40 mt-1 bg-gray-950 border border-gray-800 rounded-lg shadow-2xl p-3 flex flex-col gap-2 max-h-64 overflow-y-auto animate-in fade-in duration-150">
            <div className="flex items-center justify-between border-b border-gray-850 pb-1.5">
              <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Active Variables</span>
              <button
                className="text-[10px] text-indigo-400 hover:text-indigo-350 font-bold cursor-pointer"
                onClick={() => {
                  const newVar = {
                    id: Math.random().toString(36).substring(2, 11),
                    key: "new_variable",
                    value: "value",
                    enabled: true
                  };
                  const updatedVars = [...activeEnv.variables, newVar];
                  const updatedEnvs = environments.map((e) => (e.id === activeEnv.id ? { ...e, variables: updatedVars } : e));
                  onUpdateEnvironments(updatedEnvs);
                  onSelectEnv({ ...activeEnv, variables: updatedVars });
                }}
              >
                + Add Key
              </button>
            </div>
            <div className="space-y-1.5">
              {activeEnv.variables.map((v) => (
                <div key={v.id} className="flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={v.enabled}
                    onChange={(e) => {
                      const updatedVars = activeEnv.variables.map((x) => (x.id === v.id ? { ...x, enabled: e.target.checked } : x));
                      const updatedEnvs = environments.map((e) => (e.id === activeEnv.id ? { ...e, variables: updatedVars } : e));
                      onUpdateEnvironments(updatedEnvs);
                      onSelectEnv({ ...activeEnv, variables: updatedVars });
                    }}
                    className="accent-indigo-500 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={v.key}
                    placeholder="Key"
                    onChange={(e) => {
                      const updatedVars = activeEnv.variables.map((x) => (x.id === v.id ? { ...x, key: e.target.value } : x));
                      const updatedEnvs = environments.map((e) => (e.id === activeEnv.id ? { ...e, variables: updatedVars } : e));
                      onUpdateEnvironments(updatedEnvs);
                      onSelectEnv({ ...activeEnv, variables: updatedVars });
                    }}
                    className="bg-transparent border-b border-transparent focus:border-gray-800 text-gray-250 text-xs w-1/2 outline-none font-mono py-0.5"
                  />
                  <input
                    type="text"
                    value={v.value}
                    placeholder="Value"
                    onChange={(e) => {
                      const updatedVars = activeEnv.variables.map((x) => (x.id === v.id ? { ...x, value: e.target.value } : x));
                      const updatedEnvs = environments.map((e) => (e.id === activeEnv.id ? { ...e, variables: updatedVars } : e));
                      onUpdateEnvironments(updatedEnvs);
                      onSelectEnv({ ...activeEnv, variables: updatedVars });
                    }}
                    className="bg-transparent border-b border-transparent focus:border-gray-800 text-gray-400 text-xs w-1/2 outline-none font-mono py-0.5"
                  />
                  <button
                    className="text-gray-600 hover:text-red-400 transition cursor-pointer"
                    onClick={() => {
                      const updatedVars = activeEnv.variables.filter((x) => x.id !== v.id);
                      const updatedEnvs = environments.map((e) => (e.id === activeEnv.id ? { ...e, variables: updatedVars } : e));
                      onUpdateEnvironments(updatedEnvs);
                      onSelectEnv({ ...activeEnv, variables: updatedVars });
                    }}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              {activeEnv.variables.length === 0 && (
                <div className="text-[10px] text-gray-600 text-center py-2">
                  No active variables.
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Navigation tabs */}
      <div className="flex border-b border-gray-800 bg-gray-950">
        <button
          className={`flex-1 py-2.5 text-center font-medium border-b-2 transition cursor-pointer ${
            activeTab === "collections"
              ? "border-indigo-500 text-indigo-400 bg-gray-900"
              : "border-transparent text-gray-400 hover:text-gray-200 hover:bg-gray-900/50"
          }`}
          onClick={() => setActiveTab("collections")}
        >
          Collections
        </button>
        <button
          className={`flex-1 py-2.5 text-center font-medium border-b-2 transition cursor-pointer ${
            activeTab === "history"
              ? "border-indigo-500 text-indigo-400 bg-gray-900"
              : "border-transparent text-gray-400 hover:text-gray-200 hover:bg-gray-900/50"
          }`}
          onClick={() => {
            setActiveTab("history");
            setShowQuickLook(false);
          }}
        >
          History
        </button>
      </div>

      {/* Action Header / Search */}
      <div className="p-3 border-b border-gray-850 bg-gray-950/20 flex flex-col gap-2">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-gray-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            className="w-full bg-gray-800 text-gray-200 pl-8 pr-3 py-1 text-xs rounded border border-gray-700 outline-none focus:border-indigo-550"
            placeholder={activeTab === "collections" ? "Search collections..." : "Search history..."}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {activeTab === "collections" && (
          <div className="flex items-center justify-between gap-1 select-none">
            <button
              onClick={() => setShowNewCollection(true)}
              className="flex-1 py-1 px-2 text-[10px] font-bold bg-indigo-950/40 hover:bg-indigo-950 border border-indigo-900/40 text-indigo-300 rounded flex items-center justify-center gap-1 transition cursor-pointer"
            >
              <Plus className="w-3 h-3" /> New Coll
            </button>
            <button
              onClick={handleImportClick}
              className="flex-1 py-1 px-2 text-[10px] font-bold bg-gray-850 hover:bg-gray-800 border border-gray-700 text-gray-300 rounded flex items-center justify-center gap-1 transition cursor-pointer"
            >
              <Import className="w-3 h-3" /> Import PM
            </button>
          </div>
        )}
      </div>

      {/* New Collection Input */}
      {showNewCollection && (
        <div className="p-3 bg-[#0e1322] border-b border-gray-850 flex items-center gap-1.5 animate-in slide-in-from-top-1 duration-150">
          <input
            type="text"
            className="flex-1 bg-gray-950 border border-gray-800 rounded px-2.5 py-1 text-xs outline-none text-gray-250 font-medium"
            placeholder="New collection..."
            value={newCollName}
            autoFocus
            onChange={(e) => setNewCollName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && newCollName.trim()) {
                onCreateCollection(newCollName.trim());
                setNewCollName("");
                setShowNewCollection(false);
              } else if (e.key === "Escape") {
                setShowNewCollection(false);
                setNewCollName("");
              }
            }}
          />
          <button
            onClick={() => {
              if (newCollName.trim()) {
                onCreateCollection(newCollName.trim());
                setNewCollName("");
                setShowNewCollection(false);
              }
            }}
            className="text-indigo-400 font-bold hover:text-indigo-300 text-xs"
          >
            ✓
          </button>
          <button
            onClick={() => {
              setShowNewCollection(false);
              setNewCollName("");
            }}
            className="text-gray-500 hover:text-gray-300 text-xs"
          >
            ✕
          </button>
        </div>
      )}

      {/* List Container */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {activeTab === "collections" ? (
          collections.length === 0 ? (
            <div className="text-center py-8 text-xs text-gray-500 leading-relaxed">
              No collections added.<br />Create one or import a Postman file.
            </div>
          ) : (
            collections
              .filter((c) => c.name.toLowerCase().includes(searchTerm.toLowerCase()))
              .map((c) => (
                <div key={c.id} className="rounded overflow-hidden">
                  {/* Collection Header */}
                  <div className="group flex items-center justify-between p-2 hover:bg-gray-855 rounded transition cursor-pointer">
                    <div 
                      className="flex items-center gap-2 text-gray-200 font-semibold truncate flex-1"
                      onClick={() => toggleFolder(c.id)}
                    >
                      {expandedFolders[c.id] ? <ChevronDown className="w-3.5 h-3.5 text-gray-400" /> : <ChevronRight className="w-3.5 h-3.5 text-gray-400" />}
                      <span className="truncate">{c.name}</span>
                    </div>

                    <div className="hidden group-hover:flex items-center gap-1.5">
                      <button
                        className="p-1 hover:text-indigo-400 text-gray-500 transition cursor-pointer"
                        title="Create request"
                        onClick={(e) => {
                          e.stopPropagation();
                          showCustomPrompt("Create Request", "Request name...", "", (name) => {
                            onCreateRequest(c.id, null, name);
                          });
                        }}
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                      <button
                        className="p-1 hover:text-amber-400 text-gray-500 transition cursor-pointer"
                        title="Create folder"
                        onClick={(e) => {
                          e.stopPropagation();
                          showCustomPrompt("Create Folder", "Folder name...", "", (name) => {
                            onCreateFolder(c.id, name);
                          });
                        }}
                      >
                        <Folder className="w-3.5 h-3.5" />
                      </button>
                      <button
                        className="p-1 hover:text-cyan-400 text-gray-500 transition cursor-pointer"
                        title="Export Postman collection"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleExport(c);
                        }}
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                      <button
                        className="p-1 hover:text-red-400 text-gray-500 transition cursor-pointer"
                        title="Delete collection"
                        onClick={(e) => {
                          e.stopPropagation();
                          showCustomConfirm(
                            "Delete Collection", 
                            `Are you sure you want to delete collection "${c.name}"? This action cannot be undone.`, 
                            () => onDeleteCollection(c.id)
                          );
                        }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Collection Content */}
                  {expandedFolders[c.id] && (
                    <div className="pl-4 space-y-0.5 border-l border-gray-800 ml-3.5 py-1 animate-in fade-in duration-100">
                      {/* Top level requests */}
                      {c.requests.map((r) => (
                        <div
                          key={r.id}
                          className={`group flex items-center justify-between px-2 py-1.5 rounded transition cursor-pointer ${
                            activeRequest?.id === r.id
                              ? "bg-indigo-950/40 text-indigo-300 border-r-2 border-indigo-500"
                              : "text-gray-400 hover:bg-gray-850 hover:text-gray-200"
                          }`}
                          onClick={() => onSelectRequest(r)}
                        >
                          <div className="flex items-center gap-2 truncate flex-1">
                            <span
                              className={`text-[9px] font-bold w-9 text-right shrink-0 ${
                                r.method === "GET"
                                  ? "text-emerald-400"
                                  : r.method === "POST"
                                  ? "text-indigo-400"
                                  : r.method === "PUT"
                                  ? "text-amber-400"
                                  : r.method === "DELETE"
                                  ? "text-red-400"
                                  : "text-gray-400"
                              }`}
                            >
                              {r.method}
                            </span>
                            <span className="truncate text-xs">{r.name}</span>
                          </div>
                          <button
                            className="hidden group-hover:block p-0.5 hover:text-red-400 text-gray-650 transition cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              showCustomConfirm("Delete Request", `Delete request "${r.name}"?`, () => {
                                onDeleteRequest(c.id, null, r.id);
                              });
                            }}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}

                      {/* Folders */}
                      {c.folders.map((f) => (
                        <div key={f.id} className="space-y-0.5">
                          <div className="group flex items-center justify-between p-1.5 hover:bg-gray-800 rounded transition cursor-pointer text-gray-300">
                            <div 
                              className="flex items-center gap-1.5 truncate flex-1 text-xs"
                              onClick={() => toggleFolder(f.id)}
                            >
                              <Folder className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                              <span className="truncate">{f.name}</span>
                            </div>
                            <div className="hidden group-hover:flex items-center gap-1">
                              <button
                                className="p-0.5 hover:text-indigo-400 text-gray-500 transition cursor-pointer"
                                title="Add request"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  showCustomPrompt("Create Request", "Request name...", "", (name) => {
                                    onCreateRequest(c.id, f.id, name);
                                  });
                                }}
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {expandedFolders[f.id] && (
                            <div className="pl-3 border-l border-gray-800 ml-3.5 py-0.5 animate-in fade-in duration-100">
                              {f.requests.map((r) => (
                                <div
                                  key={r.id}
                                  className={`group flex items-center justify-between px-2 py-1.5 rounded transition cursor-pointer ${
                                    activeRequest?.id === r.id
                                      ? "bg-indigo-950/40 text-indigo-300 border-r-2 border-indigo-500"
                                      : "text-gray-400 hover:bg-gray-850 hover:text-gray-200"
                                  }`}
                                  onClick={() => onSelectRequest(r)}
                                >
                                  <div className="flex items-center gap-2 truncate flex-1">
                                    <span
                                      className={`text-[9px] font-bold w-9 text-right shrink-0 ${
                                        r.method === "GET"
                                          ? "text-emerald-400"
                                          : r.method === "POST"
                                          ? "text-indigo-400"
                                          : r.method === "PUT"
                                          ? "text-amber-400"
                                          : r.method === "DELETE"
                                          ? "text-red-400"
                                          : "text-gray-400"
                                      }`}
                                    >
                                      {r.method}
                                    </span>
                                    <span className="truncate text-xs">{r.name}</span>
                                  </div>
                                  <button
                                    className="hidden group-hover:block p-0.5 hover:text-red-400 text-gray-650 transition cursor-pointer"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      showCustomConfirm("Delete Request", `Delete request "${r.name}"?`, () => {
                                        onDeleteRequest(c.id, f.id, r.id);
                                      });
                                    }}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
          )
        ) : history.length === 0 ? (
          <div className="text-center py-8 text-xs text-gray-500">
            No history. Sent requests appear here.
          </div>
        ) : (
          <div className="space-y-0.5">
            <div className="flex justify-between items-center px-2 py-1 text-gray-500 text-[10px] uppercase font-bold select-none">
              <span>Past Runs</span>
              <button className="hover:text-red-400 cursor-pointer" onClick={onClearHistory}>Clear</button>
            </div>
            {history
              .filter((h) => h.url.toLowerCase().includes(searchTerm.toLowerCase()))
              .map((h) => (
                <div
                  key={h.id}
                  className="group flex items-center justify-between px-2 py-2 hover:bg-gray-800 rounded transition cursor-pointer text-xs"
                  onClick={() => onSelectRequest(h.request)}
                >
                  <div className="flex items-center gap-2 truncate flex-1">
                    <span
                      className={`text-[9px] font-bold w-9 text-right shrink-0 ${
                        h.method === "GET"
                          ? "text-emerald-400"
                          : h.method === "POST"
                          ? "text-indigo-400"
                          : h.method === "PUT"
                          ? "text-amber-400"
                          : h.method === "DELETE"
                          ? "text-red-400"
                          : "text-gray-400"
                      }`}
                    >
                      {h.method}
                    </span>
                    <span className="truncate text-gray-300 font-mono text-[11px]">{h.url}</span>
                  </div>
                  <span className="text-[10px] text-gray-550 select-none font-medium">{h.response?.status}</span>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Environments Modal */}
      {showEnvModal && (
        <EnvironmentManagerModal
          environments={environments}
          onClose={() => setShowEnvModal(false)}
          onSave={(updatedEnvs) => {
            onUpdateEnvironments(updatedEnvs);
            // Sync active environment variables
            if (activeEnv) {
              const updatedActive = updatedEnvs.find(e => e.id === activeEnv.id);
              if (updatedActive) onSelectEnv(updatedActive);
            }
          }}
        />
      )}

      {/* Custom dialog prompt / confirm overlay modal */}
      {dialogOpen && dialogConfig && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-lg w-full max-w-sm overflow-hidden text-sm shadow-2xl animate-in fade-in duration-200">
            <div className="p-4 bg-gray-950 border-b border-gray-850 flex justify-between items-center">
              <h4 className="text-gray-100 font-semibold">{dialogConfig.title}</h4>
              <button onClick={() => setDialogOpen(false)} className="text-gray-400 hover:text-white cursor-pointer">✕</button>
            </div>
            <div className="p-4 space-y-3">
              {dialogConfig.message && (
                <p className="text-xs text-gray-400 leading-relaxed select-text">{dialogConfig.message}</p>
              )}
              {dialogConfig.type === "prompt" && (
                <input
                  type="text"
                  id="custom-dialog-input"
                  className="w-full bg-gray-950 border border-gray-850 rounded px-3 py-2 text-xs outline-none text-gray-250 focus:border-indigo-500 font-medium"
                  placeholder={dialogConfig.placeholder}
                  defaultValue={dialogConfig.defaultValue}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      const val = (document.getElementById("custom-dialog-input") as HTMLInputElement)?.value;
                      dialogConfig.onConfirm(val);
                    } else if (e.key === "Escape") {
                      setDialogOpen(false);
                    }
                  }}
                />
              )}
            </div>
            <div className="px-4 py-3 bg-gray-950 border-t border-gray-800 flex justify-end gap-2.5">
              <button
                onClick={() => setDialogOpen(false)}
                className="px-3.5 py-1.5 border border-gray-705 hover:bg-gray-800 text-gray-300 rounded text-xs transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const val = dialogConfig.type === "prompt" 
                    ? (document.getElementById("custom-dialog-input") as HTMLInputElement)?.value 
                    : undefined;
                  dialogConfig.onConfirm(val);
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

/* Sub-component: Environment Variable Manager Modal */
function EnvironmentManagerModal({
  environments,
  onClose,
  onSave
}: {
  environments: Environment[];
  onClose: () => void;
  onSave: (envs: Environment[]) => void;
}) {
  const [envs, setEnvs] = useState<Environment[]>(JSON.parse(JSON.stringify(environments)));
  const [selectedEnvId, setSelectedEnvId] = useState<string | null>(
    envs.length > 0 ? envs[0].id : null
  );
  const [isAddingEnv, setIsAddingEnv] = useState(false);
  const [newEnvName, setNewEnvName] = useState("");

  const activeEnv = envs.find((e) => e.id === selectedEnvId) || null;

  const handleConfirmAddEnv = () => {
    if (!newEnvName.trim()) return;
    const newEnv: Environment = {
      id: Math.random().toString(36).substring(2, 11),
      name: newEnvName.trim(),
      variables: []
    };
    setEnvs([...envs, newEnv]);
    setSelectedEnvId(newEnv.id);
    setNewEnvName("");
    setIsAddingEnv(false);
  };

  const deleteEnvironment = (id: string) => {
    const updated = envs.filter((e) => e.id !== id);
    setEnvs(updated);
    if (selectedEnvId === id) {
      setSelectedEnvId(updated.length > 0 ? updated[0].id : null);
    }
  };

  const addVariable = () => {
    if (!activeEnv) return;
    activeEnv.variables.push({
      id: Math.random().toString(36).substring(2, 11),
      key: "new_variable",
      value: "value",
      enabled: true
    });
    setEnvs([...envs]);
  };

  const updateVariable = (varId: string, fields: Partial<{ key: string; value: string; enabled: boolean }>) => {
    if (!activeEnv) return;
    const idx = activeEnv.variables.findIndex((v) => v.id === varId);
    if (idx !== -1) {
      activeEnv.variables[idx] = { ...activeEnv.variables[idx], ...fields };
      setEnvs([...envs]);
    }
  };

  const deleteVariable = (varId: string) => {
    if (!activeEnv) return;
    activeEnv.variables = activeEnv.variables.filter((v) => v.id !== varId);
    setEnvs([...envs]);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-gray-900 border border-gray-800 rounded-lg w-full max-w-3xl flex flex-col h-[500px] overflow-hidden text-sm shadow-2xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-800 flex justify-between items-center bg-gray-950 select-none">
          <h3 className="text-gray-100 font-semibold flex items-center gap-2">
            <Settings className="w-4 h-4 text-cyan-400" />
            Manage Environment Variables
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white cursor-pointer">✕</button>
        </div>

        {/* Content Box */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left panel: Envs list */}
          <div className="w-1/3 border-r border-gray-800 p-3 bg-gray-900/50 flex flex-col gap-2">
            <div className="flex justify-between items-center text-[10px] text-gray-500 uppercase font-bold px-1 select-none">
              <span>Environments</span>
              <button 
                onClick={() => setIsAddingEnv(true)}
                className="text-indigo-400 hover:text-indigo-350 flex items-center gap-0.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Add
              </button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-1">
              {envs.map((e) => (
                <div
                  key={e.id}
                  className={`flex items-center justify-between px-3 py-2 rounded cursor-pointer transition text-xs select-none ${
                    selectedEnvId === e.id
                      ? "bg-indigo-950/50 text-indigo-400 border border-indigo-500/30"
                      : "text-gray-400 hover:bg-gray-800 hover:text-gray-200 border border-transparent"
                  }`}
                  onClick={() => setSelectedEnvId(e.id)}
                >
                  <span className="truncate flex-1 mr-2">{e.name}</span>
                  <button
                    className="hover:text-red-400 text-gray-500 p-0.5 transition cursor-pointer"
                    onClick={(evt) => {
                      evt.stopPropagation();
                      deleteEnvironment(e.id);
                    }}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}

              {isAddingEnv && (
                <div className="flex items-center gap-1.5 mt-1 bg-gray-950 border border-gray-850 rounded p-1.5 animate-in fade-in slide-in-from-top-1 duration-150">
                  <input
                    type="text"
                    className="w-full bg-transparent text-gray-250 text-xs outline-none font-medium px-1 py-0.5"
                    placeholder="Env Name..."
                    value={newEnvName}
                    autoFocus
                    onChange={(e) => setNewEnvName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleConfirmAddEnv();
                      } else if (e.key === "Escape") {
                        setIsAddingEnv(false);
                        setNewEnvName("");
                      }
                    }}
                  />
                  <button
                    onClick={handleConfirmAddEnv}
                    className="text-emerald-400 hover:text-emerald-300 font-bold text-xs cursor-pointer"
                    title="Confirm"
                  >
                    ✓
                  </button>
                  <button
                    onClick={() => {
                      setIsAddingEnv(false);
                      setNewEnvName("");
                    }}
                    className="text-red-400 hover:text-red-300 font-bold text-xs cursor-pointer"
                    title="Cancel"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Right panel: Variables table */}
          <div className="w-2/3 p-4 flex flex-col overflow-hidden">
            {activeEnv ? (
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-gray-200 font-semibold">{activeEnv.name}</h4>
                  <button
                    onClick={addVariable}
                    className="px-2.5 py-1 text-xs bg-indigo-600 hover:bg-indigo-500 text-white rounded flex items-center gap-1 transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Variable
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto border border-gray-800 rounded bg-gray-950">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead className="bg-gray-900 border-b border-gray-800 text-gray-400 uppercase font-semibold select-none">
                      <tr>
                        <th className="p-2 w-8 text-center">Active</th>
                        <th className="p-2 w-1/3">Variable Key</th>
                        <th className="p-2 w-1/3">Value</th>
                        <th className="p-2 w-10 text-center">Delete</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeEnv.variables.map((v) => (
                        <tr key={v.id} className="border-b border-gray-900 hover:bg-gray-900/40">
                          <td className="p-2 text-center">
                            <input
                              type="checkbox"
                              checked={v.enabled}
                              onChange={(evt) => updateVariable(v.id, { enabled: evt.target.checked })}
                              className="accent-indigo-500 cursor-pointer"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="text"
                              value={v.key}
                              placeholder="VARIABLE_NAME"
                              onChange={(evt) => updateVariable(v.id, { key: evt.target.value })}
                              className="w-full bg-transparent text-gray-300 outline-none focus:border-b focus:border-indigo-500 font-mono"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="text"
                              value={v.value}
                              placeholder="Value"
                              onChange={(evt) => updateVariable(v.id, { value: evt.target.value })}
                              className="w-full bg-transparent text-gray-300 outline-none focus:border-b focus:border-indigo-500 font-mono"
                            />
                          </td>
                          <td className="p-2 text-center">
                            <button
                              onClick={() => deleteVariable(v.id)}
                              className="text-gray-500 hover:text-red-400 transition cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {activeEnv.variables.length === 0 && (
                        <tr>
                          <td colSpan={4} className="p-6 text-center text-gray-500 select-none">
                            No variables added yet. Click "Add Variable" above.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-500 text-xs select-none">
                Select or create an environment from the left sidebar panel.
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-800 flex justify-end gap-3 bg-gray-950 select-none">
          <button
            onClick={onClose}
            className="px-4 py-1.5 border border-gray-700 hover:bg-gray-800 text-gray-300 rounded text-xs transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onSave(envs);
              onClose();
            }}
            className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs transition font-semibold cursor-pointer"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
