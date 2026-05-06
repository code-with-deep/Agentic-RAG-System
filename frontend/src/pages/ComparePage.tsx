import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card, CardContent } from '@/components/ui/Card';
import { ConfidenceBadge } from '@/components/ui/ConfidenceBadge';
import { AgentThinkingSteps } from '@/components/ui/AgentThinkingSteps';
import { ClaimHighlight } from '@/components/ui/ClaimHighlight';
import { Scale, Zap, Cpu, ShieldCheck, Search, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactDiffViewer, { DiffMethod } from 'react-diff-viewer-continued';
import ReactMarkdown from 'react-markdown';
import { useStore } from '@/store/useStore';
import { toast } from 'sonner';
import { Input } from '@/components/ui/Input';

export default function ComparePage() {
  const [query, setQuery] = useState('');
  const [activeView, setActiveView] = useState<'side-by-side' | 'diff'>('side-by-side');

  const {
    runComparison,
    agenticResult,
    simpleResult,
    isLoadingAgentic,
    isLoadingSimple,
    queryError,
  } = useStore();

  const isProcessing = isLoadingAgentic || isLoadingSimple;
  const hasResults = !!(agenticResult && simpleResult);

  const handleCompare = async () => {
    if (!query.trim()) {
      toast.error('Please enter a query to compare');
      return;
    }
    try {
      await runComparison(query);
    } catch {
      toast.error('Comparison failed');
    }
  };

  const simpleAnswer = simpleResult?.answer || '';
  const agenticAnswer = agenticResult?.final_answer || '';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Compare Pipelines</h1>
          <p className="text-sm text-text-secondary">Run the same query through Simple RAG and Agentic RAG side-by-side.</p>
        </div>
      </div>

      {/* Query Input */}
      <Card>
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Input 
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Enter a query to compare pipelines..."
                className="h-12 text-base"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCompare();
                }}
              />
            </div>
            <Button 
              variant="gradient" 
              className="h-12 px-8 w-full sm:w-auto" 
              onClick={handleCompare}
              loading={isProcessing}
            >
              <Scale className="w-5 h-5 mr-2" /> Run Comparison
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Error */}
      {queryError && (
        <div className="bg-semantic-danger/10 border border-semantic-danger/20 text-semantic-danger p-4 rounded-xl">
          <p className="text-sm font-medium">Comparison failed</p>
          <p className="text-xs mt-1">{queryError}</p>
        </div>
      )}

      {/* Results Area */}
      <AnimatePresence>
        {isProcessing && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex flex-col md:flex-row gap-6 overflow-hidden"
          >
            {/* Simple RAG Processing */}
            <div className="flex-1 bg-secondary border border-border-default rounded-xl p-6 flex flex-col items-center justify-center min-h-[300px]">
              <div className="w-12 h-12 bg-tertiary rounded-full flex items-center justify-center mb-4">
                <Zap className="w-6 h-6 text-text-muted" />
              </div>
              <h3 className="font-semibold text-text-primary mb-2">Simple RAG Baseline</h3>
              <div className="flex items-center gap-2 text-sm text-text-secondary">
                <div className="w-4 h-4 border-2 border-text-muted border-t-transparent rounded-full animate-spin" />
                Retrieving Top-K chunks...
              </div>
            </div>

            {/* Agentic RAG Processing */}
            <div className="flex-1 bg-secondary border border-border-default rounded-xl p-6 flex flex-col items-center justify-center min-h-[300px] relative overflow-hidden">
              <div className="absolute top-0 w-full h-1 bg-brand-gradient opacity-50" />
              <div className="w-full max-w-sm">
                <div className="flex items-center gap-3 mb-6 justify-center">
                  <div className="w-10 h-10 bg-brand-primary/10 rounded-full flex items-center justify-center">
                    <Cpu className="w-5 h-5 text-brand-primary animate-pulse" />
                  </div>
                  <h3 className="font-semibold text-text-primary">Agentic RAG Pipeline</h3>
                </div>
                <AgentThinkingSteps steps={[
                  { id: '1', label: 'Classifying query type...', status: 'active' },
                  { id: '2', label: 'Selecting retrieval strategy', status: 'pending' },
                  { id: '3', label: 'CRAG chunk evaluation', status: 'pending' },
                  { id: '4', label: 'Synthesizing final answer', status: 'pending' }
                ]} />
              </div>
            </div>
          </motion.div>
        )}

        {hasResults && !isProcessing && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Toggle View */}
            <div className="flex justify-center">
              <div className="flex p-1 bg-secondary rounded-lg border border-border-default">
                <button
                  onClick={() => setActiveView('side-by-side')}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeView === 'side-by-side' ? 'bg-tertiary text-text-primary shadow-sm border border-border-subtle' : 'text-text-muted hover:text-text-primary'}`}
                >
                  Side-by-Side
                </button>
                <button
                  onClick={() => setActiveView('diff')}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeView === 'diff' ? 'bg-tertiary text-text-primary shadow-sm border border-border-subtle' : 'text-text-muted hover:text-text-primary'}`}
                >
                  Show Differences
                </button>
              </div>
            </div>

            {activeView === 'side-by-side' ? (
              <div className="grid md:grid-cols-2 gap-6">
                {/* Simple RAG Result */}
                <div className="bg-secondary border border-border-default rounded-xl overflow-hidden flex flex-col">
                  <div className="p-4 border-b border-border-subtle bg-tertiary flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Zap className="w-5 h-5 text-text-muted" />
                      <h3 className="font-semibold text-text-primary">Simple RAG</h3>
                    </div>
                    <Badge variant="default">BASELINE</Badge>
                  </div>
                  <div className="p-6 flex-1 prose prose-invert prose-p:text-text-secondary prose-p:leading-relaxed max-w-none">
                    <ReactMarkdown>{simpleAnswer}</ReactMarkdown>
                  </div>
                  <div className="p-4 bg-tertiary border-t border-border-subtle grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-text-muted block mb-1">Latency</span>
                      <span className="font-mono text-text-primary">{simpleResult ? `${(simpleResult.latency_ms / 1000).toFixed(1)}s` : '-'}</span>
                    </div>
                    <div>
                      <span className="text-text-muted block mb-1">Strategy</span>
                      <span className="font-mono text-text-primary">Top-K Vector</span>
                    </div>
                  </div>
                </div>

                {/* Agentic RAG Result */}
                <div className="bg-primary border-2 border-brand-primary/30 rounded-xl overflow-hidden flex flex-col shadow-[0_0_20px_rgba(var(--brand-primary),0.1)] relative">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-brand-primary/10 blur-[50px] pointer-events-none" />
                  
                  <div className="p-4 border-b border-border-subtle bg-tertiary/50 flex items-center justify-between relative z-10">
                    <div className="flex items-center gap-2">
                      <Cpu className="w-5 h-5 text-brand-primary" />
                      <h3 className="font-semibold text-text-primary">Agentic RAG</h3>
                    </div>
                    <ConfidenceBadge percentage={agenticResult?.confidence_breakdown?.confidence_percentage || 0} />
                  </div>
                  <div className="p-6 flex-1 relative z-10 prose prose-invert prose-p:text-text-primary prose-p:leading-relaxed max-w-none">
                    <ReactMarkdown>{agenticAnswer}</ReactMarkdown>
                  </div>
                  <div className="p-4 bg-brand-primary/5 border-t border-brand-primary/20 grid grid-cols-3 gap-4 text-sm relative z-10">
                    <div>
                      <span className="text-text-muted block mb-1">Latency</span>
                      <span className="font-mono text-semantic-warning">{agenticResult ? `${(agenticResult.total_latency_ms / 1000).toFixed(1)}s` : '-'}</span>
                    </div>
                    <div>
                      <span className="text-text-muted block mb-1">Strategy</span>
                      <span className="font-mono text-brand-primary">{agenticResult?.strategy_used || '-'}</span>
                    </div>
                    <div>
                      <span className="text-text-muted block mb-1">Verified</span>
                      <span className="font-mono text-semantic-success flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> {agenticResult?.claims?.length || 0} claims
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-secondary border border-border-default rounded-xl overflow-hidden">
                <div className="p-4 border-b border-border-subtle flex items-center justify-between bg-tertiary">
                  <h3 className="font-semibold text-text-primary">Content Diff</h3>
                </div>
                <div className="p-2 overflow-x-auto text-sm">
                  <ReactDiffViewer 
                    oldValue={simpleAnswer} 
                    newValue={agenticAnswer} 
                    splitView={true}
                    compareMethod={DiffMethod.WORDS}
                    useDarkTheme={true}
                    leftTitle="Simple RAG"
                    rightTitle="Agentic RAG"
                    styles={{
                      variables: {
                        dark: {
                          diffViewerBackground: 'var(--color-secondary)',
                          diffViewerTitleBackground: 'var(--color-tertiary)',
                          diffViewerTitleColor: 'var(--color-text-secondary)',
                          diffViewerTitleBorderColor: 'var(--color-border-subtle)',
                          addedBackground: 'rgba(34, 197, 94, 0.1)',
                          addedColor: '#4ade80',
                          removedBackground: 'rgba(239, 68, 68, 0.1)',
                          removedColor: '#f87171',
                          wordAddedBackground: 'rgba(34, 197, 94, 0.25)',
                          wordRemovedBackground: 'rgba(239, 68, 68, 0.25)',
                          gutterBackground: 'var(--color-primary)',
                          gutterBackgroundDark: 'var(--color-secondary)',
                          emptyLineBackground: 'var(--color-primary)',
                        }
                      }
                    }}
                  />
                </div>
              </div>
            )}

            {/* Analysis Box */}
            <div className="bg-brand-primary/10 border border-brand-primary/20 rounded-xl p-5 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-brand-primary/20 rounded-full flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-5 h-5 text-brand-primary" />
                </div>
                <div>
                  <h4 className="font-semibold text-brand-primary mb-2">Agentic Advantage</h4>
                  <ul className="space-y-1.5 text-sm text-text-secondary list-disc list-inside">
                    <li>The agentic pipeline classified the query as <strong>{agenticResult?.query_type}</strong> and used <strong>{agenticResult?.strategy_used}</strong> strategy.</li>
                    <li>It verified <strong>{agenticResult?.claims?.length || 0}</strong> factual claims against source documents.</li>
                    <li>Confidence score: <strong>{agenticResult?.confidence_breakdown?.confidence_percentage?.toFixed(1)}%</strong> ({agenticResult?.confidence_breakdown?.confidence_level})</li>
                    {agenticResult && simpleResult && (
                      <li>Latency trade-off: {(agenticResult.total_latency_ms / 1000).toFixed(1)}s (agentic) vs {(simpleResult.latency_ms / 1000).toFixed(1)}s (simple) — the additional time is spent on verification and refinement.</li>
                    )}
                  </ul>
                </div>
              </div>
            </div>

          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
