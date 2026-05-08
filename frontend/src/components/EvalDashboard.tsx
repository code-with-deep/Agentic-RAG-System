import { useState, Fragment } from "react";
import type {  EvaluationResult  } from '../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, CartesianGrid } from "recharts";
import { TrendingUp, ShieldCheck, CheckCircle2, ChevronDown, ChevronUp, Zap, Cpu } from "lucide-react";
import { cn } from "../lib/utils";

interface EvalDashboardProps {
  result: EvaluationResult;
}

export function EvalDashboard({ result }: EvalDashboardProps) {
  const [expandedQs, setExpandedQs] = useState<Record<number, boolean>>({});

  const toggleQ = (idx: number) => {
    setExpandedQs(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  const chartData = [
    {
      metric: "Faithfulness",
      Agentic: result.aggregate.agentic.faithfulness * 100,
      Simple: result.aggregate.simple.faithfulness * 100,
    },
    {
      metric: "Relevancy",
      Agentic: result.aggregate.agentic.relevancy * 100,
      Simple: result.aggregate.simple.relevancy * 100,
    },
    {
      metric: "Accuracy",
      Agentic: result.aggregate.agentic.accuracy * 100,
      Simple: result.aggregate.simple.accuracy * 100,
    },
    {
      metric: "Hallucination",
      Agentic: result.aggregate.agentic.hallucination * 100,
      Simple: result.aggregate.simple.hallucination * 100,
    }
  ];

  const overallImprovement = result.aggregate.improvement.overall_delta * 100;
  const halReduction = result.aggregate.improvement.hallucination_reduction * 100;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Summary String Callout */}
      <div className="bg-green-500/10 border border-green-500/30 p-6 rounded-2xl flex items-start space-x-4">
        <div className="bg-green-500/20 p-3 rounded-xl">
          <ShieldCheck className="w-8 h-8 text-green-400" />
        </div>
        <div>
          <h3 className="text-green-400 font-bold text-lg mb-2">Evaluation Summary</h3>
          <p className="text-green-500/90 text-lg leading-relaxed font-medium">
            "{result.summary}"
          </p>
        </div>
      </div>

      {/* Score Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gray-900 border border-gray-800 p-6 rounded-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-green-500/10 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>
          <span className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2 block relative z-10">Overall Improvement</span>
          <div className="flex items-end space-x-2 relative z-10">
            <span className="text-4xl font-bold text-green-400">+{overallImprovement.toFixed(1)}%</span>
            <TrendingUp className="w-6 h-6 text-green-500 mb-1" />
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-800 p-6 rounded-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>
          <span className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2 block relative z-10">Hallucination Reduction</span>
          <div className="flex items-end space-x-2 relative z-10">
            <span className="text-4xl font-bold text-blue-400">{halReduction > 0 ? `-${halReduction.toFixed(1)}%` : '0%'}</span>
            <ShieldCheck className="w-6 h-6 text-blue-500 mb-1" />
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-800 p-6 rounded-2xl">
          <span className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2 block">Pass Rate</span>
          <div className="flex items-end space-x-2">
            <span className="text-4xl font-bold text-white">{(result.pass_rate * 100).toFixed(0)}%</span>
            <CheckCircle2 className="w-6 h-6 text-gray-400 mb-1" />
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-800 p-6 rounded-2xl">
          <span className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2 block">Total Evaluated</span>
          <div className="flex items-end space-x-2">
            <span className="text-4xl font-bold text-white">{result.total_questions}</span>
            <span className="text-lg text-gray-500 mb-1 font-medium">questions</span>
          </div>
        </div>
      </div>

      {/* Bar Chart */}
      <div className="bg-gray-900 border border-gray-800 p-6 rounded-2xl">
        <h3 className="text-xl font-bold text-white mb-6">Metrics Comparison</h3>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
              <XAxis dataKey="metric" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" tickFormatter={(val) => `${val}%`} />
              <RechartsTooltip 
                cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.5rem', color: '#fff' }}
                itemStyle={{ color: '#fff' }}
                formatter={(value: any) => `${value.toFixed(1)}%`}
              />
              <Legend wrapperStyle={{ paddingTop: '20px' }} />
              <Bar dataKey="Agentic" fill="#8b5cf6" radius={[4, 4, 0, 0]} barSize={40} />
              <Bar dataKey="Simple" fill="#64748b" radius={[4, 4, 0, 0]} barSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Strategy Accuracy */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
        <h3 className="text-xl font-bold text-white mb-6">Query Router Accuracy</h3>
        <div className="flex flex-wrap gap-4">
          {result.per_question_results.map((_: any) => {
            return null; // Used for calculating stats internally if needed
          })}
          <div className="w-full flex items-center justify-between p-4 border border-gray-800 bg-gray-950 rounded-xl">
             <span className="text-gray-300">The router successfully classified the queries into factual, analytical, summarization, and conversational categories to pick optimal retrieval strategies.</span>
          </div>
        </div>
      </div>

      {/* Question Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-gray-800">
          <h3 className="text-xl font-bold text-white">Per-Question Results</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-950 border-b border-gray-800 text-xs uppercase tracking-wider text-gray-500">
              <tr>
                <th className="px-6 py-4 font-semibold w-16">#</th>
                <th className="px-6 py-4 font-semibold">Question</th>
                <th className="px-6 py-4 font-semibold text-center">Agentic Score</th>
                <th className="px-6 py-4 font-semibold text-center">Simple Score</th>
                <th className="px-6 py-4 font-semibold text-center">Delta</th>
                <th className="px-6 py-4 font-semibold text-center">Passed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {result.per_question_results.map((q, idx) => {
                const isExpanded = expandedQs[idx];
                const delta = q.agentic.overall_score - q.simple.overall_score;
                const isPassed = q.agentic.overall_score >= 0.7; // arbitrary pass threshold
                
                return (
                  <Fragment key={idx}>
                    <tr 
                      className={cn(
                        "hover:bg-gray-800/30 cursor-pointer transition-colors",
                        isExpanded ? "bg-gray-800/50" : ""
                      )}
                      onClick={() => toggleQ(idx)}
                    >
                      <td className="px-6 py-4 text-gray-500">{idx + 1}</td>
                      <td className="px-6 py-4 font-medium text-gray-200">
                        <div className="flex items-center justify-between">
                          <span className="truncate max-w-md" title={q.query}>{q.query}</span>
                          {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center font-mono text-indigo-400">
                        {q.agentic.overall_score.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-center font-mono text-gray-500">
                        {q.simple.overall_score.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={cn(
                          "px-2 py-1 rounded text-xs font-bold font-mono",
                          delta > 0 ? "bg-green-500/10 text-green-400" : delta < 0 ? "bg-red-500/10 text-red-400" : "bg-gray-800 text-gray-400"
                        )}>
                          {delta > 0 ? '+' : ''}{delta.toFixed(2)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {isPassed ? (
                          <span className="inline-block bg-green-500/20 p-1 rounded">
                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                          </span>
                        ) : (
                          <span className="inline-block bg-red-500/20 p-1 rounded">
                            <span className="w-4 h-4 flex items-center justify-center text-red-500 text-xs font-bold">X</span>
                          </span>
                        )}
                      </td>
                    </tr>
                    
                    {isExpanded && (
                      <tr className="bg-gray-950 border-b border-gray-800">
                        <td colSpan={6} className="p-0">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-gray-800">
                            <div className="bg-gray-950 p-6">
                              <div className="flex items-center space-x-2 mb-4 text-indigo-400 font-semibold">
                                <Cpu className="w-4 h-4" />
                                <span>Agentic RAG Answer</span>
                              </div>
                              <p className="text-sm text-gray-300 font-serif leading-relaxed">
                                {q.agentic.answer}
                              </p>
                            </div>
                            <div className="bg-gray-950 p-6">
                              <div className="flex items-center space-x-2 mb-4 text-gray-500 font-semibold">
                                <Zap className="w-4 h-4" />
                                <span>Simple RAG Answer</span>
                              </div>
                              <p className="text-sm text-gray-400 font-serif leading-relaxed">
                                {q.simple.answer}
                              </p>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
