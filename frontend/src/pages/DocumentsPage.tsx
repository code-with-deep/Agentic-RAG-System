import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { DocumentCard } from '@/components/ui/DocumentCard';
import { UploadCloud, Search, Filter, Plus } from 'lucide-react';
import { motion } from 'framer-motion';

export default function DocumentsPage() {
  const [search, setSearch] = useState('');

  const mockDocuments = [
    {
      id: 'doc1',
      filename: 'Q3_Financial_Report_Final.pdf',
      file_type: 'pdf',
      total_chunks: 245,
      chunk_counts: { recursive: 100, parent_child: 80, semantic: 45, section_based: 20 },
      upload_date: '2024-10-24T10:30:00Z',
      tags: ['Finance', 'Q3', '2024']
    },
    {
      id: 'doc2',
      filename: 'Competitor_Analysis_2024.docx',
      file_type: 'docx',
      total_chunks: 128,
      chunk_counts: { recursive: 50, parent_child: 30, semantic: 28, section_based: 20 },
      upload_date: '2024-10-22T14:15:00Z',
      tags: ['Strategy', 'Competitors']
    },
    {
      id: 'doc3',
      filename: 'Legal_Risk_Assessment.pdf',
      file_type: 'pdf',
      total_chunks: 56,
      chunk_counts: { recursive: 20, parent_child: 20, semantic: 10, section_based: 6 },
      upload_date: '2024-10-15T09:45:00Z',
      tags: ['Legal', 'Risk']
    },
    {
      id: 'doc4',
      filename: 'Engineering_Architecture_v2.md',
      file_type: 'md',
      total_chunks: 89,
      chunk_counts: { recursive: 40, parent_child: 29, semantic: 15, section_based: 5 },
      upload_date: '2024-10-10T16:20:00Z',
      tags: ['Engineering', 'Architecture']
    }
  ];

  const handleQuery = (id: string) => {
    console.log('Query doc', id);
  };

  const handleView = (id: string) => {
    console.log('View doc', id);
  };

  const handleDelete = (id: string) => {
    console.log('Delete doc', id);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Document Library</h1>
          <p className="text-sm text-text-secondary">Manage your knowledge base and view chunking metrics.</p>
        </div>
        <Button variant="gradient">
          <UploadCloud className="w-4 h-4 mr-2" /> Upload Document
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <Input 
            placeholder="Search documents by name or tag..." 
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button variant="secondary">
          <Filter className="w-4 h-4 mr-2" /> Filter
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {mockDocuments.map((doc, i) => (
          <motion.div
            key={doc.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <DocumentCard 
              document={doc}
              onQuery={handleQuery}
              onView={handleView}
              onDelete={handleDelete}
            />
          </motion.div>
        ))}
        
        {/* Upload Placeholder Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: mockDocuments.length * 0.1 }}
          className="border-2 border-dashed border-border-default rounded-xl bg-secondary/30 hover:bg-secondary/80 hover:border-brand-primary/50 transition-colors cursor-pointer flex flex-col items-center justify-center p-6 min-h-[260px] group"
        >
          <div className="w-12 h-12 rounded-full bg-tertiary flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-sm">
            <Plus className="w-6 h-6 text-text-secondary group-hover:text-brand-primary transition-colors" />
          </div>
          <h3 className="font-semibold text-text-primary mb-1">Add Document</h3>
          <p className="text-xs text-text-muted text-center">Upload PDF, DOCX, TXT, or MD</p>
        </motion.div>
      </div>
    </div>
  );
}
