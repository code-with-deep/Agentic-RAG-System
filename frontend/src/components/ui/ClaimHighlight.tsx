import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';

interface ClaimHighlightProps {
  text: string;
  status: 'SUPPORTED' | 'NOT_SUPPORTED' | 'CONTRADICTED';
  evidence?: string;
  confidence?: number;
}

export function ClaimHighlight({ text, status, evidence, confidence }: ClaimHighlightProps) {
  const [isHovered, setIsHovered] = useState(false);

  const getStyles = () => {
    switch (status) {
      case 'SUPPORTED':
        return 'border-b-2 border-semantic-success/50 hover:bg-semantic-success/10 cursor-help transition-colors';
      case 'NOT_SUPPORTED':
        return 'line-through decoration-semantic-danger/50 hover:bg-semantic-danger/10 cursor-help transition-colors';
      case 'CONTRADICTED':
        return 'underline decoration-wavy decoration-semantic-warning/70 hover:bg-semantic-warning/10 cursor-help transition-colors';
      default:
        return '';
    }
  };

  const getIcon = () => {
    switch (status) {
      case 'SUPPORTED': return <CheckCircle2 className="w-4 h-4 text-semantic-success" />;
      case 'NOT_SUPPORTED': return <XCircle className="w-4 h-4 text-semantic-danger" />;
      case 'CONTRADICTED': return <AlertTriangle className="w-4 h-4 text-semantic-warning" />;
    }
  };

  return (
    <span 
      className="relative inline-block"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <span className={cn(getStyles())}>
        {text}
      </span>
      
      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ opacity: 0, y: 5, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 5, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-secondary border border-border-strong rounded-lg shadow-modal text-sm"
          >
            <div className="flex items-center gap-2 mb-2 font-medium">
              {getIcon()}
              <span className="text-text-primary capitalize">{status.replace('_', ' ').toLowerCase()}</span>
              {confidence && (
                <span className="ml-auto text-xs text-text-muted">{Math.round(confidence * 100)}% conf</span>
              )}
            </div>
            {evidence && (
              <p className="text-text-secondary text-xs leading-relaxed">
                {evidence}
              </p>
            )}
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-border-strong" />
          </motion.div>
        )}
      </AnimatePresence>
    </span>
  );
}
