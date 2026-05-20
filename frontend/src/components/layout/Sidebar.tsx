import { useStore } from "../../store/useStore";
import { ChevronDown, ChevronUp, FileText, CheckCircle2, AlertCircle, XCircle } from "lucide-react";
import { useState } from "react";

export function Sidebar() {
  const { agenticResult } = useStore();
  const chunks = agenticResult?.retrieved_chunks || [];
  
  const [expandedChunk, setExpandedChunk] = useState<string | null>(null);

  if (!agenticResult) return null;

  return (
    <div className="flex flex-col h-full bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
      <div className="p-4 border-b border-gray-800 bg-gray-900/50">
        <h3 className="font-semibold text-white flex items-center space-x-2">
          <FileText className="w-5 h-5 text-indigo-400" />
          <span>Retrieved Chunks ({chunks.length})</span>
        </h3>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {chunks.length === 0 ? (
          <div className="text-gray-500 text-center text-sm py-8">
            No chunks retrieved.
          </div>
        ) : (
          chunks.map((chunk, idx) => (
            <div 
              key={chunk.chunk_id} 
              className="bg-gray-950 border border-gray-800 rounded-lg overflow-hidden flex flex-col"
            >
              <div 
                className="p-3 cursor-pointer hover:bg-gray-800/50 transition-colors"
                onClick={() => setExpandedChunk(expandedChunk === chunk.chunk_id ? null : chunk.chunk_id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-bold">
                      {idx + 1}
                    </span>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-gray-200 truncate max-w-[200px]" title={chunk.source}>
                        {chunk.source.split(/[/\\]/).pop()}
                      </span>
                      <span className="text-xs text-gray-500">
                        Page {chunk.page_number} · {chunk.strategy}
                      </span>
                    </div>
                  </div>
                  {expandedChunk === chunk.chunk_id ? (
                    <ChevronUp className="w-4 h-4 text-gray-500" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-500" />
                  )}
                </div>
                
                <div className="mt-3 flex items-center space-x-2">
                  <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-indigo-500 rounded-full" 
                      style={{ width: `${Math.max(0, Math.min(100, chunk.score * 100))}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-400 w-8 text-right">
                    {chunk.score.toFixed(2)}
                  </span>
                </div>
                
                <div className="mt-2 flex">
                  {chunk.crag_classification === "CORRECT" && (
                    <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-medium bg-green-500/10 text-green-400 border border-green-500/20">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>RELEVANT</span>
                    </span>
                  )}
                  {chunk.crag_classification === "AMBIGUOUS" && (
                    <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-medium bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
                      <AlertCircle className="w-3 h-3" />
                      <span>AMBIGUOUS</span>
                    </span>
                  )}
                  {chunk.crag_classification === "INCORRECT" && (
                    <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-medium bg-red-500/10 text-red-400 border border-red-500/20">
                      <XCircle className="w-3 h-3" />
                      <span>IRRELEVANT</span>
                    </span>
                  )}
                </div>
              </div>
              
              {expandedChunk === chunk.chunk_id && (
                <div className="p-3 border-t border-gray-800 bg-gray-900/50">
                  <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap font-serif">
                    {chunk.text}
                  </p>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
