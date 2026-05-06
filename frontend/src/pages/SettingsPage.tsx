import React, { useState } from 'react';
import { Card, CardContent } from '../components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Save, Key, BrainCircuit, Globe, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'models' | 'api' | 'advanced'>('models');
  const [loading, setLoading] = useState(false);

  const handleSave = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      toast.success('Settings saved successfully');
    }, 1000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-text-secondary">Configure your AI models, API keys, and advanced pipeline parameters.</p>
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
            onClick={() => setActiveTab('api')}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'api' ? 'bg-brand-primary/10 text-brand-primary' : 'text-text-secondary hover:text-text-primary hover:bg-secondary'}`}
          >
            <Key className="w-4 h-4" /> API Keys
          </button>
          <button 
            onClick={() => setActiveTab('advanced')}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'advanced' ? 'bg-brand-primary/10 text-brand-primary' : 'text-text-secondary hover:text-text-primary hover:bg-secondary'}`}
          >
            <Globe className="w-4 h-4" /> Advanced Pipeline
          </button>
        </div>

        {/* Settings Content */}
        <div className="flex-1 space-y-6">
          {activeTab === 'models' && (
            <Card>
              <div className="p-5 border-b border-border-subtle bg-tertiary">
                <h3 className="font-semibold">LLM Provider Configuration</h3>
                <p className="text-sm text-text-muted mt-1">Select the primary model used for routing and generation.</p>
              </div>
              <CardContent className="p-6 space-y-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Active Provider</label>
                    <select className="w-full bg-secondary border border-border-default rounded-md h-11 px-3 text-sm text-text-primary focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary/50">
                      <option value="gemini">Google Gemini (Recommended)</option>
                      <option value="groq">Groq (Llama 3)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Primary Model</label>
                    <select className="w-full bg-secondary border border-border-default rounded-md h-11 px-3 text-sm text-text-primary focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary/50">
                      <option value="gemini-1.5-pro">gemini-1.5-pro-latest</option>
                      <option value="gemini-1.5-flash">gemini-1.5-flash</option>
                    </select>
                    <p className="text-xs text-text-muted mt-2">Used for complex generation and hallucination detection. Flash is used for routing.</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Temperature</label>
                    <div className="flex items-center gap-4">
                      <input type="range" min="0" max="1" step="0.1" defaultValue="0.1" className="flex-1 accent-brand-primary" />
                      <span className="w-12 text-center font-mono text-sm bg-tertiary px-2 py-1 rounded border border-border-default">0.1</span>
                    </div>
                    <p className="text-xs text-text-muted mt-2">Lower values (0.0-0.2) recommended for RAG tasks to minimize hallucinations.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'api' && (
            <Card>
              <div className="p-5 border-b border-border-subtle bg-tertiary">
                <h3 className="font-semibold">API Credentials</h3>
                <p className="text-sm text-text-muted mt-1">Manage your API keys for the backend services.</p>
              </div>
              <CardContent className="p-6 space-y-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Gemini API Key</label>
                    <Input type="password" placeholder="AIzaSy..." defaultValue="AIzaSyXXXXXXXXXXXXXXXX" />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Tavily API Key (Search Fallback)</label>
                    <Input type="password" placeholder="tvly-..." defaultValue="tvly-XXXXXXXXXXXXXXXX" />
                  </div>
                  <div className="pt-4 flex items-center justify-between border-t border-border-default">
                    <div>
                      <p className="text-sm font-medium text-text-primary">Connection Status</p>
                      <p className="text-xs text-semantic-success">Backend connected & authenticated</p>
                    </div>
                    <Button variant="secondary" size="sm">
                      <RefreshCw className="w-4 h-4 mr-2" /> Test Connection
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'advanced' && (
            <Card>
              <div className="p-5 border-b border-border-subtle bg-tertiary">
                <h3 className="font-semibold">Pipeline Tuning</h3>
                <p className="text-sm text-text-muted mt-1">Advanced parameters for the Corrective RAG system.</p>
              </div>
              <CardContent className="p-6 space-y-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">CRAG Quality Threshold</label>
                    <div className="flex items-center gap-4">
                      <input type="range" min="0" max="1" step="0.05" defaultValue="0.75" className="flex-1 accent-brand-primary" />
                      <span className="w-12 text-center font-mono text-sm bg-tertiary px-2 py-1 rounded border border-border-default">0.75</span>
                    </div>
                    <p className="text-xs text-text-muted mt-2">Minimum score required for a chunk to be considered relevant.</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Max Retries</label>
                    <select className="w-full bg-secondary border border-border-default rounded-md h-11 px-3 text-sm text-text-primary focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary/50">
                      <option value="1">1</option>
                      <option value="2">2</option>
                      <option value="3">3</option>
                    </select>
                    <p className="text-xs text-text-muted mt-2">Maximum number of times the agent will re-write the query if chunks are poor.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex justify-end pt-4">
            <Button variant="gradient" onClick={handleSave} loading={loading}>
              <Save className="w-4 h-4 mr-2" /> Save Changes
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
