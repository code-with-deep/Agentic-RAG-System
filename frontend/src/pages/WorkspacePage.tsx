import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { ConfidenceBadge } from '@/components/ui/ConfidenceBadge';
import { AgentThinkingSteps } from '@/components/ui/AgentThinkingSteps';
import { ClaimHighlight } from '@/components/ui/ClaimHighlight';
import { TraceStepCard } from '@/components/ui/TraceStepCard';
import { ChunkCard } from '@/components/ui/ChunkCard';
import { cn } from '@/lib/utils';
import { Paperclip, Send, ChevronRight, ChevronLeft, Trash2, Search, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

export default function WorkspacePage() {
  const [query, setQuery] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showRightPanel, setShowRightPanel] = useState(true);
  const [activeTab, setActiveTab] = useState<'trace' | 'chunks'>('trace');
  
  // Mock steps
  const steps = [
    { id: '1', label: 'Classified as FACTUAL', status: 'completed' as const, detail: 'Confidence: 94%' },
    { id: '2', label: 'Routing to Hybrid+ReRank', status: 'completed' as const },
    { id: '3', label: 'Retrieving chunks', status: 'active' as const, detail: '15/20 retrieved' },
    { id: '4', label: 'Evaluating quality (CRAG)', status: 'pending' as const },
    { id: '5', label: 'Checking for hallucinations', status: 'pending' as const },
  ];

  const handleSend = () => {
    if (!query.trim()) return;
    setIsProcessing(true);
    // Simulate API
    setTimeout(() => {
      setIsProcessing(false);
      toast.success('Query processed successfully');
    }, 3000);
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-4 overflow-hidden">
      
      {/* Left Panel: History */}
      <div className="hidden lg:flex flex-col w-64 bg-secondary border border-border-default rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border-subtle flex items-center justify-between">
          <h2 className="font-semibold">History</h2>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
            <Search className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          <div className="text-xs font-medium text-text-muted px-2 py-1 mb-1 mt-2">Today</div>
          <div className="p-2 bg-brand-primary/10 border-l-2 border-brand-primary rounded-r-lg text-sm font-medium text-brand-primary mb-1 cursor-pointer">
            <div className="truncate">What was Q3 revenue?</div>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="factual" className="text-[10px] px-1 py-0">F</Badge>
              <div className="w-1.5 h-1.5 rounded-full bg-semantic-success" />
            </div>
          </div>
          <div className="p-2 hover:bg-tertiary rounded-lg text-sm text-text-secondary mb-1 cursor-pointer transition-colors">
            <div className="truncate">Compare all regions</div>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="analytical" className="text-[10px] px-1 py-0">A</Badge>
              <div className="w-1.5 h-1.5 rounded-full bg-semantic-warning" />
            </div>
          </div>
        </div>
        <div className="p-3 border-t border-border-subtle">
          <Button variant="ghost" className="w-full text-xs text-text-muted hover:text-semantic-danger transition-colors justify-start">
            <Trash2 className="w-3.5 h-3.5 mr-2" /> Clear History
          </Button>
        </div>
      </div>

      {/* Center Panel: Query Interface */}
      <div className="flex-1 flex flex-col bg-secondary border border-border-default rounded-xl shadow-sm overflow-hidden relative">
        <div className="p-3 border-b border-border-subtle bg-tertiary flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-text-secondary">Querying:</span>
            <select className="bg-primary border border-border-default rounded-md text-sm px-2 py-1 text-text-primary focus:outline-none focus:border-brand-primary">
              <option>All Documents</option>
              <option>Q3_Financial_Report.pdf</option>
            </select>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
          {/* Answer Display */}
          <div className="w-full max-w-3xl mx-auto space-y-6">
            {/* User Query */}
            <div className="flex items-center gap-3 justify-end">
              <div className="bg-brand-primary/10 border border-brand-primary/20 text-text-primary px-4 py-2.5 rounded-2xl rounded-tr-sm max-w-[80%]">
                What was the Q3 revenue?
              </div>
            </div>

            {/* Agent Status (if processing) */}
            {isProcessing ? (
              <div className="w-full max-w-md">
                <AgentThinkingSteps steps={steps} />
              </div>
            ) : (
              /* Agent Answer */
              <div className="flex flex-col gap-3 max-w-[90%]">
                <div className="flex items-center gap-3">
                  <div className="px-2.5 py-1 bg-secondary border border-border-default rounded-md text-xs font-semibold text-text-secondary flex items-center gap-1.5">
                    <Search className="w-3.5 h-3.5 text-brand-primary" />
                    Hybrid + ReRank
                  </div>
                  <ConfidenceBadge percentage={94} size="sm" />
                </div>
                
                <div className="bg-tertiary border border-border-subtle px-5 py-4 rounded-2xl rounded-tl-sm text-text-primary leading-relaxed shadow-sm">
                  Based on the document, <ClaimHighlight text="the total revenue for Q3 2024 was $42.5 million" status="SUPPORTED" confidence={0.96} evidence="Found in Q3_Financial_Report.pdf on page 12." />, which represents a <ClaimHighlight text="14% year-over-year growth" status="SUPPORTED" confidence={0.92} evidence="Matched exact claim in financial overview section." /> compared to Q3 2023.
                </div>

                <div className="flex flex-wrap gap-2 mt-2">
                  <Button variant="secondary" size="sm" className="text-xs py-1 h-7 rounded-full bg-primary">
                    Compare this to industry average <ChevronRight className="w-3 h-3 ml-1" />
                  </Button>
                  <Button variant="secondary" size="sm" className="text-xs py-1 h-7 rounded-full bg-primary">
                    What about Q4 results? <ChevronRight className="w-3 h-3 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="p-4 bg-tertiary border-t border-border-subtle">
          <div className="max-w-3xl mx-auto relative group">
            {/* Live classification badge */}
            <AnimatePresence>
              {query.length > 5 && !isProcessing && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute -top-10 left-0 bg-primary border border-border-default text-xs px-3 py-1.5 rounded-full flex items-center gap-2 shadow-sm"
                >
                  <Search className="w-3 h-3 text-brand-primary" />
                  <span className="text-text-muted">Looks like</span>
                  <span className="font-semibold text-text-primary">FACTUAL</span>
                  <span className="text-text-muted">→ Hybrid+ReRank</span>
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
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-text-muted">
                    <Paperclip className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-text-muted hidden sm:inline-block">Cmd+Enter to send</span>
                  <Button 
                    variant="gradient" 
                    size="sm" 
                    className="h-8 px-3 rounded-lg"
                    onClick={handleSend}
                    disabled={!query.trim() || isProcessing}
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
                  Chunks (3)
                </button>
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-text-muted" onClick={() => setShowRightPanel(false)}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4">
              {activeTab === 'trace' && (
                <div className="space-y-1 relative">
                  <div className="absolute left-[11px] top-4 bottom-4 w-px bg-border-strong" />
                  <TraceStepCard step={{ step_number: 1, step_name: 'ROUTER', decision: 'Classified as FACTUAL', reasoning: 'Question asks for a specific numerical value (revenue) in a specific timeframe (Q3 2024)', time_taken_ms: 120 }} expanded />
                  <TraceStepCard step={{ step_number: 2, step_name: 'RETRIEVAL', decision: 'Hybrid + ReRank', reasoning: 'Best strategy for precise factual lookups', time_taken_ms: 450 }} />
                  <TraceStepCard step={{ step_number: 3, step_name: 'CRAG EVALUATION', decision: 'Chunks are CORRECT', reasoning: 'Chunks contain revenue numbers for Q3', time_taken_ms: 320 }} />
                </div>
              )}
              {activeTab === 'chunks' && (
                <div className="space-y-3">
                  <ChunkCard chunk={{ text: 'The total revenue for Q3 2024 reached $42.5 million, exceeding expectations.', source: 'Q3_Report.pdf', page: 12, score: 0.92, strategy: 'hybrid_rerank' }} classification="CORRECT" />
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
