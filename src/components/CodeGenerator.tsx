import { useState } from "react";
import { Copy, Check, Terminal } from "lucide-react";
import { ClotientRequest, Environment } from "../types";
import { resolveVariables } from "../utils/envResolver";
import {
  generateCurl,
  generatePythonRequests,
  generatePythonHttpClient,
  generateJsAxios,
  generateJsFetch,
  generateRustReqwest
} from "../utils/codeGenerators";

interface CodeGeneratorProps {
  request: ClotientRequest;
  activeEnv: Environment | null;
  onClose: () => void;
}

type Lang = "curl" | "pyRequests" | "pyHttp" | "jsAxios" | "jsFetch" | "rust";

export default function CodeGenerator({ request, activeEnv, onClose }: CodeGeneratorProps) {
  const [activeLang, setActiveLang] = useState<Lang>("curl");
  const [copied, setCopied] = useState(false);

  // 1. Resolve URL, Headers and Body Text using Environment variables
  const resolvedUrl = resolveVariables(request.url, activeEnv);
  
  const resolvedHeaders = request.headers.map((h) => ({
    ...h,
    value: resolveVariables(h.value, activeEnv)
  }));

  // Resolve body text
  let bodyText = "";
  if (request.body.type === "json" || request.body.type === "raw") {
    bodyText = resolveVariables(request.body.rawText, activeEnv);
  } else if (request.body.type === "urlencoded") {
    const list = (request.body.urlencoded || [])
      .filter((x) => x.enabled && x.key)
      .map((x) => `${encodeURIComponent(x.key)}=${encodeURIComponent(resolveVariables(x.value, activeEnv))}`);
    bodyText = list.join("&");
  } else if (request.body.type === "form-data") {
    const list = (request.body.formData || [])
      .filter((x) => x.enabled && x.key)
      .map((x) => `${x.key}: ${resolveVariables(x.value, activeEnv)}`);
    bodyText = list.join("\n");
  }

  // 2. Generate code content
  let codeSnippet = "";
  switch (activeLang) {
    case "curl":
      codeSnippet = generateCurl(request, resolvedUrl, resolvedHeaders, bodyText);
      break;
    case "pyRequests":
      codeSnippet = generatePythonRequests(request, resolvedUrl, resolvedHeaders, bodyText);
      break;
    case "pyHttp":
      codeSnippet = generatePythonHttpClient(request, resolvedUrl, resolvedHeaders, bodyText);
      break;
    case "jsAxios":
      codeSnippet = generateJsAxios(request, resolvedUrl, resolvedHeaders, bodyText);
      break;
    case "jsFetch":
      codeSnippet = generateJsFetch(request, resolvedUrl, resolvedHeaders, bodyText);
      break;
    case "rust":
      codeSnippet = generateRustReqwest(request, resolvedUrl, resolvedHeaders, bodyText);
      break;
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(codeSnippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const languages: { id: Lang; label: string }[] = [
    { id: "curl", label: "cURL" },
    { id: "pyRequests", label: "Python (Requests)" },
    { id: "pyHttp", label: "Python (http.client)" },
    { id: "jsAxios", label: "JS (Axios)" },
    { id: "jsFetch", label: "JS (Fetch)" },
    { id: "rust", label: "Rust (Reqwest)" }
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-lg w-full max-w-3xl flex flex-col h-[520px] overflow-hidden text-sm">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-800 flex justify-between items-center bg-gray-950">
          <h3 className="text-gray-100 font-semibold flex items-center gap-2">
            <Terminal className="w-4 h-4 text-indigo-400" />
            Generate Code Request Snippets
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">✕</button>
        </div>

        {/* Language Tabs */}
        <div className="flex bg-gray-950 border-b border-gray-850 px-4 overflow-x-auto">
          {languages.map((lang) => (
            <button
              key={lang.id}
              className={`py-2 px-3 text-xs border-b-2 font-medium transition cursor-pointer whitespace-nowrap ${
                activeLang === lang.id
                  ? "border-indigo-500 text-indigo-400 bg-gray-900/40"
                  : "border-transparent text-gray-500 hover:text-gray-300"
              }`}
              onClick={() => setActiveLang(lang.id)}
            >
              {lang.label}
            </button>
          ))}
        </div>

        {/* Snippet Output */}
        <div className="flex-1 p-4 bg-gray-950 flex flex-col overflow-hidden relative">
          <button
            onClick={handleCopy}
            className="absolute top-6 right-6 p-2 bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white rounded border border-gray-700 transition flex items-center gap-1.5 text-xs"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" /> Copied!
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" /> Copy Code
              </>
            )}
          </button>
          <pre className="flex-1 overflow-auto text-xs font-mono text-gray-300 bg-gray-900 border border-gray-800 p-4 rounded leading-relaxed select-text">
            <code>{codeSnippet}</code>
          </pre>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-800 flex justify-end bg-gray-950">
          <button
            onClick={onClose}
            className="px-5 py-1.5 bg-gray-850 hover:bg-gray-800 text-gray-300 rounded text-xs transition border border-gray-700"
          >
            Close Viewer
          </button>
        </div>
      </div>
    </div>
  );
}
