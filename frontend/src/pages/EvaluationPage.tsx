import React from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { BarChart2, Activity, ShieldAlert, Cpu } from 'lucide-react';
import { StatCard } from '../components/ui/StatCard';

export default function EvaluationPage() {
  const metrics = [
    { name: 'Faithfulness', value: 0.94, desc: 'How well the answer is grounded in the retrieved chunks.' },
    { name: 'Answer Relevance', value: 0.91, desc: 'How well the answer addresses the actual user query.' },
    { name: 'Context Precision', value: 0.88, desc: 'Are the retrieved chunks actually useful?' },
    { name: 'Hallucination Rate', value: 0.02, desc: 'Percentage of claims that could not be verified.' }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Ragas Benchmarks</h1>
          <p className="text-sm text-text-secondary">System-wide evaluation metrics based on the Ragas framework.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Overall Score" 
          value="91.2/100" 
          icon={<BarChart2 className="w-4 h-4 text-brand-primary" />}
          delta={{ value: "+2.4", trend: "up" }}
        />
        <StatCard 
          title="Avg Latency" 
          value="2.1s" 
          icon={<Activity className="w-4 h-4 text-brand-secondary" />}
          delta={{ value: "-0.3s", trend: "down", label: "faster" }}
        />
        <StatCard 
          title="Fallback Rate" 
          value="8.4%" 
          icon={<Cpu className="w-4 h-4 text-semantic-warning" />}
          delta={{ value: "stable", trend: "neutral" }}
        />
        <StatCard 
          title="Hallucinations" 
          value="2.0%" 
          icon={<ShieldAlert className="w-4 h-4 text-semantic-danger" />}
          delta={{ value: "-1.1%", trend: "down", label: "improvement" }}
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="col-span-1">
          <div className="p-5 border-b border-border-subtle flex justify-between items-center bg-tertiary">
            <h3 className="font-semibold">Core Metrics Breakdown</h3>
          </div>
          <CardContent className="p-6">
            <div className="space-y-6">
              {metrics.map((metric, i) => (
                <div key={i}>
                  <div className="flex justify-between mb-2">
                    <div>
                      <span className="font-medium text-text-primary text-sm">{metric.name}</span>
                      <p className="text-xs text-text-muted mt-0.5">{metric.desc}</p>
                    </div>
                    <span className="font-mono text-sm">{metric.value.toFixed(2)}</span>
                  </div>
                  <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${metric.name === 'Hallucination Rate' ? 'bg-semantic-danger' : 'bg-brand-primary'}`} 
                      style={{ width: `${metric.value * 100}%` }} 
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-1">
          <div className="p-5 border-b border-border-subtle flex justify-between items-center bg-tertiary">
            <h3 className="font-semibold">Routing Distribution</h3>
          </div>
          <CardContent className="p-6 flex flex-col items-center justify-center min-h-[300px]">
            <div className="w-48 h-48 rounded-full border-[16px] border-secondary relative flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-[16px] border-transparent border-t-brand-primary border-r-brand-primary -rotate-45"></div>
              <div className="absolute inset-0 rounded-full border-[16px] border-transparent border-b-brand-secondary rotate-12"></div>
              <div className="absolute inset-0 rounded-full border-[16px] border-transparent border-l-semantic-warning -rotate-12"></div>
              
              <div className="text-center">
                <span className="text-3xl font-bold text-text-primary">1.2k</span>
                <span className="block text-xs text-text-muted">Total Queries</span>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-x-8 gap-y-4 mt-8 w-full">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-brand-primary" />
                <span className="text-sm text-text-secondary">Factual (55%)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-brand-secondary" />
                <span className="text-sm text-text-secondary">Analytical (25%)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-semantic-warning" />
                <span className="text-sm text-text-secondary">Summary (15%)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-border-strong" />
                <span className="text-sm text-text-secondary">OOS / Fallback (5%)</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
