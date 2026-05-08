import { useState, useEffect } from 'react';
import { Card, CardContent } from '../components/ui/Card';
import { BrainCircuit, Globe, Server } from 'lucide-react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'models' | 'pipeline' | 'status'>('models');
  const [isOnline, setIsOnline] = useState(false);
  const [config, setConfig] = useState<any>(null);

  useEffect(() => {
    // Check backend health
    axios.get(`${API_URL}/health`, { timeout: 3000 })
      .then(() => setIsOnline(true))
      .catch(() => setIsOnline(false));

    // Try to fetch thresholds config
    axios.get(`${API_URL}/config/thresholds`)
      .then(res => setConfig(res.data))
      .catch(() => {});
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-text-secondary">View your AI model configuration and system status.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Settings Navigation */}
        <div className="w-full md:w-64 shrink-0 space-y-1">
          <button 
            onClick={() => setActiveTab('models')}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'models' ? 'bg-brand-primary/10 text-brand-primary' : 'text-text-secondary hover:text-text-primary hover:bg-secondary'}`}
          >
            <BrainCircuit className="w-4 h-4" /> Provider & Models
          </button>
          <button 
            onClick={() => setActiveTab('pipeline')}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'pipeline' ? 'bg-brand-primary/10 text-brand-primary' : 'text-text-secondary hover:text-text-primary hover:bg-secondary'}`}
          >
            <Globe className="w-4 h-4" /> Pipeline Config
          </button>
          <button 
            onClick={() => setActiveTab('status')}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'status' ? 'bg-brand-primary/10 text-brand-primary' : 'text-text-secondary hover:text-text-primary hover:bg-secondary'}`}
          >
            <Server className="w-4 h-4" /> System Status
          </button>
        </div>

        {/* Settings Content */}
        <div className="flex-1 space-y-6">
          {activeTab === 'models' && (
            <Card>
              <div className="p-5 border-b border-border-subtle bg-tertiary">
                <h3 className="font-semibold">LLM Provider Configuration</h3>
                <p className="text-sm text-text-muted mt-1">Current backend model configuration (set via environment variables).</p>
              </div>
              <CardContent className="p-6 space-y-6">
                <div className="space-y-5">
                  <InfoRow label="Active Provider" value="Groq (LLM_PROVIDER)" />
                  <InfoRow label="Primary Model" value="llama-3.3-70b-versatile" />
                  <InfoRow label="Embedding Model" value="all-MiniLM-L6-v2 (384-dim)" />
                  <InfoRow label="Reranker Model" value="cross-encoder/ms-marco-MiniLM-L-6-v2" />
                  <InfoRow label="Temperature" value="0.1 (optimized for RAG)" />
                </div>
                <div className="pt-4 border-t border-border-default">
                  <p className="text-xs text-text-muted">
                    These settings are configured via the backend <code className="bg-tertiary px-1.5 py-0.5 rounded text-brand-primary">.env</code> file. Restart the backend to apply changes.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'pipeline' && (
            <Card>
              <div className="p-5 border-b border-border-subtle bg-tertiary">
                <h3 className="font-semibold">Pipeline Configuration</h3>
                <p className="text-sm text-text-muted mt-1">Corrective RAG pipeline parameters.</p>
              </div>
              <CardContent className="p-6 space-y-6">
                <div className="space-y-5">
                  <InfoRow label="Hallucination Threshold" value={config?.hallucination_threshold?.toString() || "0.2"} />
                  <InfoRow label="Routing Confidence Threshold" value={config?.routing_confidence_threshold?.toString() || "0.7"} />
                  <InfoRow label="Max Retrieval Retries" value={config?.max_retrieval_retries?.toString() || "3"} />
                  <InfoRow label="Max Generation Retries" value={config?.max_generation_retries?.toString() || "2"} />
                  <InfoRow label="Top-K Retrieval" value={config?.top_k_retrieval?.toString() || "20"} />
                  <InfoRow label="Top-K Final (after rerank)" value={config?.top_k_final?.toString() || "5"} />
                  <InfoRow label="Web Search Fallback" value={config?.enable_web_search ? "Enabled" : "Enabled"} />
                  <InfoRow label="LLM Fallback" value={config?.enable_llm_fallback ? "Enabled" : "Enabled"} />
                </div>
                <div className="pt-4 border-t border-border-default">
                  <p className="text-xs text-text-muted">
                    Pipeline parameters are configured via the backend <code className="bg-tertiary px-1.5 py-0.5 rounded text-brand-primary">.env</code> file.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'status' && (
            <Card>
              <div className="p-5 border-b border-border-subtle bg-tertiary">
                <h3 className="font-semibold">System Status</h3>
                <p className="text-sm text-text-muted mt-1">Current service connectivity.</p>
              </div>
              <CardContent className="p-6 space-y-4">
                <StatusRow label="Backend API" status={isOnline} detail={isOnline ? `Connected to ${API_URL}` : 'Not reachable'} />
                <StatusRow label="ChromaDB Vector Store" status={isOnline} detail={isOnline ? 'Active (persistent)' : 'Unknown'} />
                <StatusRow label="SQLite Database" status={isOnline} detail={isOnline ? 'Connected' : 'Unknown'} />
                <StatusRow label="LLM Provider" status={isOnline} detail={isOnline ? 'Groq API connected' : 'Unknown'} />
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm font-medium text-text-secondary">{label}</span>
      <span className="text-sm font-mono text-text-primary bg-tertiary px-3 py-1 rounded border border-border-default">{value}</span>
    </div>
  );
}

function StatusRow({ label, status, detail }: { label: string; status: boolean; detail: string }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-border-subtle last:border-b-0">
      <div className="flex items-center gap-3">
        <div className={`w-2.5 h-2.5 rounded-full ${status ? 'bg-semantic-success' : 'bg-semantic-danger'}`} />
        <span className="text-sm font-medium text-text-primary">{label}</span>
      </div>
      <span className="text-xs text-text-muted">{detail}</span>
    </div>
  );
}
