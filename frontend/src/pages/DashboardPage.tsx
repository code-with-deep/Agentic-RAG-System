import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { StatCard } from '@/components/ui/StatCard';
import { Badge } from '@/components/ui/Badge';
import { ConfidenceBadge } from '@/components/ui/ConfidenceBadge';
import { Search, UploadCloud, Activity, FileText, BrainCircuit, ShieldAlert, Zap, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { useStore } from '@/store/useStore';

export default function DashboardPage() {
  const navigate = useNavigate();
  const { stats, documents, fetchStats, fetchDocuments, isLoadingDocuments } = useStore();

  useEffect(() => {
    fetchStats();
    fetchDocuments();
  }, [fetchStats, fetchDocuments]);

  // Process documents for display
  const recentDocs = documents.slice(0, 5).map(doc => {
    const totalChunks = doc.chunk_counts ? Object.values(doc.chunk_counts).reduce((a: number, b: number) => a + b, 0) : 0;
    return {
      id: doc.doc_id,
      name: doc.filename,
      date: doc.upload_date ? new Date(doc.upload_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Unknown',
      chunks: totalChunks,
    };
  });

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
          value={stats?.total_queries?.toString() || "0"} 
          icon={<BrainCircuit className="w-4 h-4" />}
          delta={{ value: "all time", trend: "neutral" }}
        />
        <StatCard 
          title="Avg Confidence Score" 
          value={stats?.avg_confidence ? `${(stats.avg_confidence * 100).toFixed(1)}%` : "0%"} 
          icon={<Activity className="w-4 h-4" />}
          delta={{ value: stats?.avg_confidence && stats.avg_confidence > 0.8 ? "high" : "moderate", trend: stats?.avg_confidence && stats.avg_confidence > 0.8 ? "up" : "neutral" }}
        />
        <StatCard 
          title="Hallucination Catch Rate" 
          value={stats?.hallucination_catch_rate ? `${(stats.hallucination_catch_rate * 100).toFixed(1)}%` : "0%"} 
          icon={<ShieldAlert className="w-4 h-4" />}
          delta={{ value: "prevented", trend: "neutral" }}
        />
        <StatCard 
          title="Documents Indexed" 
          value={documents.length.toString()} 
          icon={<FileText className="w-4 h-4" />}
          delta={{ value: `${recentDocs.reduce((a, b) => a + b.chunks, 0)} chunks`, trend: "neutral" }}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Quick Actions - 2 cols wide */}
        <div className="lg:col-span-2 bg-secondary border border-border-default rounded-xl shadow-sm overflow-hidden flex flex-col">
          <div className="p-5 border-b border-border-subtle flex items-center justify-between">
            <h2 className="text-base font-semibold">Quick Actions</h2>
          </div>
          <div className="flex-1 p-6">
            <div className="grid sm:grid-cols-2 gap-4">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                onClick={() => navigate('/workspace')}
                className="p-5 bg-tertiary border border-border-subtle rounded-xl hover:border-brand-primary/40 transition-all cursor-pointer group"
              >
                <div className="w-10 h-10 rounded-lg bg-brand-primary/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <Search className="w-5 h-5 text-brand-primary" />
                </div>
                <h3 className="font-semibold text-text-primary mb-1">Ask a Question</h3>
                <p className="text-xs text-text-muted">Query your documents using the agentic RAG pipeline with hallucination detection.</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                onClick={() => navigate('/documents')}
                className="p-5 bg-tertiary border border-border-subtle rounded-xl hover:border-brand-primary/40 transition-all cursor-pointer group"
              >
                <div className="w-10 h-10 rounded-lg bg-brand-secondary/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <UploadCloud className="w-5 h-5 text-brand-secondary" />
                </div>
                <h3 className="font-semibold text-text-primary mb-1">Upload Document</h3>
                <p className="text-xs text-text-muted">Add PDF, DOCX, TXT, or MD files to your knowledge base.</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                onClick={() => navigate('/compare')}
                className="p-5 bg-tertiary border border-border-subtle rounded-xl hover:border-brand-primary/40 transition-all cursor-pointer group"
              >
                <div className="w-10 h-10 rounded-lg bg-semantic-warning/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <BrainCircuit className="w-5 h-5 text-semantic-warning" />
                </div>
                <h3 className="font-semibold text-text-primary mb-1">Compare Pipelines</h3>
                <p className="text-xs text-text-muted">Run queries through both Simple and Agentic RAG side-by-side.</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                onClick={() => navigate('/evaluation')}
                className="p-5 bg-tertiary border border-border-subtle rounded-xl hover:border-brand-primary/40 transition-all cursor-pointer group"
              >
                <div className="w-10 h-10 rounded-lg bg-semantic-success/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <Activity className="w-5 h-5 text-semantic-success" />
                </div>
                <h3 className="font-semibold text-text-primary mb-1">View Benchmarks</h3>
                <p className="text-xs text-text-muted">See RAGAS evaluation metrics and routing distribution.</p>
              </motion.div>
            </div>
          </div>
        </div>

        {/* Agent Performance & Docs - 1 col wide */}
        <div className="space-y-6">
          {stats && stats.total_queries > 0 && (
            <div className="bg-brand-primary/10 border border-brand-primary/20 rounded-xl p-5 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <Zap className="w-24 h-24 text-brand-primary" />
              </div>
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">🔥</span>
                  <h3 className="font-semibold text-brand-primary">System Active</h3>
                </div>
                <p className="text-sm text-text-secondary leading-relaxed">
                  {stats.total_queries} queries processed with {(stats.avg_confidence * 100).toFixed(1)}% average confidence. 
                  Avg latency: {(stats.avg_latency_ms / 1000).toFixed(1)}s.
                </p>
              </div>
            </div>
          )}

          <div className="bg-secondary border border-border-default rounded-xl shadow-sm flex flex-col">
            <div className="p-5 border-b border-border-subtle flex items-center justify-between">
              <h2 className="text-base font-semibold">Recent Documents</h2>
            </div>
            <div className="p-2">
              {isLoadingDocuments && recentDocs.length === 0 ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-brand-primary"></div>
                </div>
              ) : recentDocs.length === 0 ? (
                <div className="text-center py-8 text-sm text-text-muted">
                  No documents uploaded yet.
                </div>
              ) : (
                recentDocs.map((doc) => (
                  <div key={doc.id} className="flex items-center p-3 rounded-lg hover:bg-tertiary transition-colors cursor-pointer group" onClick={() => navigate('/documents')}>
                    <div className="p-2 bg-primary border border-border-subtle rounded text-brand-primary mr-3">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text-primary truncate">{doc.name}</p>
                      <p className="text-xs text-text-muted mt-0.5">{doc.date} • {doc.chunks} chunks</p>
                    </div>
                  </div>
                ))
              )}
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
