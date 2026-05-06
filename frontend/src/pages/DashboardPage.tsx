import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { StatCard } from '@/components/ui/StatCard';
import { Badge } from '@/components/ui/Badge';
import { ConfidenceBadge } from '@/components/ui/ConfidenceBadge';
import { Search, UploadCloud, Activity, FileText, BrainCircuit, ShieldAlert, Zap, TrendingUp, Clock, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';

export default function DashboardPage() {
  const navigate = useNavigate();

  // Mock data for the dashboard
  const recentQueries = [
    { id: '1', query: 'What was the Q3 revenue for North America?', type: 'factual', confidence: 94, time: '2 mins ago' },
    { id: '2', query: 'Compare European growth vs Asian growth margins', type: 'analytical', confidence: 82, time: '1 hour ago' },
    { id: '3', query: 'Summarize the legal risks mentioned in section 4', type: 'summary', confidence: 78, time: '3 hours ago' },
    { id: '4', query: 'What is the stock price of Apple?', type: 'oos', confidence: 0, time: 'Yesterday' },
    { id: '5', query: 'List all competitors mentioned in the report', type: 'factual', confidence: 88, time: 'Yesterday' },
  ];

  const recentDocs = [
    { id: 'doc1', name: 'Q3_Financial_Report_Final.pdf', date: 'Oct 24, 2024', chunks: 245 },
    { id: 'doc2', name: 'Competitor_Analysis_2024.docx', date: 'Oct 22, 2024', chunks: 128 },
    { id: 'doc3', name: 'Legal_Risk_Assessment.pdf', date: 'Oct 15, 2024', chunks: 56 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Overview</h1>
          <p className="text-sm text-text-secondary">Track your agent's performance and recent activity.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={() => navigate('/documents')}>
            <UploadCloud className="w-4 h-4 mr-2" /> Upload
          </Button>
          <Button variant="gradient" onClick={() => navigate('/workspace')}>
            <Search className="w-4 h-4 mr-2" /> Ask Question
          </Button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Total Queries Run" 
          value="1,248" 
          icon={<BrainCircuit className="w-4 h-4" />}
          delta={{ value: "12%", trend: "up", label: "vs last month" }}
        />
        <StatCard 
          title="Avg Confidence Score" 
          value="86.4%" 
          icon={<Activity className="w-4 h-4" />}
          delta={{ value: "4.2%", trend: "up", label: "improvement" }}
        />
        <StatCard 
          title="Hallucinations Caught" 
          value="342" 
          icon={<ShieldAlert className="w-4 h-4" />}
          delta={{ value: "prevented", trend: "neutral" }}
        />
        <StatCard 
          title="Documents Indexed" 
          value="24" 
          icon={<FileText className="w-4 h-4" />}
          delta={{ value: "1,402 chunks", trend: "neutral" }}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Recent Queries - 2 cols wide on large screens */}
        <div className="lg:col-span-2 bg-secondary border border-border-default rounded-xl shadow-sm overflow-hidden flex flex-col">
          <div className="p-5 border-b border-border-subtle flex items-center justify-between">
            <h2 className="text-base font-semibold">Recent Activity</h2>
            <Button variant="ghost" size="sm" onClick={() => navigate('/workspace')} className="text-xs">
              View All <ChevronRight className="w-3 h-3 ml-1" />
            </Button>
          </div>
          <div className="flex-1 overflow-auto">
            <div className="divide-y divide-border-subtle">
              {recentQueries.map((q, i) => (
                <motion.div 
                  key={q.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  onClick={() => navigate('/workspace')}
                  className="p-4 hover:bg-tertiary transition-colors cursor-pointer group flex items-center gap-4"
                >
                  <div className="hidden sm:block shrink-0">
                    {q.type === 'factual' && <div className="w-8 h-8 rounded-full bg-semantic-info/10 flex items-center justify-center text-semantic-info"><Search className="w-4 h-4" /></div>}
                    {q.type === 'analytical' && <div className="w-8 h-8 rounded-full bg-brand-secondary/10 flex items-center justify-center text-brand-secondary"><TrendingUp className="w-4 h-4" /></div>}
                    {q.type === 'summary' && <div className="w-8 h-8 rounded-full bg-semantic-warning/10 flex items-center justify-center text-semantic-warning"><FileText className="w-4 h-4" /></div>}
                    {q.type === 'oos' && <div className="w-8 h-8 rounded-full bg-semantic-danger/10 flex items-center justify-center text-semantic-danger"><ShieldAlert className="w-4 h-4" /></div>}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate group-hover:text-brand-primary transition-colors">
                      {q.query}
                    </p>
                    <div className="flex items-center mt-1.5 gap-2">
                      <Badge variant={q.type as any} className="uppercase text-[10px] px-1.5 py-0">
                        {q.type}
                      </Badge>
                      <div className="flex items-center text-xs text-text-muted">
                        <Clock className="w-3 h-3 mr-1" /> {q.time}
                      </div>
                    </div>
                  </div>
                  
                  <div className="shrink-0 flex items-center gap-3">
                    {q.confidence > 0 ? (
                      <ConfidenceBadge percentage={q.confidence} size="sm" />
                    ) : (
                      <Badge variant="oos" className="uppercase text-[10px]">Abstained</Badge>
                    )}
                    <ChevronRight className="w-4 h-4 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity -translate-x-2 group-hover:translate-x-0 duration-200" />
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* Agent Performance & Docs - 1 col wide */}
        <div className="space-y-6">
          <div className="bg-brand-primary/10 border border-brand-primary/20 rounded-xl p-5 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Zap className="w-24 h-24 text-brand-primary" />
            </div>
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">🔥</span>
                <h3 className="font-semibold text-brand-primary">12 Query Streak</h3>
              </div>
              <p className="text-sm text-text-secondary leading-relaxed">
                The agent has returned 12 consecutive answers with High Confidence (&gt;90%).
              </p>
            </div>
          </div>

          <div className="bg-secondary border border-border-default rounded-xl shadow-sm flex flex-col">
            <div className="p-5 border-b border-border-subtle flex items-center justify-between">
              <h2 className="text-base font-semibold">Recent Documents</h2>
            </div>
            <div className="p-2">
              {recentDocs.map((doc) => (
                <div key={doc.id} className="flex items-center p-3 rounded-lg hover:bg-tertiary transition-colors cursor-pointer group">
                  <div className="p-2 bg-primary border border-border-subtle rounded text-brand-primary mr-3">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">{doc.name}</p>
                    <p className="text-xs text-text-muted mt-0.5">{doc.date} • {doc.chunks} chunks</p>
                  </div>
                </div>
              ))}
              <Button variant="ghost" className="w-full mt-2 text-xs" onClick={() => navigate('/documents')}>
                View Document Library <ChevronRight className="w-3 h-3 ml-1" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
