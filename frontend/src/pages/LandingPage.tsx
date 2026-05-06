import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Brain, FileText, ChevronRight, PlayCircle, ShieldAlert, Zap, Search, Eye, Activity } from 'lucide-react';
import { motion, useScroll, useTransform } from 'framer-motion';

export default function LandingPage() {
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 500], [0, 100]);
  const [navScrolled, setNavScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setNavScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-primary text-text-primary overflow-x-hidden selection:bg-brand-primary/30">
      
      {/* Background Effects */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-brand-primary/10 blur-[120px] animate-float-slow" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-brand-secondary/10 blur-[120px] animate-float-medium" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wMykiLz48L3N2Zz4=')] opacity-50" />
      </div>

      {/* Navbar */}
      <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${navScrolled ? 'backdrop-blur-xl bg-black/40 border-b border-border-default shadow-sm' : 'bg-transparent'}`}>
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Brain className="w-6 h-6 text-brand-primary absolute -translate-x-1" />
              <FileText className="w-6 h-6 text-brand-secondary translate-x-2 translate-y-1" />
            </div>
            <span className="ml-3 font-bold text-lg tracking-tight">DocMind AI</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-text-secondary">
            <a href="#features" className="hover:text-text-primary transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-text-primary transition-colors">How it Works</a>
            <a href="#demo" className="hover:text-text-primary transition-colors">Demo</a>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/auth">
              <Button variant="ghost" size="sm">Sign In</Button>
            </Link>
            <Link to="/auth">
              <Button variant="gradient" size="sm">Get Started</Button>
            </Link>
          </div>
        </div>
      </nav>

      <main className="relative z-10 pt-32 pb-24">
        {/* Hero Section */}
        <section className="max-w-5xl mx-auto px-6 pt-16 pb-24 text-center">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border-strong bg-secondary/50 backdrop-blur-sm mb-8"
          >
            <span className="text-xl">✨</span>
            <span className="text-xs font-semibold uppercase tracking-wider text-text-secondary">Powered by Corrective RAG + Hallucination Detection</span>
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-5xl md:text-7xl font-bold tracking-tight leading-tight mb-6"
          >
            Your Documents, <br/>
            <span className="text-gradient">Intelligently</span> Answered
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-lg md:text-xl text-text-secondary max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            The AI that classifies your question, picks the right strategy, catches its own hallucinations, and tells you exactly how confident it is — before giving you the answer.
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link to="/auth">
              <Button variant="gradient" size="lg" className="w-full sm:w-auto text-base rounded-xl">
                Start for Free <ChevronRight className="w-5 h-5 ml-1" />
              </Button>
            </Link>
            <Button variant="ghost" size="lg" className="w-full sm:w-auto text-base">
              <PlayCircle className="w-5 h-5 mr-2" /> Watch Demo
            </Button>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mt-16 text-text-muted"
          >
            <p className="text-sm font-medium mb-4 uppercase tracking-widest">Trusted by 500+ researchers and analysts</p>
            <div className="flex items-center justify-center -space-x-3">
              {[1,2,3,4,5].map(i => (
                <div key={i} className="w-10 h-10 rounded-full border-2 border-primary bg-secondary overflow-hidden">
                  <img src={`https://i.pravatar.cc/100?img=${i}`} alt="Avatar" className="w-full h-full object-cover" />
                </div>
              ))}
              <div className="ml-6 flex items-center gap-1 text-semantic-warning">
                {'★★★★★'.split('').map((star, i) => <span key={i}>{star}</span>)}
              </div>
            </div>
          </motion.div>
        </section>

        {/* Features Section */}
        <section id="features" className="max-w-7xl mx-auto px-6 py-24">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Everything RAG should have been</h2>
            <p className="text-text-secondary text-lg">Built for teams who need answers they can trust.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, i) => (
              <div key={i} className="p-6 rounded-2xl bg-secondary/50 border border-border-default hover:border-brand-primary/40 transition-colors group">
                <div className="w-12 h-12 rounded-xl bg-tertiary flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                <p className="text-text-secondary leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-border-subtle bg-secondary/50 pt-16 pb-8 relative z-10">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Brain className="w-5 h-5 text-brand-primary" />
              <span className="font-bold">DocMind AI</span>
            </div>
            <p className="text-sm text-text-secondary">Your documents. Intelligently answered.</p>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Product</h4>
            <ul className="space-y-2 text-sm text-text-secondary">
              <li>Features</li>
              <li>Pricing</li>
              <li>Changelog</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Resources</h4>
            <ul className="space-y-2 text-sm text-text-secondary">
              <li>Documentation</li>
              <li>API Reference</li>
              <li>GitHub</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Company</h4>
            <ul className="space-y-2 text-sm text-text-secondary">
              <li>About</li>
              <li>Blog</li>
              <li>Privacy</li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-6 pt-8 border-t border-border-subtle text-sm text-text-muted text-center md:text-left flex flex-col md:flex-row items-center justify-between">
          <p>© 2026 DocMind AI. Built with ❤️</p>
        </div>
      </footer>
    </div>
  );
}

const features = [
  {
    icon: <Brain className="w-6 h-6 text-brand-primary" />,
    title: "Intelligent Query Routing",
    desc: "Automatically classifies your question and picks the optimal retrieval strategy — no manual selection needed."
  },
  {
    icon: <Search className="w-6 h-6 text-brand-secondary" />,
    title: "Corrective RAG",
    desc: "Evaluates every retrieved chunk for relevance. Retries with refined queries when results are poor."
  },
  {
    icon: <ShieldAlert className="w-6 h-6 text-semantic-warning" />,
    title: "Hallucination Detection",
    desc: "Extracts every factual claim and verifies each one against your documents before returning any answer."
  },
  {
    icon: <Activity className="w-6 h-6 text-semantic-success" />,
    title: "Confidence Scoring",
    desc: "Every answer comes with a 0-100% trust score built from 4 independent quality signals."
  },
  {
    icon: <Zap className="w-6 h-6 text-semantic-info" />,
    title: "Smart Fallback Chain",
    desc: "When documents are insufficient, seamlessly falls back to web search, general knowledge, or honest abstention."
  },
  {
    icon: <Eye className="w-6 h-6 text-brand-primary" />,
    title: "Full Decision Transparency",
    desc: "See every decision the agent made, why it made it, and how long each step took — complete auditability."
  }
];
