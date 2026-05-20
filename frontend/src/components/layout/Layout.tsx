import { useState } from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Brain, MessageSquare, Folder, Scale, BarChart2, Settings, Menu, Search, LogOut } from 'lucide-react';
import { useAuth } from '@/components/auth/AuthContext';
import { cn } from '@/lib/utils';
import { Button } from '../ui/Button';
import { motion, AnimatePresence } from 'framer-motion';
import { CommandPalette } from '../ui/CommandPalette';

export function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: <BarChart2 className="w-5 h-5" /> },
    { name: 'Workspace', path: '/workspace', icon: <MessageSquare className="w-5 h-5" /> },
    { name: 'Documents', path: '/documents', icon: <Folder className="w-5 h-5" /> },
    { name: 'Compare', path: '/compare', icon: <Scale className="w-5 h-5" /> },
    { name: 'Evaluation', path: '/evaluation', icon: <BarChart2 className="w-5 h-5" /> },
    { name: 'Settings', path: '/settings', icon: <Settings className="w-5 h-5" /> },
  ];

  const handleLogout = () => {
    logout();
    navigate('/auth', { replace: true });
  };

  const SidebarContent = () => (
    <>
      <div className="h-16 flex items-center px-6 border-b border-border-subtle shrink-0">
        <Brain className="w-6 h-6 text-brand-primary" />
        <span className="ml-3 font-bold text-lg text-text-primary tracking-tight">DocMind AI</span>
      </div>
      
      <div className="p-4 border-b border-border-subtle">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-brand-primary/20 flex items-center justify-center text-brand-primary font-bold shadow-inner">
            {user?.avatar_initials || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-text-primary truncate">{user?.name}</p>
            <div className="flex items-center gap-2">
              <span className="text-xs text-text-muted capitalize">{user?.plan} Plan</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-none py-4 px-3 flex flex-col gap-1">
        {navItems.map((item) => {
          const isActive = location.pathname.startsWith(item.path);
          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 relative",
                isActive 
                  ? "text-brand-primary bg-brand-primary/10" 
                  : "text-text-secondary hover:text-text-primary hover:bg-secondary"
              )}
            >
              {isActive && (
                <motion.div 
                  layoutId="active-nav-indicator"
                  className="absolute left-0 top-0 bottom-0 w-1 bg-brand-primary rounded-r-full"
                />
              )}
              {item.icon}
              {item.name}
            </NavLink>
          );
        })}
      </div>

      <div className="p-4 border-t border-border-subtle shrink-0">
        <div className="bg-secondary rounded-xl p-4 border border-border-default shadow-sm mb-4">
          <div className="flex justify-between text-xs font-medium mb-2 text-text-primary">
            <span>Usage</span>
            <span>3 / 10</span>
          </div>
          <div className="h-1.5 w-full bg-tertiary rounded-full overflow-hidden">
            <div className="h-full bg-brand-primary w-[30%]" />
          </div>
          <p className="text-[10px] text-text-muted mt-2">Free plan limit: 10 queries/day</p>
        </div>
        
        <Button variant="gradient" className="w-full text-xs" onClick={handleLogout}>
          <LogOut className="w-4 h-4 mr-2" /> Logout
        </Button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen flex bg-primary text-text-primary font-sans dark">
      
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 fixed inset-y-0 left-0 bg-primary border-r border-border-default z-40">
        <SidebarContent />
      </aside>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 w-72 bg-primary border-r border-border-default z-50 flex flex-col md:hidden shadow-modal"
            >
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 md:pl-64">
        {/* Top Navbar */}
        <header className="h-16 flex items-center justify-between px-4 sm:px-6 bg-primary/80 backdrop-blur-md border-b border-border-subtle sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="p-2 -ml-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-secondary md:hidden transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="hidden sm:block">
              <h2 className="text-sm font-semibold text-text-primary">
                Good morning, {user?.name.split(' ')[0]} 👋
              </h2>
              <p className="text-xs text-text-muted">
                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div 
              onClick={() => setCommandPaletteOpen(true)}
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-secondary border border-border-default rounded-md text-sm text-text-muted cursor-pointer w-64 transition-colors hover:border-border-strong"
            >
              <Search className="w-4 h-4" />
              <span>Search...</span>
              <kbd className="ml-auto text-[10px] bg-tertiary px-1.5 py-0.5 rounded border border-border-subtle font-mono">Cmd+K</kbd>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-x-hidden">
          <div className="max-w-7xl mx-auto h-full">
            <Outlet />
          </div>
        </main>
      </div>
      <CommandPalette open={commandPaletteOpen} onOpenChange={setCommandPaletteOpen} />
    </div>
  );
}
