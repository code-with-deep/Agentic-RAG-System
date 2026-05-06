import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, Clock, Activity, Zap, Search, BrainCircuit, ShieldAlert, GitBranch } from 'lucide-react';

interface TraceStepCardProps {
  step: {
    step_number: number;
    step_name: string;
    decision: string;
    reasoning: string;
    time_taken_ms: number;
    alternatives_considered?: string[];
  };
  expanded?: boolean;
}

export function TraceStepCard({ step, expanded = false }: TraceStepCardProps) {
  const [isExpanded, setIsExpanded] = useState(expanded);

  const getStepIcon = () => {
    const name = step.step_name.toLowerCase();
    if (name.includes('classif')) return <BrainCircuit className="w-4 h-4 text-brand-primary" />;
    if (name.includes('retriev')) return <Search className="w-4 h-4 text-semantic-info" />;
    if (name.includes('eval') || name.includes('crag')) return <Activity className="w-4 h-4 text-semantic-warning" />;
    if (name.includes('hallucin')) return <ShieldAlert className="w-4 h-4 text-semantic-success" />;
    if (name.includes('fallback')) return <GitBranch className="w-4 h-4 text-semantic-danger" />;
    return <Zap className="w-4 h-4 text-brand-secondary" />;
  };

  const getStatusColor = () => {
    const dec = step.decision.toLowerCase();
    if (dec.includes('failed') || dec.includes('fallback') || dec.includes('abstain')) return 'border-semantic-danger/30 bg-semantic-danger/5';
    if (dec.includes('retry') || dec.includes('ambiguous')) return 'border-semantic-warning/30 bg-semantic-warning/5';
    return 'border-border-subtle bg-secondary';
  };

  return (
    <div className={cn("relative pl-6 pb-4 border-l border-border-strong last:border-transparent last:pb-0")}>
      {/* Timeline dot */}
      <div className="absolute left-[-5px] top-1 w-2.5 h-2.5 rounded-full bg-border-strong border-2 border-primary" />
      
      <div className={cn("rounded-lg border p-3 transition-colors", getStatusColor())}>
        <div 
          className="flex items-start justify-between cursor-pointer"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center gap-2">
            <div className="p-1 rounded-md bg-tertiary">
              {getStepIcon()}
            </div>
            <div>
              <div className="text-xs font-semibold text-text-muted uppercase tracking-wider">
                {step.step_name}
              </div>
              <div className="text-sm font-medium text-text-primary mt-0.5">
                {step.decision}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 text-text-muted">
            <div className="flex items-center text-xs font-mono bg-primary px-1.5 py-0.5 rounded">
              <Clock className="w-3 h-3 mr-1" />
              {step.time_taken_ms}ms
            </div>
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </div>

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="mt-3 pt-3 border-t border-border-subtle">
                <div className="text-xs text-text-secondary leading-relaxed">
                  <span className="font-semibold text-text-muted">Reasoning:</span> {step.reasoning}
                </div>
                {step.alternatives_considered && step.alternatives_considered.length > 0 && (
                  <div className="mt-2 text-xs">
                    <span className="font-semibold text-text-muted">Considered:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {step.alternatives_considered.map(alt => (
                        <span key={alt} className="px-1.5 py-0.5 bg-primary rounded border border-border-default text-text-muted">
                          {alt}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
