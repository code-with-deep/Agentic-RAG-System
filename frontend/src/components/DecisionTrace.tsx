import { VerticalTimeline, VerticalTimelineElement } from "react-vertical-timeline-component";
import "react-vertical-timeline-component/style.min.css";
import type {  TraceStep  } from '../types';
import { Network, Search, Cpu, CheckCircle, AlertTriangle, RefreshCw } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { useState } from "react";

interface DecisionTraceProps {
  trace: TraceStep[];
}

export function DecisionTrace({ trace }: DecisionTraceProps) {
  const [expandedSteps, setExpandedSteps] = useState<Record<number, boolean>>({});

  const toggleStep = (stepNumber: number) => {
    setExpandedSteps((prev) => ({ ...prev, [stepNumber]: !prev[stepNumber] }));
  };

  const getIconForStep = (stepName: any) => {
    const name = stepName.toLowerCase();
    if (name.includes("classifi") || name.includes("rout")) return <Network />;
    if (name.includes("retriev") || name.includes("crag")) return <Search />;
    if (name.includes("generat") || name.includes("hallucinat")) return <Cpu />;
    if (name.includes("confidenc")) return <CheckCircle />;
    if (name.includes("fallback")) return <AlertTriangle />;
    if (name.includes("retry") || name.includes("refine")) return <RefreshCw />;
    return <Cpu />;
  };

  const getColorForStep = (stepName: any) => {
    const name = stepName.toLowerCase();
    if (name.includes("classifi") || name.includes("rout")) return "#8b5cf6"; // purple
    if (name.includes("retriev") || name.includes("crag")) return "#3b82f6"; // blue
    if (name.includes("generat") || name.includes("hallucinat")) return "#f97316"; // orange
    if (name.includes("confidenc")) return "#22c55e"; // green
    if (name.includes("fallback")) return "#ef4444"; // red
    if (name.includes("retry") || name.includes("refine")) return "#eab308"; // yellow
    return "#64748b"; // gray
  };

  const totalTime = trace.reduce((acc, step) => acc + step.time_taken_ms, 0);
  const retriesCount = trace.filter((s) => s.step_name.toLowerCase().includes("retry")).length;
  const fallbacksCount = trace.filter((s) => s.step_name.toLowerCase().includes("fallback")).length;

  const chartData = trace.map((step) => ({
    name: `Step ${step.step_number}`,
    time: step.time_taken_ms,
    fullName: step.step_name,
    color: getColorForStep(step.step_name),
  }));

  return (
    <div className="mt-8 pt-8 border-t border-gray-800">
      <div className="flex items-center justify-between mb-8">
        <h3 className="text-xl font-bold text-white">Agent Decision Trace</h3>
        <div className="flex items-center space-x-2 text-sm text-gray-400 bg-gray-900 px-4 py-2 rounded-lg border border-gray-800">
          <span>{trace.length} steps</span>
          <span>&middot;</span>
          <span>{(totalTime / 1000).toFixed(2)}s total</span>
          <span>&middot;</span>
          <span>{retriesCount} retries</span>
          <span>&middot;</span>
          <span>{fallbacksCount} fallbacks</span>
        </div>
      </div>

      <div className="mb-12">
        <VerticalTimeline layout="1-column-left" lineColor="#334155">
          {trace.map((step) => {
            const isRetry = step.step_name.toLowerCase().includes("retry");
            const isFallback = step.step_name.toLowerCase().includes("fallback");
            const isExpanded = expandedSteps[step.step_number];

            return (
              <VerticalTimelineElement
                key={step.step_number}
                className="vertical-timeline-element--work"
                contentStyle={{ 
                  background: isFallback ? '#450a0a' : isRetry ? '#422006' : '#1e293b', 
                  color: '#fff',
                  border: `1px solid ${isFallback ? '#991b1b' : isRetry ? '#ca8a04' : '#334155'}`,
                  boxShadow: 'none',
                  padding: '1.5rem',
                  borderRadius: '0.75rem'
                }}
                contentArrowStyle={{ borderRight: `7px solid ${isFallback ? '#450a0a' : isRetry ? '#422006' : '#1e293b'}` }}
                iconStyle={{ background: getColorForStep(step.step_name), color: '#fff', boxShadow: 'none' }}
                icon={getIconForStep(step.step_name)}
              >
                <div 
                  className="cursor-pointer"
                  onClick={() => toggleStep(step.step_number)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      {isRetry && (
                        <span className="inline-block px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs font-bold rounded mb-2 border border-yellow-500/30">
                          ↩ Retry attempt
                        </span>
                      )}
                      {isFallback && (
                        <span className="inline-block px-2 py-1 bg-red-500/20 text-red-400 text-xs font-bold rounded mb-2 border border-red-500/30">
                          ⚠ Fallback triggered
                        </span>
                      )}
                      <h4 className="text-lg font-bold text-gray-100 flex items-center">
                        <span className="text-gray-500 mr-2">#{step.step_number}</span>
                        {step.step_name}
                      </h4>
                    </div>
                    <span className="text-xs font-mono bg-black/30 px-2 py-1 rounded text-gray-300 border border-white/10">
                      {step.time_taken_ms}ms
                    </span>
                  </div>
                  
                  <p className="text-sm font-medium text-indigo-300 mt-0 mb-3">{step.decision}</p>
                  <p className="text-sm text-gray-400 leading-relaxed">{step.reasoning}</p>

                  <div className="text-center mt-2">
                    <span className="text-xs text-gray-500 hover:text-gray-300 transition-colors">
                      {isExpanded ? "Hide details" : "Show details"}
                    </span>
                  </div>
                </div>

                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-white/10 space-y-4 text-sm animate-in fade-in slide-in-from-top-4 duration-300">
                    {step.alternatives_considered && step.alternatives_considered.length > 0 && (
                      <div>
                        <span className="text-gray-500 text-xs uppercase tracking-wider font-bold block mb-2">Alternatives Considered</span>
                        <div className="flex flex-wrap gap-2">
                          {step.alternatives_considered.map((alt, i) => (
                            <span key={i} className="px-2 py-1 bg-black/20 rounded text-gray-400 text-xs border border-white/5">
                              {alt}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {step.input_summary && Object.keys(step.input_summary).length > 0 && (
                      <div>
                        <span className="text-gray-500 text-xs uppercase tracking-wider font-bold block mb-2">Input Summary</span>
                        <pre className="bg-black/30 p-3 rounded overflow-x-auto text-xs text-green-300 font-mono border border-white/5">
                          {JSON.stringify(step.input_summary, null, 2)}
                        </pre>
                      </div>
                    )}
                    
                    {step.output_summary && Object.keys(step.output_summary).length > 0 && (
                      <div>
                        <span className="text-gray-500 text-xs uppercase tracking-wider font-bold block mb-2">Output Summary</span>
                        <pre className="bg-black/30 p-3 rounded overflow-x-auto text-xs text-blue-300 font-mono border border-white/5">
                          {JSON.stringify(step.output_summary, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </VerticalTimelineElement>
            );
          })}
        </VerticalTimeline>
      </div>

      {trace.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h4 className="text-sm font-semibold text-gray-400 mb-6 uppercase tracking-wider">Time Breakdown per Step</h4>
          <div className="h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 30, left: 20, bottom: 0 }}>
                <XAxis type="number" unit="ms" stroke="#475569" fontSize={12} tickFormatter={(val) => `${val}`} />
                <YAxis dataKey="name" type="category" stroke="#475569" fontSize={12} width={60} />
                <Tooltip 
                  cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.5rem' }}
                  itemStyle={{ color: '#f8fafc' }}
                  formatter={(value: any, _name: any, props: any) => [`${value}ms`, props.payload.fullName]}
                  labelStyle={{ display: 'none' }}
                />
                <Bar dataKey="time" radius={[0, 4, 4, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
