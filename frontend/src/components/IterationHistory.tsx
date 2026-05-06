import { ChevronDown, ChevronUp, History, TrendingUp, ArrowRight } from "lucide-react";
import { useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from "recharts";
import { cn } from "../lib/utils";

interface IterationHistoryProps {
  iterations: any[];
  initialScore: number;
  finalScore: number;
}

export function IterationHistory({ iterations, initialScore, finalScore }: IterationHistoryProps) {
  const [expanded, setExpanded] = useState(false);
  const [expandedIt, setExpandedIt] = useState<number | null>(null);

  if (!iterations || iterations.length <= 1) return null;

  const improved = finalScore > initialScore;
  
  const chartData = iterations.map((it) => ({
    name: `It ${it.iteration_number}`,
    score: it.confidence_score,
    hallucination: it.hallucination_score * 100,
  }));

  return (
    <div className="mt-6 border border-gray-800 bg-gray-900/50 rounded-xl overflow-hidden">
      <div 
        className="p-4 cursor-pointer flex items-center justify-between hover:bg-gray-800/50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center space-x-3">
          <div className={cn("p-2 rounded-lg", improved ? "bg-green-500/20 text-green-400" : "bg-gray-800 text-gray-400")}>
            <History className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-white flex items-center">
              Self-Improvement: {initialScore}% → {finalScore}%
              {improved ? (
                <TrendingUp className="w-4 h-4 text-green-400 ml-2" />
              ) : (
                <ArrowRight className="w-4 h-4 text-gray-400 ml-2" />
              )}
            </h3>
            <p className="text-xs text-gray-400">
              Answer was iteratively refined {iterations.length - 1} times to remove hallucinations.
            </p>
          </div>
        </div>
        <div className="text-gray-500 bg-gray-950 p-2 rounded border border-gray-800">
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </div>

      {expanded && (
        <div className="p-6 border-t border-gray-800 bg-gray-950">
          <div className="h-[200px] w-full mb-8">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis domain={[0, 100]} stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.5rem' }}
                  itemStyle={{ color: '#f8fafc' }}
                  labelStyle={{ color: '#94a3b8', marginBottom: '0.25rem' }}
                />
                <ReferenceLine y={initialScore} stroke="#475569" strokeDasharray="3 3" />
                <Line type="monotone" dataKey="score" name="Confidence %" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 4, fill: '#8b5cf6', strokeWidth: 0 }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="hallucination" name="Hallucination Risk" stroke="#ef4444" strokeWidth={2} strokeDasharray="4 4" dot={{ r: 3, fill: '#ef4444', strokeWidth: 0 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-4">
            {iterations.map((it, idx) => {
              const isInitial = idx === 0;
              const isFinal = idx === iterations.length - 1;
              const isExpanded = expandedIt === idx;
              
              return (
                <div key={idx} className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
                  <div 
                    className="p-4 cursor-pointer hover:bg-gray-800/50 transition-colors flex items-center justify-between"
                    onClick={() => setExpandedIt(isExpanded ? null : idx)}
                  >
                    <div className="flex items-center space-x-4">
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border",
                        isInitial ? "bg-gray-800 border-gray-700 text-gray-400" :
                        isFinal ? "bg-green-500/20 border-green-500/30 text-green-400" :
                        "bg-yellow-500/20 border-yellow-500/30 text-yellow-400"
                      )}>
                        {it.iteration_number}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-gray-200">
                            {isInitial ? "Initial Generation" : isFinal ? "Final Answer" : `Refinement ${it.iteration_number}`}
                          </span>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-800 text-gray-300 font-mono">
                            {it.confidence_score}%
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 mt-1">{it.changes_made}</p>
                      </div>
                    </div>
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
                  </div>
                  
                  {isExpanded && (
                    <div className="p-4 border-t border-gray-800 bg-gray-950">
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">Generated Text</span>
                        <span className="text-xs text-red-400 bg-red-500/10 px-2 py-1 rounded border border-red-500/20">
                          Hallucination Score: {it.hallucination_score.toFixed(2)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-300 whitespace-pre-wrap font-serif leading-relaxed">
                        {it.answer_generated}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
