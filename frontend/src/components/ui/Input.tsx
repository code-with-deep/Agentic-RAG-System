import React from 'react';
import { cn } from '@/lib/utils';
import { CheckCircle2, AlertCircle } from 'lucide-react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  valid?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, valid, ...props }, ref) => {
    return (
      <div className="relative w-full">
        <input
          className={cn(
            "flex h-11 w-full rounded-md border border-border-default bg-secondary px-3 py-2 text-sm text-text-primary",
            "transition-colors duration-fast",
            "file:border-0 file:bg-transparent file:text-sm file:font-medium",
            "placeholder:text-text-muted",
            "focus-visible:outline-none focus-visible:border-brand-primary focus-visible:ring-1 focus-visible:ring-brand-primary/50",
            "disabled:cursor-not-allowed disabled:opacity-50",
            error && "border-semantic-danger focus-visible:border-semantic-danger focus-visible:ring-semantic-danger/50 animate-[shake_0.5s_cubic-bezier(.36,.07,.19,.97)_both]",
            valid && "border-semantic-success focus-visible:border-semantic-success",
            (error || valid) && "pr-10",
            className
          )}
          ref={ref}
          {...props}
        />
        {error && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
            <AlertCircle className="w-4 h-4 text-semantic-danger" />
          </div>
        )}
        {valid && !error && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
            <CheckCircle2 className="w-4 h-4 text-semantic-success" />
          </div>
        )}
        {error && (
          <p className="mt-1.5 text-xs text-semantic-danger font-medium">{error}</p>
        )}
      </div>
    );
  }
);
Input.displayName = 'Input';
