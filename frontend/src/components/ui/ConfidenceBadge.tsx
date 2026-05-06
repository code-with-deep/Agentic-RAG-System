import React from 'react';
import { cn } from '@/lib/utils';
import { CheckCircle2, AlertTriangle, AlertCircle, XCircle } from 'lucide-react';

export interface ConfidenceBadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  percentage: number;
  size?: 'sm' | 'md' | 'lg';
}

export function ConfidenceBadge({ percentage, size = 'md', className, ...props }: ConfidenceBadgeProps) {
  let level = 'high';
  let Icon = CheckCircle2;
  
  if (percentage >= 90) {
    level = 'high';
    Icon = CheckCircle2;
  } else if (percentage >= 70) {
    level = 'medium';
    Icon = AlertCircle;
  } else if (percentage >= 50) {
    level = 'low';
    Icon = AlertTriangle;
  } else {
    level = 'very-low';
    Icon = XCircle;
  }

  const sizes = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-1.5',
  };

  const colors = {
    'high': 'bg-semantic-success/10 text-semantic-success border-semantic-success/20',
    'medium': 'bg-semantic-warning/10 text-semantic-warning border-semantic-warning/20',
    'low': 'bg-semantic-low/10 text-semantic-low border-semantic-low/20',
    'very-low': 'bg-semantic-danger/10 text-semantic-danger border-semantic-danger/20',
  };
  
  // Need to fix tailwind config mapping for confidence colors to semantic mapping if not matching exactly.
  // We'll use the mapped names.
  const mappedColors = {
    'high': 'bg-confidence-high/10 text-confidence-high border-confidence-high/20',
    'medium': 'bg-confidence-medium/10 text-confidence-medium border-confidence-medium/20',
    'low': 'bg-confidence-low/10 text-confidence-low border-confidence-low/20',
    'very-low': 'bg-confidence-very-low/10 text-confidence-very-low border-confidence-very-low/20',
  };

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border font-medium',
        sizes[size],
        mappedColors[level as keyof typeof mappedColors],
        className
      )}
      {...props}
    >
      <Icon className={cn(size === 'sm' ? 'w-3 h-3' : size === 'md' ? 'w-4 h-4' : 'w-5 h-5')} />
      <span>{percentage}% Confidence</span>
    </div>
  );
}
