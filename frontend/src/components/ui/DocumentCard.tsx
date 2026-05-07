import React from 'react';
import { cn } from '@/lib/utils';
import { FileText, Trash2, Search, Calendar, Server } from 'lucide-react';
import { Button } from './Button';
import { Card, CardContent } from './Card';

interface DocumentCardProps {
  document: {
    id: string;
    filename: string;
    file_type: string;
    total_chunks: number;
    chunk_counts: {
      recursive?: number;
      parent_child?: number;
      section_based?: number;
      semantic?: number;
    };
    upload_date: string;
    tags?: string[];
    summary?: string;
  };
  onQuery: (id: string) => void;
  onDelete: (id: string) => void;
}

export function DocumentCard({ document, onQuery, onDelete }: DocumentCardProps) {
  const dateStr = new Date(document.upload_date).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric'
  });

  // Calculate health score based on chunk count
  const healthScore = Math.min(100, Math.max(40, Math.floor((document.total_chunks / 50) * 100)));
  const healthColor = healthScore > 80 ? 'text-semantic-success' : healthScore > 60 ? 'text-semantic-warning' : 'text-semantic-danger';

  return (
    <Card hover className="group relative transition-all duration-300 flex flex-col">
      <CardContent className="p-5 flex flex-col flex-1">
        <div className="flex items-start justify-between mb-4">
          <div className="p-2.5 bg-brand-primary/10 rounded-lg text-brand-primary">
            <FileText className="w-6 h-6" />
          </div>
          <div className={cn("px-2 py-1 rounded-md text-xs font-bold bg-secondary border border-border-default shadow-sm", healthColor)}>
            {healthScore}% Health
          </div>
        </div>

        <h3 className="font-semibold text-text-primary text-base truncate mb-1" title={document.filename}>
          {document.filename}
        </h3>
        
        {document.summary && (
          <p className="text-[11px] text-text-secondary line-clamp-2 mb-3 leading-relaxed italic">
            "{document.summary}"
          </p>
        )}
        
        <div className="flex items-center text-xs text-text-muted mb-4 gap-3">
          <div className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            <span>{dateStr}</span>
          </div>
          <div className="flex items-center gap-1">
            <Server className="w-3 h-3" />
            <span>{document.total_chunks} chunks</span>
          </div>
        </div>

        {document.tags && document.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {document.tags.map(tag => (
              <span key={tag} className="px-2 py-0.5 bg-tertiary text-text-secondary text-[10px] uppercase tracking-wider rounded border border-border-subtle">
                {tag}
              </span>
            ))}
          </div>
        )}

        <div className="mt-auto space-y-2">
          <div className="text-[10px] text-text-muted flex justify-between font-mono">
            <span>R:{document.chunk_counts.recursive || 0}</span>
            <span>PC:{document.chunk_counts.parent_child || 0}</span>
            <span>S:{document.chunk_counts.semantic || 0}</span>
            <span>Se:{document.chunk_counts.section_based || 0}</span>
          </div>
          <div className="w-full h-1 bg-tertiary rounded-full overflow-hidden flex">
            <div className="bg-brand-primary h-full" style={{ width: `${((document.chunk_counts.recursive || 0)/document.total_chunks)*100}%`}} />
            <div className="bg-brand-secondary h-full" style={{ width: `${((document.chunk_counts.parent_child || 0)/document.total_chunks)*100}%`}} />
            <div className="bg-semantic-info h-full" style={{ width: `${((document.chunk_counts.semantic || 0)/document.total_chunks)*100}%`}} />
            <div className="bg-semantic-warning h-full" style={{ width: `${((document.chunk_counts.section_based || 0)/document.total_chunks)*100}%`}} />
          </div>
        </div>

        {/* Action overlay on hover */}
        <div className="absolute inset-0 bg-primary/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col items-center justify-center gap-3 p-4 pointer-events-none group-hover:pointer-events-auto">
          <Button variant="gradient" className="w-full" onClick={() => onQuery(document.id)}>
            <Search className="w-4 h-4 mr-2" /> Query Document
          </Button>

        </div>
      </CardContent>
    </Card>
  );
}
