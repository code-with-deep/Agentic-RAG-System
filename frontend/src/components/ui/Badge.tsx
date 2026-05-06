import React from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'factual' | 'analytical' | 'summary' | 'conv' | 'oos';
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  const variants = {
    default: 'bg-secondary text-text-primary border border-border-default',
    factual: 'bg-semantic-info/10 text-semantic-info border border-semantic-info/20',
    analytical: 'bg-brand-secondary/10 text-brand-secondary border border-brand-secondary/20',
    summary: 'bg-semantic-warning/10 text-semantic-warning border border-semantic-warning/20',
    conv: 'bg-semantic-success/10 text-semantic-success border border-semantic-success/20',
    oos: 'bg-semantic-danger/10 text-semantic-danger border border-semantic-danger/20',
  };

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors',
        variants[variant],
        className
      )}
      {...props}
    />
  );
}
