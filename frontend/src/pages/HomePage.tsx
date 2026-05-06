import { useEffect, useState } from "react";
import { QueryInput } from "../components/QueryInput";
import { AnswerCard } from "../components/AnswerCard";
import { Sidebar } from "../components/layout/Sidebar";
import { IterationHistory } from "../components/IterationHistory";
import { useStore } from "../store/useStore";
import { Rocket, ShieldCheck, Zap, AlertTriangle, RefreshCw, Layers } from "lucide-react";
import { getQueryIterations } from "../api/client";

export default function HomePage() {
  const { agenticResult, stats, isLoadingAgentic, queryError, setActiveTab } = useStore();
  const [iterations, setIterations] = useState<any[]>([]);
  const [loadingIterations, setLoadingIterations] = useState(false);

  useEffect(() => {
    setActiveTab("home");
  }, [setActiveTab]);

  useEffect(() => {
    if (agenticResult && agenticResult.iterations_count > 1) {
      setLoadingIterations(true);
      getQueryIterations(agenticResult.query_id)
        .then(setIterations)
        .catch(console.error)
        .finally(() => setLoadingIterations(false));
    } else {
      setIterations([]);
    }
  }, [agenticResult]);

  return (
    <div className="flex flex-col lg:flex-row gap-8 min-h-[calc(100vh-6rem)]">
      {/* Left Column - Main Interface */}
      <div className="w-full lg:w-3/5 xl:w-2/3 flex flex-col space-y-6">
        <QueryInput />

        {queryError && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl flex items-start space-x-3">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold mb-1">Query Failed</h4>
              <p className="text-sm">{queryError}</p>
            </div>
          </div>
        )}

        {isLoadingAgentic && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 flex flex-col items-center justify-center space-y-4 animate-pulse h-64">
            <div className="relative">
              <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-4 h-4 bg-indigo-500 rounded-full animate-ping"></div>
              </div>
            </div>
            <p className="text-indigo-400 font-medium animate-pulse">Running agentic pipeline...</p>
            <div className="flex space-x-2 mt-4">
              <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce delay-75"></div>
              <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce delay-150"></div>
            </div>
          </div>
        )}

        {!isLoadingAgentic && agenticResult && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <AnswerCard result={agenticResult} isAgentic={true} />
            
            {iterations.length > 1 && !loadingIterations && (
              <IterationHistory 
                iterations={iterations} 
                initialScore={iterations[0].confidence_score} 
                finalScore={iterations[iterations.length - 1].confidence_score} 
              />
            )}
          </div>
        )}

        {!isLoadingAgentic && !agenticResult && !queryError && (
          <div className="flex-1 flex flex-col items-center justify-center py-20 text-center px-4">
            <div className="w-24 h-24 bg-gray-900 rounded-full flex items-center justify-center mb-6 border border-gray-800 shadow-xl relative">
              <div className="absolute inset-0 bg-indigo-500/20 rounded-full blur-xl animate-pulse"></div>
              <Rocket className="w-12 h-12 text-indigo-400 relative z-10" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">Ready to Answer</h2>
            <p className="text-gray-400 max-w-md mx-auto mb-8">
              Upload documents in the <a href="/documents" className="text-indigo-400 hover:underline">Documents</a> tab, then ask complex questions here. The Agentic pipeline will route, retrieve, evaluate, and refine to give you the best answer.
            </p>
          </div>
        )}
      </div>

      {/* Right Column - Stats & Chunks */}
      <div className="w-full lg:w-2/5 xl:w-1/3 flex flex-col space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex flex-col justify-center">
            <div className="flex items-center space-x-2 text-gray-500 mb-2">
              <Layers className="w-4 h-4 text-blue-500" />
              <span className="text-xs uppercase tracking-wider font-semibold">Total Queries</span>
            </div>
            <span className="text-3xl font-bold text-white">{stats?.total_queries || 0}</span>
          </div>
          
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex flex-col justify-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-green-500/5 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>
            <div className="flex items-center space-x-2 text-gray-500 mb-2 relative z-10">
              <ShieldCheck className="w-4 h-4 text-green-500" />
              <span className="text-xs uppercase tracking-wider font-semibold">Avg Confidence</span>
            </div>
            <span className="text-3xl font-bold text-green-400 relative z-10">
              {stats?.avg_confidence ? `${(stats.avg_confidence * 100).toFixed(1)}%` : "0%"}
            </span>
          </div>
          
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex flex-col justify-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-yellow-500/5 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>
            <div className="flex items-center space-x-2 text-gray-500 mb-2 relative z-10">
              <RefreshCw className="w-4 h-4 text-yellow-500" />
              <span className="text-xs uppercase tracking-wider font-semibold">Retry Rate</span>
            </div>
            <span className="text-3xl font-bold text-yellow-400 relative z-10">
              {stats?.retry_rate ? `${(stats.retry_rate * 100).toFixed(1)}%` : "0%"}
            </span>
          </div>
          
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex flex-col justify-center">
            <div className="flex items-center space-x-2 text-gray-500 mb-2">
              <Zap className="w-4 h-4 text-indigo-500" />
              <span className="text-xs uppercase tracking-wider font-semibold">Avg Latency</span>
            </div>
            <span className="text-3xl font-bold text-white">
              {stats?.avg_latency_ms ? `${(stats.avg_latency_ms / 1000).toFixed(1)}s` : "0s"}
            </span>
          </div>
        </div>

        {agenticResult && <Sidebar />}
      </div>
    </div>
  );
}
