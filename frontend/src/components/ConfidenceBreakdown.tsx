import type {  ConfidenceBreakdown as ConfType  } from '../types';
import { ChevronDown, ChevronUp, ShieldAlert, AlertTriangle } from "lucide-react";
import { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from "recharts";
import { cn } from "../lib/utils";

interface ConfidenceBreakdownProps {
  confidence: ConfType;
}

export function ConfidenceBreakdown({ confidence }: ConfidenceBreakdownProps) {
  const [expanded, setExpanded] = useState(false);

  const getBadgeColor = (level: string) => {
    switch (level) {
      case "HIGH": return "bg-green-500/10 border-green-500/20 text-green-500";
      case "MEDIUM": return "bg-yellow-500/10 border-yellow-500/20 text-yellow-500";
      case "LOW": return "bg-orange-500/10 border-orange-500/20 text-orange-500";
      case "VERY_LOW": return "bg-red-500/10 border-red-500/20 text-red-500";
      default: return "bg-gray-500/10 border-gray-500/20 text-gray-500";
    }
  };

  const getChartColor = (score: number) => {
    if (score >= 0.8) return "#22c55e"; // green
    if (score >= 0.6) return "#eab308"; // yellow
    if (score >= 0.4) return "#f97316"; // orange
    return "#ef4444"; // red
  };

  const chartData = [
    {
      name: "Retrieval Relevance",
      score: confidence.breakdown.retrieval_relevance.score,
      weight: confidence.breakdown.retrieval_relevance.weight,
      weighted: confidence.breakdown.retrieval_relevance.weighted,
      color: getChartColor(confidence.breakdown.retrieval_relevance.score),
      description: "How relevant were the retrieved chunks",
    },
    {
      name: "Faithfulness",
      score: confidence.breakdown.faithfulness.score,
      weight: confidence.breakdown.faithfulness.weight,
      weighted: confidence.breakdown.faithfulness.weighted,
      color: getChartColor(confidence.breakdown.faithfulness.score),
      description: "Inverse of hallucination score",
    },
    {
      name: "Context Coverage",
      score: confidence.breakdown.context_coverage.score,
      weight: confidence.breakdown.context_coverage.weight,
      weighted: confidence.breakdown.context_coverage.weighted,
      color: getChartColor(confidence.breakdown.context_coverage.score),
      description: "Did context fully cover the question",
    },
    {
      name: "Coherence",
      score: confidence.breakdown.coherence.score,
      weight: confidence.breakdown.coherence.weight,
      weighted: confidence.breakdown.coherence.weighted,
      color: getChartColor(confidence.breakdown.coherence.score),
      description: "Is the answer well structured",
    },
  ];

  const sumWeighted = chartData.reduce((acc, item) => acc + item.weighted, 0);

  return (
    <div className="mt-6 mb-2">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gray-900 border border-gray-800 p-4 rounded-xl">
        <div className="flex items-center space-x-4">
          <div className="relative w-16 h-16 flex-shrink-0">
            <svg className="w-16 h-16 transform -rotate-90">
              <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="6" fill="transparent" className="text-gray-800" />
              <circle
                cx="32"
                cy="32"
                r="28"
                stroke="currentColor"
                strokeWidth="6"
                fill="transparent"
                strokeDasharray="175.9"
                strokeDashoffset={175.9 - (175.9 * confidence.confidence_percentage) / 100}
                className={confidence.confidence_color === "green" ? "text-green-500" :
                          confidence.confidence_color === "yellow" ? "text-yellow-500" :
                          confidence.confidence_color === "orange" ? "text-orange-500" : "text-red-500"}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-sm font-bold text-white">{confidence.confidence_percentage}%</span>
            </div>
          </div>
          <div>
            <div className={cn("text-xs font-bold uppercase tracking-wider mb-1 px-2 py-0.5 rounded border inline-block", getBadgeColor(confidence.confidence_level))}>
              {confidence.confidence_badge}
            </div>
            <p className="text-sm text-gray-400">Overall response confidence</p>
          </div>
        </div>
        
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center space-x-1 text-sm text-indigo-400 hover:text-indigo-300 font-medium px-3 py-2 rounded-lg hover:bg-indigo-500/10 transition-colors"
        >
          <span>Score Breakdown</span>
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {confidence.disclaimer && (
        <div className="mt-3 flex items-start space-x-3 bg-red-500/10 border border-red-500/20 p-4 rounded-xl text-red-400 text-sm">
          {confidence.confidence_level === "VERY_LOW" ? (
            <ShieldAlert className="w-5 h-5 flex-shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          )}
          <p>{confidence.disclaimer}</p>
        </div>
      )}

      {expanded && (
        <div className="mt-3 bg-gray-900 border border-gray-800 p-6 rounded-xl animate-in fade-in slide-in-from-top-4 duration-300">
          <h4 className="text-sm font-semibold text-gray-400 mb-6 uppercase tracking-wider">4-Factor Score Breakdown</h4>
          
          <div className="space-y-6">
            {chartData.map((item, idx) => (
              <div key={idx}>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="text-sm font-medium text-gray-200">{item.name}</span>
                    <span className="ml-2 text-xs text-gray-500">({(item.weight * 100).toFixed(0)}% weight)</span>
                  </div>
                  <div className="text-sm font-mono">
                    <span className="text-gray-400">{item.score.toFixed(2)}</span>
                    <span className="text-gray-600 mx-2">&times; {item.weight.toFixed(2)} =</span>
                    <span className="text-indigo-400 font-bold">{item.weighted.toFixed(2)}</span>
                  </div>
                </div>
                
                <div className="h-2 w-full bg-gray-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all duration-1000 ease-out" 
                    style={{ width: `${item.score * 100}%`, backgroundColor: item.color }}
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500">{item.description}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 pt-4 border-t border-gray-800 flex items-center justify-between bg-gray-950 p-4 rounded-lg">
            <span className="text-sm text-gray-400 font-medium">Final Formula</span>
            <div className="font-mono text-sm">
              <span className="text-gray-500">(</span>
              {chartData.map((d, i) => (
                <span key={i}>
                  <span className="text-indigo-400">{d.weighted.toFixed(2)}</span>
                  {i < chartData.length - 1 && <span className="text-gray-600 mx-1">+</span>}
                </span>
              ))}
              <span className="text-gray-500"> ) &times; 100 = </span>
              <span className="text-white font-bold">{Math.round(sumWeighted * 100)}%</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
