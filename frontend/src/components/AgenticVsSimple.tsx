import type {  AgenticResponse, SimpleRAGResponse  } from '../types';
import { Zap, CheckCircle2, ShieldCheck, Cpu } from "lucide-react";
import ReactMarkdown from "react-markdown";
import ReactDiffViewer from "react-diff-viewer-continued";
import { cn } from "../lib/utils";

interface AgenticVsSimpleProps {
  agentic: AgenticResponse;
  simple: SimpleRAGResponse;
}

export function AgenticVsSimple({ agentic, simple }: AgenticVsSimpleProps) {
  const agenticHalScore = agentic.hallucination_score * 100;
  
  // Note: simple RAG doesn't have a hallucination score natively from the endpoint unless we run it through the evaluator.
  // In our backend, SimpleRAGResponse doesn't include hallucination_score, claims, or confidence_breakdown.
  // We'll compare what we have.

  const agenticSupportedCount = agentic.claims?.filter(c => c.status === "SUPPORTED").length || 0;
  const agenticLatency = agentic.total_latency_ms / 1000;
  const simpleLatency = simple.latency_ms / 1000;
  
  const isAgenticBetter = agenticSupportedCount > 0 || agenticHalScore < 30 || agentic.fallback_level > 0;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Agentic Column */}
        <div className="bg-gray-900 border-2 border-indigo-500/30 rounded-2xl overflow-hidden shadow-xl shadow-indigo-500/5">
          <div className="bg-gray-950 p-4 border-b border-indigo-500/20 flex items-center justify-between">
            <h3 className="font-bold text-white flex items-center space-x-2">
              <Cpu className="w-5 h-5 text-indigo-400" />
              <span>Agentic RAG</span>
            </h3>
            <span className="px-3 py-1 bg-indigo-500/20 text-indigo-400 rounded-full text-xs font-bold border border-indigo-500/30">
              {agentic.confidence_breakdown?.confidence_percentage || 0}% CONFIDENCE
            </span>
          </div>
          <div className="p-6 h-[400px] overflow-y-auto font-serif text-gray-300 leading-relaxed prose prose-invert max-w-none">
            <ReactMarkdown>{agentic.final_answer}</ReactMarkdown>
          </div>
        </div>

        {/* Simple Column */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden shadow-lg opacity-80 hover:opacity-100 transition-opacity">
          <div className="bg-gray-950 p-4 border-b border-gray-800 flex items-center justify-between">
            <h3 className="font-bold text-white flex items-center space-x-2">
              <Zap className="w-5 h-5 text-gray-400" />
              <span>Simple RAG</span>
            </h3>
            <span className="px-3 py-1 bg-gray-800 text-gray-400 rounded-full text-xs font-bold border border-gray-700">
              BASELINE
            </span>
          </div>
          <div className="p-6 h-[400px] overflow-y-auto font-serif text-gray-300 leading-relaxed prose prose-invert max-w-none">
            <ReactMarkdown>{simple.answer}</ReactMarkdown>
          </div>
        </div>
      </div>

      {/* Diff Viewer */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 overflow-hidden">
        <h3 className="text-sm font-semibold text-gray-400 mb-4 uppercase tracking-wider">Content Differences</h3>
        <div className="rounded-xl overflow-hidden border border-gray-800 text-sm">
          <ReactDiffViewer 
            oldValue={simple.answer} 
            newValue={agentic.final_answer} 
            splitView={true}
            useDarkTheme={true}
            leftTitle="Simple RAG"
            rightTitle="Agentic RAG"
            styles={{
              variables: {
                dark: {
                  diffViewerBackground: '#0f172a',
                  diffViewerTitleBackground: '#020617',
                  diffViewerTitleColor: '#94a3b8',
                  diffViewerTitleBorderColor: '#1e293b',
                  addedBackground: '#064e3b',
                  addedColor: '#34d399',
                  removedBackground: '#450a0a',
                  removedColor: '#f87171',
                  wordAddedBackground: '#047857',
                  wordRemovedBackground: '#7f1d1d',
                  addedGutterBackground: '#064e3b',
                  removedGutterBackground: '#450a0a',
                  gutterBackground: '#0f172a',
                  gutterBackgroundDark: '#020617',
                  emptyLineBackground: '#0f172a',
                }
              }
            }}
          />
        </div>
      </div>

      {/* Metrics Comparison */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-950 border-b border-gray-800 text-sm uppercase tracking-wider text-gray-500">
            <tr>
              <th className="px-6 py-4 font-semibold">Metric</th>
              <th className="px-6 py-4 font-semibold">Agentic RAG</th>
              <th className="px-6 py-4 font-semibold">Simple RAG</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            <tr className="hover:bg-gray-800/30">
              <td className="px-6 py-4 font-medium text-gray-300">Strategy Used</td>
              <td className="px-6 py-4 font-mono text-indigo-400 text-sm">{agentic.strategy_used}</td>
              <td className="px-6 py-4 font-mono text-gray-500 text-sm">basic_vector</td>
            </tr>
            <tr className="hover:bg-gray-800/30">
              <td className="px-6 py-4 font-medium text-gray-300">Confidence Score</td>
              <td className="px-6 py-4 font-bold text-green-400">{agentic.confidence_breakdown?.confidence_percentage || 0}%</td>
              <td className="px-6 py-4 text-gray-500 italic">Not available</td>
            </tr>
            <tr className="hover:bg-gray-800/30">
              <td className="px-6 py-4 font-medium text-gray-300">Verified Claims</td>
              <td className="px-6 py-4 font-bold text-green-400">{agenticSupportedCount} claims verified</td>
              <td className="px-6 py-4 text-gray-500 italic">Not available</td>
            </tr>
            <tr className="hover:bg-gray-800/30">
              <td className="px-6 py-4 font-medium text-gray-300">Iterations (Refinement)</td>
              <td className="px-6 py-4 text-blue-400">{agentic.iterations_count} iteration(s)</td>
              <td className="px-6 py-4 text-gray-500">1 iteration</td>
            </tr>
            <tr className="hover:bg-gray-800/30">
              <td className="px-6 py-4 font-medium text-gray-300">Latency</td>
              <td className={cn("px-6 py-4", agenticLatency > simpleLatency ? "text-yellow-500" : "text-green-500")}>
                {agenticLatency.toFixed(2)}s
              </td>
              <td className="px-6 py-4 text-gray-300">
                {simpleLatency.toFixed(2)}s
              </td>
            </tr>
          </tbody>
        </table>

        {/* Callout Box */}
        <div className="bg-gray-950 p-6 border-t border-gray-800">
          {isAgenticBetter ? (
            <div className="flex items-start space-x-3 bg-green-500/10 border border-green-500/20 p-4 rounded-xl">
              <ShieldCheck className="w-6 h-6 text-green-500 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-green-400 font-bold mb-2">Agentic Pipeline Advantages</h4>
                <ul className="text-sm text-green-500/80 space-y-1 list-disc list-inside">
                  {agentic.iterations_count > 1 && <li>Self-corrected initial draft through {agentic.iterations_count} iterations</li>}
                  {agenticSupportedCount > 0 && <li>Verified {agenticSupportedCount} factual claims against retrieved context</li>}
                  {agentic.fallback_level > 0 && <li>Triggered fallback mechanisms to find a better answer</li>}
                  <li>Dynamically routed to optimal retrieval strategy</li>
                </ul>
              </div>
            </div>
          ) : (
            <div className="flex items-start space-x-3 bg-blue-500/10 border border-blue-500/20 p-4 rounded-xl">
              <CheckCircle2 className="w-6 h-6 text-blue-500 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-blue-400 font-bold mb-1">Simple RAG performed similarly</h4>
                <p className="text-sm text-blue-500/80">For this specific query, the advanced mechanisms of Agentic RAG were not heavily utilized, indicating a straightforward factual question.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
