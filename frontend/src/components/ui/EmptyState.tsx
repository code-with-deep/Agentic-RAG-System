import React from 'react';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-16 px-4 text-center rounded-xl border border-dashed border-border-default bg-secondary/50", className)}>
      <div className="w-16 h-16 rounded-full bg-tertiary flex items-center justify-center text-brand-primary mb-6 shadow-sm border border-border-subtle">
        {icon}
      </div>
      <h3 className="text-xl font-semibold text-text-primary mb-2">
        {title}
      </h3>
      <p className="text-sm text-text-secondary max-w-[420px] mb-8 leading-relaxed">
        {description}
      </p>
      {action && (
        <div>{action}</div>
      )}
    </div>
  );
}
