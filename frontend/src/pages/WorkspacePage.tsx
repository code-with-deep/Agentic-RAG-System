import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ConfidenceBadge } from '@/components/ui/ConfidenceBadge';
import { AgentThinkingSteps } from '@/components/ui/AgentThinkingSteps';
import { TraceStepCard } from '@/components/ui/TraceStepCard';
import { ChunkCard } from '@/components/ui/ChunkCard';
import { cn } from '@/lib/utils';
import { Send, ChevronRight, ChevronLeft, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { useStore } from '@/store/useStore';
import ReactMarkdown from 'react-markdown';

export default function WorkspacePage() {
  const [query, setQuery] = useState('');
  const [showRightPanel, setShowRightPanel] = useState(true);
  const [activeTab, setActiveTab] = useState<'trace' | 'chunks'>('trace');
  
  const {
    runQuery,
    agenticResult,
    isLoadingAgentic,
    queryError,
    conversationHistory,
    clearResults,
  } = useStore();

  // Build thinking steps from real trace data or show loading animation
  const getThinkingSteps = () => {
    if (agenticResult?.decision_trace) {
      return agenticResult.decision_trace.map((step, i) => ({
        id: String(i + 1),
        label: `${step.step_name}: ${step.decision}`,
        status: 'completed' as const,
        detail: step.reasoning?.substring(0, 80),
      }));
    }
    return [
      { id: '1', label: 'Classifying query type...', status: 'active' as const },
      { id: '2', label: 'Selecting retrieval strategy', status: 'pending' as const },
      { id: '3', label: 'Retrieving chunks', status: 'pending' as const },
      { id: '4', label: 'Evaluating quality (CRAG)', status: 'pending' as const },
      { id: '5', label: 'Checking for hallucinations', status: 'pending' as const },
    ];
  };

  const handleSend = async () => {
    if (!query.trim()) return;
    const currentQuery = query;
    setQuery('');
    try {
      await runQuery(currentQuery);
    } catch {
      toast.error('Failed to process query');
    }
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-4 overflow-hidden">
      
      {/* Left Panel: History */}
      <div className="hidden lg:flex flex-col w-64 bg-secondary border border-border-default rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border-subtle flex items-center justify-between">
          <h2 className="font-semibold">History</h2>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {conversationHistory.length === 0 ? (
            <div className="text-xs text-text-muted text-center py-8">No queries yet. Ask something!</div>
          ) : (
            <>
              <div className="text-xs font-medium text-text-muted px-2 py-1 mb-1 mt-2">Recent</div>
              {conversationHistory.map((item, i) => (
                <div 
                  key={i}
                  className={cn(
                    "p-2 rounded-lg text-sm mb-1 cursor-pointer transition-colors",
                    i === conversationHistory.length - 1
                      ? "bg-brand-primary/10 border-l-2 border-brand-primary text-brand-primary font-medium"
                      : "text-text-secondary hover:bg-tertiary"
                  )}
                >
                  <div className="truncate">{item.query}</div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      {/* Center Panel: Query Interface */}
      <div className="flex-1 flex flex-col bg-secondary border border-border-default rounded-xl shadow-sm overflow-hidden relative">
        <div className="p-3 border-b border-border-subtle bg-tertiary flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-text-secondary">Querying:</span>
            <span className="text-sm font-medium text-text-primary">All Documents</span>
          </div>
          {agenticResult && (
            <Button variant="ghost" size="sm" className="text-xs" onClick={clearResults}>
              New Query
            </Button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
          <div className="w-full max-w-3xl mx-auto space-y-6">
            
            {/* Show conversation history */}
            {conversationHistory.map((item, i) => (
              <div key={i} className="space-y-4">
                {/* User Query */}
                <div className="flex items-center gap-3 justify-end">
                  <div className="bg-brand-primary/10 border border-brand-primary/20 text-text-primary px-4 py-2.5 rounded-2xl rounded-tr-sm max-w-[80%]">
                    {item.query}
                  </div>
                </div>
                {/* Agent Answer */}
                <div className="flex flex-col gap-3 max-w-[90%]">
                  <div className="bg-tertiary border border-border-subtle px-5 py-4 rounded-2xl rounded-tl-sm text-text-primary leading-relaxed shadow-sm prose prose-invert prose-sm max-w-none">
                    <ReactMarkdown>{item.answer}</ReactMarkdown>
                  </div>
                </div>
              </div>
            ))}

            {/* Agent Status (if processing) */}
            {isLoadingAgentic && (
              <div className="w-full max-w-md">
                <AgentThinkingSteps steps={getThinkingSteps()} />
              </div>
            )}

            {/* Current result details */}
            {!isLoadingAgentic && agenticResult && (
              <div className="flex flex-col gap-3 max-w-[90%]">
                <div className="flex items-center gap-3">
                  <div className="px-2.5 py-1 bg-secondary border border-border-default rounded-md text-xs font-semibold text-text-secondary flex items-center gap-1.5">
                    <Search className="w-3.5 h-3.5 text-brand-primary" />
                    {agenticResult.strategy_used}
                  </div>
                  <ConfidenceBadge percentage={agenticResult.confidence_breakdown?.confidence_percentage || 0} size="sm" />
                  <Badge variant={agenticResult.query_type as any} className="uppercase text-[10px] px-1.5 py-0">
                    {agenticResult.query_type}
                  </Badge>
                </div>
              </div>
            )}

            {/* Error */}
            {queryError && (
              <div className="bg-semantic-danger/10 border border-semantic-danger/20 text-semantic-danger p-4 rounded-xl">
                <p className="text-sm font-medium">Query failed</p>
                <p className="text-xs mt-1">{queryError}</p>
              </div>
            )}

            {/* Empty state */}
            {!isLoadingAgentic && !agenticResult && conversationHistory.length === 0 && !queryError && (
              <div className="flex-1 flex flex-col items-center justify-center py-20 text-center">
                <div className="w-16 h-16 bg-tertiary rounded-full flex items-center justify-center mb-4 border border-border-default">
                  <Search className="w-8 h-8 text-text-muted" />
                </div>
                <h3 className="text-lg font-semibold text-text-primary mb-2">Ask anything about your documents</h3>
                <p className="text-sm text-text-muted max-w-md">
                  Upload documents in the Documents page, then ask complex questions. The agentic pipeline will classify, retrieve, verify, and answer.
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="p-4 bg-tertiary border-t border-border-subtle">
          <div className="max-w-3xl mx-auto relative group">
            {/* Live classification badge */}
            <AnimatePresence>
              {query.length > 5 && !isLoadingAgentic && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute -top-10 left-0 bg-primary border border-border-default text-xs px-3 py-1.5 rounded-full flex items-center gap-2 shadow-sm"
                >
                  <Search className="w-3 h-3 text-brand-primary" />
                  <span className="text-text-muted">Processing with</span>
                  <span className="font-semibold text-text-primary">Agentic RAG</span>
                </motion.div>
              )}
            </AnimatePresence>
            
            <div className="relative bg-primary border border-border-default focus-within:border-brand-primary focus-within:ring-1 focus-within:ring-brand-primary/50 rounded-xl shadow-sm transition-all overflow-hidden">
              <textarea
                className="w-full bg-transparent p-4 min-h-[80px] max-h-[200px] resize-none outline-none text-text-primary placeholder:text-text-muted"
                placeholder="Ask anything about your documents..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
              />
              <div className="flex items-center justify-between p-2 pt-0">
                <div />
                <div className="flex items-center gap-3">
                  <span className="text-xs text-text-muted hidden sm:inline-block">Enter to send</span>
                  <Button 
                    variant="gradient" 
                    size="sm" 
                    className="h-8 px-3 rounded-lg"
                    onClick={handleSend}
                    disabled={!query.trim() || isLoadingAgentic}
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel: Agent Details */}
      <AnimatePresence initial={false}>
        {showRightPanel ? (
          <motion.div 
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 360, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className="flex flex-col bg-secondary border border-border-default rounded-xl shadow-sm overflow-hidden shrink-0"
          >
            <div className="flex items-center justify-between p-2 border-b border-border-subtle bg-tertiary">
              <div className="flex p-1 bg-primary rounded-lg border border-border-default">
                <button 
                  onClick={() => setActiveTab('trace')}
                  className={cn("px-3 py-1 text-xs font-medium rounded-md transition-colors", activeTab === 'trace' ? "bg-tertiary text-text-primary shadow-sm" : "text-text-muted")}
                >
                  Decision Trace
                </button>
                <button 
                  onClick={() => setActiveTab('chunks')}
                  className={cn("px-3 py-1 text-xs font-medium rounded-md transition-colors", activeTab === 'chunks' ? "bg-tertiary text-text-primary shadow-sm" : "text-text-muted")}
                >
                  Chunks ({agenticResult?.retrieved_chunks?.length || 0})
                </button>
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-text-muted" onClick={() => setShowRightPanel(false)}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4">
              {activeTab === 'trace' && (
                <div className="space-y-1 relative">
                  {agenticResult?.decision_trace && agenticResult.decision_trace.length > 0 ? (
                    <>
                      <div className="absolute left-[11px] top-4 bottom-4 w-px bg-border-strong" />
                      {agenticResult.decision_trace.map((step, i) => (
                        <TraceStepCard 
                          key={i} 
                          step={step} 
                          expanded={i === 0} 
                        />
                      ))}
                    </>
                  ) : (
                    <div className="text-sm text-text-muted text-center py-8">
                      Run a query to see the agent's decision trace.
                    </div>
                  )}
                </div>
              )}
              {activeTab === 'chunks' && (
                <div className="space-y-3">
                  {agenticResult?.retrieved_chunks && agenticResult.retrieved_chunks.length > 0 ? (
                    agenticResult.retrieved_chunks.map((chunk, i) => (
                      <ChunkCard 
                        key={i} 
                        chunk={chunk} 
                        classification={chunk.crag_classification} 
                      />
                    ))
                  ) : (
                    <div className="text-sm text-text-muted text-center py-8">
                      Run a query to see retrieved chunks.
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        ) : (
          <div className="flex flex-col items-center py-4 px-2 bg-secondary border border-border-default rounded-xl shadow-sm shrink-0">
            <Button variant="ghost" size="icon" className="h-8 w-8 text-text-muted mb-4" onClick={() => setShowRightPanel(true)}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div className="rotate-90 origin-left translate-x-4 uppercase tracking-widest text-xs font-bold text-text-muted whitespace-nowrap mt-20">
              Agent Details
            </div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
