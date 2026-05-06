import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Loader2, Circle, Brain } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Step {
  id: string;
  label: string;
  status: 'pending' | 'active' | 'completed' | 'error';
  detail?: string;
}

interface AgentThinkingStepsProps {
  steps: Step[];
  className?: string;
  onComplete?: () => void;
}

export function AgentThinkingSteps({ steps, className, onComplete }: AgentThinkingStepsProps) {
  const [completedCount, setCompletedCount] = useState(0);

  useEffect(() => {
    const completed = steps.filter(s => s.status === 'completed').length;
    setCompletedCount(completed);
    
    if (completed === steps.length && onComplete) {
      onComplete();
    }
  }, [steps, onComplete]);

  return (
    <div className={cn("rounded-xl border border-border-default bg-secondary overflow-hidden", className)}>
      <div className="bg-tertiary px-4 py-3 flex items-center gap-2 border-b border-border-subtle">
        <Brain className="w-5 h-5 text-brand-primary animate-pulse-glow" />
        <span className="font-medium text-text-primary">Agent is thinking...</span>
        <span className="ml-auto text-xs font-mono text-text-muted">
          {completedCount} / {steps.length}
        </span>
      </div>
      <div className="p-4 flex flex-col gap-3">
        <AnimatePresence>
          {steps.map((step, index) => (
            <motion.div
              key={step.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={cn(
                "flex gap-3 items-start",
                step.status === 'pending' && "opacity-50"
              )}
            >
              <div className="mt-0.5 shrink-0">
                {step.status === 'completed' && (
                  <CheckCircle2 className="w-4 h-4 text-semantic-success" />
                )}
                {step.status === 'active' && (
                  <Loader2 className="w-4 h-4 text-brand-primary animate-spin" />
                )}
                {step.status === 'pending' && (
                  <Circle className="w-4 h-4 text-text-muted" />
                )}
                {step.status === 'error' && (
                  <CheckCircle2 className="w-4 h-4 text-semantic-danger" /> 
                  // using CheckCircle for fallback display if needed, but should be X
                )}
              </div>
              <div className="flex flex-col">
                <span className={cn(
                  "text-sm font-medium",
                  step.status === 'active' ? "text-text-primary" : "text-text-secondary"
                )}>
                  {step.label}
                </span>
                {step.detail && step.status !== 'pending' && (
                  <motion.span 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="text-xs text-text-muted mt-0.5"
                  >
                    {step.detail}
                  </motion.span>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
