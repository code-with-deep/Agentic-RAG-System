import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { DocumentCard } from '@/components/ui/DocumentCard';
import { UploadCloud, Search, Plus } from 'lucide-react';
import { motion } from 'framer-motion';
import { useStore } from '@/store/useStore';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

export default function DocumentsPage() {
  const [search, setSearch] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  
  const { 
    documents, 
    isLoadingDocuments, 
    isUploading, 
    fetchDocuments, 
    uploadDocument, 
    deleteDocument 
  } = useStore();

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        await uploadDocument(file, ['User Upload']);
        toast.success('Document uploaded successfully');
      } catch (error) {
        toast.error('Failed to upload document');
      }
    }
    // reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleQuery = (id: string) => {
    navigate('/workspace');
    toast.info('Document selected for querying');
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this document?")) {
      try {
        await deleteDocument(id);
        toast.success('Document deleted successfully');
      } catch (error) {
        toast.error('Failed to delete document');
      }
    }
  };

  const processedDocs = documents.map(doc => {
    const total_chunks = doc.chunk_counts ? Object.values(doc.chunk_counts).reduce((a, b) => a + b, 0) : 0;
    return { ...doc, id: doc.doc_id, total_chunks };
  });

  const filteredDocs = processedDocs.filter(doc => 
    doc.filename.toLowerCase().includes(search.toLowerCase()) || 
    doc.tags?.some(tag => tag.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Document Library</h1>
          <p className="text-sm text-text-secondary">Manage your knowledge base and view chunking metrics.</p>
        </div>
        <input 
          type="file" 
          ref={fileInputRef}
          className="hidden" 
          onChange={handleFileChange}
          accept=".pdf,.txt,.docx,.doc,.md,.markdown"
        />
        <Button variant="gradient" onClick={() => fileInputRef.current?.click()} loading={isUploading}>
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
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {isLoadingDocuments && documents.length === 0 ? (
           <div className="col-span-full flex justify-center py-12">
             <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary"></div>
           </div>
        ) : (
          filteredDocs.map((doc, i) => (
            <motion.div
              key={doc.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <DocumentCard 
                document={doc as any}
                onQuery={handleQuery}
                onDelete={handleDelete}
              />
            </motion.div>
          ))
        )}
        
        {/* Upload Placeholder Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: filteredDocs.length * 0.05 }}
          onClick={() => fileInputRef.current?.click()}
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
