import React, { useEffect, useState } from 'react';
import { Command } from 'cmdk';
import { useNavigate } from 'react-router-dom';
import { Search, FileText, Settings, BarChart2, MessageSquare, Scale, Calculator, Moon, Sun, Monitor } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface CommandPaletteProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function CommandPalette({ open: externalOpen, onOpenChange }: CommandPaletteProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const navigate = useNavigate();

  const open = externalOpen !== undefined ? externalOpen : internalOpen;
  const setOpen = (value: boolean) => {
    setInternalOpen(value);
    onOpenChange?.(value);
  };

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(!open);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const runCommand = (command: () => void) => {
    setOpen(false);
    command();
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-primary/80 backdrop-blur-sm z-50"
            onClick={() => setOpen(false)}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20, x: '-50%' }}
            animate={{ opacity: 1, scale: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, scale: 0.95, y: -20, x: '-50%' }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="fixed top-[15%] left-1/2 z-50 w-full max-w-[600px] overflow-hidden rounded-xl border border-border-default bg-secondary shadow-modal"
          >
            <Command className="w-full flex flex-col h-full bg-secondary text-text-primary" label="Global Command Menu" shouldFilter={true}>
              <div className="flex items-center border-b border-border-subtle px-3">
                <Search className="w-5 h-5 text-text-muted shrink-0 mr-2" />
                <Command.Input 
                  placeholder="Search queries, documents, or commands..." 
                  className="flex h-14 w-full bg-transparent outline-none placeholder:text-text-muted text-text-primary"
                  autoFocus
                />
                <kbd className="hidden sm:inline-flex px-1.5 py-0.5 text-[10px] font-mono rounded border border-border-default bg-tertiary text-text-muted ml-2 shrink-0">ESC</kbd>
              </div>

              <Command.List className="max-h-[300px] overflow-y-auto p-2 scrollbar-thin">
                <Command.Empty className="py-6 text-center text-sm text-text-muted">No results found.</Command.Empty>

                <Command.Group heading={<div className="px-2 py-1.5 text-xs font-semibold text-text-muted uppercase tracking-wider">Navigation</div>}>
                  <Command.Item onSelect={() => runCommand(() => navigate('/workspace'))} className="flex items-center gap-2 px-3 py-2.5 rounded-md text-sm hover:bg-tertiary hover:text-brand-primary cursor-pointer aria-selected:bg-tertiary aria-selected:text-brand-primary">
                    <MessageSquare className="w-4 h-4" /> Workspace
                  </Command.Item>
                  <Command.Item onSelect={() => runCommand(() => navigate('/documents'))} className="flex items-center gap-2 px-3 py-2.5 rounded-md text-sm hover:bg-tertiary hover:text-brand-primary cursor-pointer aria-selected:bg-tertiary aria-selected:text-brand-primary">
                    <FileText className="w-4 h-4" /> Documents
                  </Command.Item>
                  <Command.Item onSelect={() => runCommand(() => navigate('/compare'))} className="flex items-center gap-2 px-3 py-2.5 rounded-md text-sm hover:bg-tertiary hover:text-brand-primary cursor-pointer aria-selected:bg-tertiary aria-selected:text-brand-primary">
                    <Scale className="w-4 h-4" /> Compare Pipelines
                  </Command.Item>
                  <Command.Item onSelect={() => runCommand(() => navigate('/evaluation'))} className="flex items-center gap-2 px-3 py-2.5 rounded-md text-sm hover:bg-tertiary hover:text-brand-primary cursor-pointer aria-selected:bg-tertiary aria-selected:text-brand-primary">
                    <BarChart2 className="w-4 h-4" /> Benchmarks
                  </Command.Item>
                  <Command.Item onSelect={() => runCommand(() => navigate('/settings'))} className="flex items-center gap-2 px-3 py-2.5 rounded-md text-sm hover:bg-tertiary hover:text-brand-primary cursor-pointer aria-selected:bg-tertiary aria-selected:text-brand-primary">
                    <Settings className="w-4 h-4" /> Settings
                  </Command.Item>
                </Command.Group>

                <Command.Group heading={<div className="px-2 py-1.5 text-xs font-semibold text-text-muted uppercase tracking-wider mt-2">Actions</div>}>
                  <Command.Item onSelect={() => runCommand(() => navigate('/documents'))} className="flex items-center gap-2 px-3 py-2.5 rounded-md text-sm hover:bg-tertiary hover:text-brand-primary cursor-pointer aria-selected:bg-tertiary aria-selected:text-brand-primary">
                    <FileText className="w-4 h-4" /> Upload new document
                  </Command.Item>
                  <Command.Item onSelect={() => runCommand(() => navigate('/workspace'))} className="flex items-center gap-2 px-3 py-2.5 rounded-md text-sm hover:bg-tertiary hover:text-brand-primary cursor-pointer aria-selected:bg-tertiary aria-selected:text-brand-primary">
                    <MessageSquare className="w-4 h-4" /> Ask a question
                  </Command.Item>
                </Command.Group>
                
                <Command.Group heading={<div className="px-2 py-1.5 text-xs font-semibold text-text-muted uppercase tracking-wider mt-2">Documents</div>}>
                  <Command.Item onSelect={() => runCommand(() => navigate('/workspace'))} className="flex items-center justify-between px-3 py-2.5 rounded-md text-sm hover:bg-tertiary hover:text-brand-primary cursor-pointer aria-selected:bg-tertiary aria-selected:text-brand-primary">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-text-muted" /> Q3_Financial_Report.pdf
                    </div>
                    <span className="text-[10px] text-text-muted">PDF • 2MB</span>
                  </Command.Item>
                  <Command.Item onSelect={() => runCommand(() => navigate('/workspace'))} className="flex items-center justify-between px-3 py-2.5 rounded-md text-sm hover:bg-tertiary hover:text-brand-primary cursor-pointer aria-selected:bg-tertiary aria-selected:text-brand-primary">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-text-muted" /> Competitor_Analysis.docx
                    </div>
                    <span className="text-[10px] text-text-muted">DOCX • 1.2MB</span>
                  </Command.Item>
                </Command.Group>

              </Command.List>
            </Command>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
