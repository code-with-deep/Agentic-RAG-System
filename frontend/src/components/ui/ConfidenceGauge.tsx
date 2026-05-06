import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface ConfidenceGaugeProps {
  percentage: number;
  animated?: boolean;
  className?: string;
}

export function ConfidenceGauge({ percentage, animated = true, className }: ConfidenceGaugeProps) {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  // Use half circle (gauge style)
  const arcLength = circumference / 2;
  const strokeDashoffset = arcLength - (percentage / 100) * arcLength;

  let colorClass = 'text-confidence-very-low';
  if (percentage >= 90) colorClass = 'text-confidence-high';
  else if (percentage >= 70) colorClass = 'text-confidence-medium';
  else if (percentage >= 50) colorClass = 'text-confidence-low';

  return (
    <div className={cn('relative flex flex-col items-center justify-center', className)}>
      <svg
        width="120"
        height="70"
        viewBox="0 0 100 60"
        className="overflow-visible"
      >
        {/* Background Arc */}
        <path
          d={`M 10 50 A 40 40 0 0 1 90 50`}
          fill="none"
          stroke="currentColor"
          strokeWidth="10"
          strokeLinecap="round"
          className="text-border-strong"
        />
        {/* Foreground Arc */}
        <motion.path
          d={`M 10 50 A 40 40 0 0 1 90 50`}
          fill="none"
          stroke="currentColor"
          strokeWidth="10"
          strokeLinecap="round"
          className={colorClass}
          initial={animated ? { strokeDasharray: `${arcLength} ${arcLength}`, strokeDashoffset: arcLength } : false}
          animate={{ strokeDasharray: `${arcLength} ${arcLength}`, strokeDashoffset }}
          transition={{ duration: 1.5, ease: 'easeOut', delay: 0.2 }}
        />
      </svg>
      <div className="absolute bottom-0 flex flex-col items-center">
        <span className={cn('text-2xl font-bold font-mono', colorClass)}>
          {percentage}%
        </span>
        <span className="text-[10px] uppercase tracking-wider text-text-muted mt-1">
          Confidence
        </span>
      </div>
    </div>
  );
}
