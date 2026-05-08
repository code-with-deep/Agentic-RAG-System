import { useState } from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown, ChevronUp, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ChunkCardProps {
  chunk: {
    text: string;
    source: string;
    page?: number;
    score: number;
    strategy: string;
  };
  classification: 'CORRECT' | 'AMBIGUOUS' | 'INCORRECT' | 'UNKNOWN';
}

export function ChunkCard({ chunk, classification }: ChunkCardProps) {
  const [expanded, setExpanded] = useState(false);

  const getStatusColor = () => {
    switch (classification) {
      case 'CORRECT': return 'bg-semantic-success text-white';
      case 'AMBIGUOUS': return 'bg-semantic-warning text-white';
      case 'INCORRECT': return 'bg-semantic-danger text-white';
      default: return 'bg-text-muted text-white';
    }
  };

  return (
    <div className="rounded-lg border border-border-default bg-secondary overflow-hidden transition-all duration-200 hover:border-border-strong">
      <div 
        className="p-3 flex items-center cursor-pointer select-none"
        onClick={() => setExpanded(!expanded)}
      >
        <div className={cn("px-2 py-0.5 rounded text-[10px] font-bold tracking-wider", getStatusColor())}>
          {classification}
        </div>
        
        <div className="ml-3 flex flex-col flex-1 min-w-0">
          <div className="flex items-center text-sm font-medium text-text-primary truncate">
            <FileText className="w-3.5 h-3.5 mr-1.5 text-text-muted shrink-0" />
            <span className="truncate">{chunk.source}</span>
            {chunk.page && <span className="ml-1 text-text-muted">p.{chunk.page}</span>}
          </div>
          <div className="flex items-center text-xs text-text-muted mt-0.5 space-x-2">
            <span>Score: {(chunk.score * 100).toFixed(1)}%</span>
            <span>•</span>
            <span className="capitalize">{chunk.strategy.replace('_', ' ')}</span>
          </div>
        </div>
        
        <div className="ml-2 text-text-muted shrink-0">
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="p-3 pt-0 text-sm text-text-secondary border-t border-border-subtle mt-1 bg-tertiary/50">
              <p className="whitespace-pre-wrap mt-2 font-mono text-xs leading-relaxed">
                {chunk.text}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
