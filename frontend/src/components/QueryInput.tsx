import { useState } from "react";
import { Send, Loader2, RefreshCw, Layers } from "lucide-react";
import { useStore } from "../store/useStore";
import { cn } from "../lib/utils";

interface QueryInputProps {
  onSearch?: (query: string) => void;
  isLoading?: boolean;
}

export function QueryInput({ onSearch, isLoading: externalLoading }: QueryInputProps) {
  const { 
    currentQuery, 
    setCurrentQuery, 
    runQuery, 
    isLoadingAgentic,
    agenticResult,
    includeContext,
    setIncludeContext,
    clearResults
  } = useStore();

  const [localQuery, setLocalQuery] = useState(currentQuery);
  const isLoading = externalLoading !== undefined ? externalLoading : isLoadingAgentic;

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!localQuery.trim() || isLoading) return;
    
    setCurrentQuery(localQuery);
    if (onSearch) {
      onSearch(localQuery);
    } else {
      runQuery(localQuery);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      handleSubmit();
    }
  };

  const handleClear = () => {
    setLocalQuery("");
    clearResults();
  };

  const getQueryTypeColor = (type?: string) => {
    switch (type) {
      case "FACTUAL": return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      case "ANALYTICAL": return "bg-purple-500/20 text-purple-400 border-purple-500/30";
      case "SUMMARIZATION": return "bg-green-500/20 text-green-400 border-green-500/30";
      case "CONVERSATIONAL": return "bg-orange-500/20 text-orange-400 border-orange-500/30";
      case "OUT_OF_SCOPE": return "bg-red-500/20 text-red-400 border-red-500/30";
      default: return "bg-gray-800 text-gray-400 border-gray-700";
    }
  };

  return (
    <div className="w-full relative">
      <form onSubmit={handleSubmit} className="relative group">
        <textarea
          value={localQuery}
          onChange={(e) => setLocalQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask anything about your documents..."
          className="w-full min-h-[120px] bg-gray-900 border border-gray-800 rounded-2xl p-4 pr-16 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all resize-y shadow-inner"
          disabled={isLoading}
        />
        
        <div className="absolute bottom-4 right-4 flex items-center space-x-2">
          <button
            type="submit"
            disabled={!localQuery.trim() || isLoading}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-800 disabled:text-gray-500 text-white p-3 rounded-xl transition-all shadow-lg flex items-center justify-center"
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </button>
        </div>
      </form>

      <div className="flex flex-wrap items-center justify-between mt-3 text-sm">
        <div className="flex items-center space-x-4">
          <label className="flex items-center space-x-2 text-gray-400 cursor-pointer hover:text-gray-300 transition-colors">
            <input
              type="checkbox"
              checked={includeContext}
              onChange={(e) => setIncludeContext(e.target.checked)}
              className="rounded border-gray-700 bg-gray-900 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-gray-950"
            />
            <span>Include conversation context</span>
          </label>
          
          <button 
            onClick={handleClear}
            className="text-gray-500 hover:text-gray-300 transition-colors flex items-center space-x-1"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Clear</span>
          </button>
        </div>
        
        <div className="text-gray-600">
          {localQuery.length} characters &middot; <kbd className="font-mono text-xs bg-gray-900 border border-gray-800 px-1 rounded">Ctrl</kbd> + <kbd className="font-mono text-xs bg-gray-900 border border-gray-800 px-1 rounded">Enter</kbd> to ask
        </div>
      </div>

      {agenticResult && !isLoading && (
        <div className="mt-4 flex flex-wrap items-center gap-3 p-3 bg-gray-900/50 border border-gray-800/50 rounded-xl animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center space-x-2 text-sm text-gray-400">
            <Layers className="w-4 h-4" />
            <span>Classification:</span>
          </div>
          
          <span className={cn("px-2 py-1 rounded text-xs font-bold border", getQueryTypeColor(agenticResult.query_type))}>
            {agenticResult.query_type}
          </span>
          
          <span className="text-gray-500 text-xs">
            ({(agenticResult.routing_confidence * 100).toFixed(0)}% conf)
          </span>
          
          <div className="w-px h-4 bg-gray-800 mx-1"></div>
          
          <span className="px-2 py-1 bg-gray-800 border border-gray-700 rounded text-xs text-gray-300">
            Strategy: <span className="font-mono text-indigo-300">{agenticResult.strategy_used}</span>
          </span>

          {agenticResult.routing_confidence < 0.7 && ( // Assuming <0.7 triggered override if applicable
            <span className="ml-auto text-xs text-yellow-500 flex items-center space-x-1 bg-yellow-500/10 px-2 py-1 rounded border border-yellow-500/20">
              <span>⚠️ Low classification confidence</span>
            </span>
          )}
        </div>
      )}
    </div>
  );
}
