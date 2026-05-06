import React from 'react';
import { Card, CardContent } from './Card';
import {cn} from '../../lib/utils';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  delta?: {
    value: number | string;
    trend: 'up' | 'down' | 'neutral';
    label?: string;
  };
  icon?: React.ReactNode;
  chart?: React.ReactNode;
  className?: string;
}

export function StatCard({ title, value, delta, icon, chart, className }: StatCardProps) {
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-text-muted">{title}</h3>
          {icon && <div className="text-text-muted">{icon}</div>}
        </div>
        
        <div className="flex items-end justify-between">
          <div>
            <div className="text-3xl font-bold tracking-tight text-text-primary">
              {value}
            </div>
            
            {delta && (
              <div className="flex items-center mt-2 text-xs">
                <span className={cn(
                  "flex items-center font-medium mr-1.5",
                  delta.trend === 'up' ? "text-semantic-success" : 
                  delta.trend === 'down' ? "text-semantic-danger" : "text-text-muted"
                )}>
                  {delta.trend === 'up' ? <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" /> : 
                   delta.trend === 'down' ? <ArrowDownRight className="w-3.5 h-3.5 mr-0.5" /> : 
                   <Minus className="w-3.5 h-3.5 mr-0.5" />}
                  {delta.value}
                </span>
                {delta.label && <span className="text-text-muted">{delta.label}</span>}
              </div>
            )}
          </div>
          
          {chart && (
            <div className="h-12 w-24 ml-4">
              {chart}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
