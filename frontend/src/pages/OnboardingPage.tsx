import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/components/auth/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from "@/store/useStore";
import {
  UploadCloud,
  ArrowRight,
  Brain,
  Zap,
  ShieldAlert,
  Sparkles,
  FileText,
  Send,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function OnboardingPage() {
  const [step, setStep] = useState(1);
  const [isUploading, setIsUploading] = useState(false);
  const { user } = useAuth();
  const { uploadDocument } = useStore();
  const navigate = useNavigate();

  const handleNext = () => {
    if (step < 3) setStep(step + 1);
    else navigate('/dashboard');
  };

  const handleUpload = async () => {
    
    const blob = new Blob(["Sample onboarding document content"], { type: "text/plain" });
    const file = new File([blob], "welcome_guide.txt", { type: "text/plain" });

    setIsUploading(true);
    try {
      await uploadDocument(file, ['Onboarding']);
      setIsUploading(false);
      handleNext();
    } catch (error) {
      console.error("Onboarding upload failed", error);
      setIsUploading(false);
      // Still proceed to next step for demo purposes but log error
      handleNext();
    }
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#ffffff' }}>

      {/* ── Top Progress Bar ── */}
      <div className="h-1.5 w-full" style={{ background: '#e5e7eb' }}>
        <div
          className="h-full transition-all duration-500 ease-out"
          style={{
            width: `${(step / 3) * 100}%`,
            background: '#0a0a0a',
          }}
        />
      </div>

      {/* ── Step indicator dots ── */}
      <div className="flex justify-center gap-2 pt-6">
        {[1, 2, 3].map((s) => (
          <div
            key={s}
            className="rounded-full transition-all duration-300"
            style={{
              width: s === step ? 24 : 8,
              height: 8,
              background: s === step ? '#0a0a0a' : s < step ? '#555555' : '#d1d5db',
            }}
          />
        ))}
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-2xl">
          <AnimatePresence mode="wait">

            {/* ── Step 1: Welcome ── */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="text-center"
              >
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-8"
                  style={{
                    background: '#f4f4f5',
                    border: '1px solid #d0d0d0',
                  }}
                >
                  <Sparkles className="w-8 h-8" style={{ color: '#0a0a0a' }} />
                </div>

                <h1
                  className="text-3xl md:text-4xl font-bold mb-4"
                  style={{ color: '#0a0a0a' }}
                >
                  Welcome to DocMind AI, {user?.name.split(' ')[0]}! 👋
                </h1>
                <p
                  className="text-lg mb-12 max-w-lg mx-auto"
                  style={{ color: '#555555' }}
                >
                  You're about to experience a new standard in document
                  intelligence. Here's how your AI agent thinks for you:
                </p>

                {/* Feature cards */}
                <div className="grid md:grid-cols-3 gap-6 mb-12 text-left">
                  {[
                    {
                      icon: <Brain className="w-6 h-6" style={{ color: '#0a0a0a' }} />,
                      title: 'Smart Routing',
                      desc: 'Classifies questions automatically to pick the best strategy.',
                    },
                    {
                      icon: <ShieldAlert className="w-6 h-6" style={{ color: '#d97706' }} />,
                      title: 'Self-Correction',
                      desc: 'Catches hallucinations and verifies factual claims.',
                    },
                    {
                      icon: <Zap className="w-6 h-6" style={{ color: '#059669' }} />,
                      title: 'Confidence Scores',
                      desc: 'Every answer comes with a transparent trust score.',
                    },
                  ].map(({ icon, title, desc }) => (
                    <div
                      key={title}
                      className="p-5 rounded-xl"
                      style={{
                        background: '#f9f9f9',
                        border: '1px solid #e0e0e0',
                      }}
                    >
                      <div className="mb-3">{icon}</div>
                      <h3
                        className="font-semibold mb-2"
                        style={{ color: '#0a0a0a' }}
                      >
                        {title}
                      </h3>
                      <p className="text-sm" style={{ color: '#666666' }}>
                        {desc}
                      </p>
                    </div>
                  ))}
                </div>

                <button
                  onClick={handleNext}
                  className="inline-flex items-center gap-2 px-8 py-3 rounded-lg text-sm font-medium transition-all"
                  style={{
                    background: '#0a0a0a',
                    color: '#ffffff',
                    border: 'none',
                    cursor: 'pointer',
                    minWidth: 200,
                    justifyContent: 'center',
                  }}
                  onMouseEnter={(e) =>
                    ((e.currentTarget as HTMLButtonElement).style.background = '#1a1a1a')
                  }
                  onMouseLeave={(e) =>
                    ((e.currentTarget as HTMLButtonElement).style.background = '#0a0a0a')
                  }
                >
                  Next <ArrowRight className="w-4 h-4" />
                </button>
              </motion.div>
            )}

            {/* ── Step 2: Upload ── */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="text-center"
              >
                <h2
                  className="text-3xl font-bold mb-3"
                  style={{ color: '#0a0a0a' }}
                >
                  Upload your first document
                </h2>
                <p className="mb-10" style={{ color: '#555555' }}>
                  Drop a PDF, TXT, or DOCX file below to get started.
                </p>

                {/* Drop zone */}
                <div
                  className={cn(
                    'relative rounded-2xl p-12 transition-all duration-300',
                    !isUploading && 'cursor-pointer'
                  )}
                  style={{
                    border: isUploading
                      ? '2px dashed #0a0a0a'
                      : '2px dashed #c8c8c8',
                    background: isUploading ? '#f4f4f5' : '#fafafa',
                  }}
                  onClick={!isUploading ? handleUpload : undefined}
                  onMouseEnter={(e) => {
                    if (!isUploading) {
                      (e.currentTarget as HTMLDivElement).style.borderColor = '#555555';
                      (e.currentTarget as HTMLDivElement).style.background = '#f4f4f5';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isUploading) {
                      (e.currentTarget as HTMLDivElement).style.borderColor = '#c8c8c8';
                      (e.currentTarget as HTMLDivElement).style.background = '#fafafa';
                    }
                  }}
                >
                  {isUploading ? (
                    <div className="flex flex-col items-center">
                      <div className="w-16 h-16 relative mb-6">
                        <svg
                          className="animate-spin w-full h-full"
                          viewBox="0 0 24 24"
                          style={{ color: '#d0d0d0' }}
                        >
                          <circle
                            cx="12" cy="12" r="10"
                            stroke="currentColor" strokeWidth="4" fill="none"
                            className="opacity-25"
                          />
                          <path
                            fill="currentColor"
                            className="opacity-75"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          />
                        </svg>
                        <FileText
                          className="w-6 h-6 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
                          style={{ color: '#0a0a0a' }}
                        />
                      </div>
                      <h3
                        className="text-lg font-semibold mb-2"
                        style={{ color: '#0a0a0a' }}
                      >
                        Processing Document...
                      </h3>
                      <p className="text-sm" style={{ color: '#888888' }}>
                        Chunking &amp; extracting entities
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <div
                        className="w-16 h-16 rounded-full flex items-center justify-center mb-6"
                        style={{
                          background: '#f4f4f5',
                          border: '1px solid #d0d0d0',
                        }}
                      >
                        <UploadCloud className="w-8 h-8" style={{ color: '#555555' }} />
                      </div>
                      <h3
                        className="text-lg font-semibold mb-2"
                        style={{ color: '#0a0a0a' }}
                      >
                        Click to browse or drag &amp; drop
                      </h3>
                      <p className="text-sm" style={{ color: '#888888' }}>
                        Supported formats: PDF, TXT, DOCX, MD (Max 50MB)
                      </p>
                    </div>
                  )}
                </div>

                <div className="mt-8">
                  <button
                    onClick={handleNext}
                    className="text-sm transition-colors underline underline-offset-4"
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#888888',
                    }}
                    onMouseEnter={(e) =>
                      ((e.currentTarget as HTMLButtonElement).style.color = '#0a0a0a')
                    }
                    onMouseLeave={(e) =>
                      ((e.currentTarget as HTMLButtonElement).style.color = '#888888')
                    }
                  >
                    Skip for now — use our sample document instead
                  </button>
                </div>
              </motion.div>
            )}

            {/* ── Step 3: First Query ── */}
            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="w-full"
              >
                <div className="text-center mb-10">
                  <h2
                    className="text-3xl font-bold mb-3"
                    style={{ color: '#0a0a0a' }}
                  >
                    Ask your first question
                  </h2>
                  <p style={{ color: '#555555' }}>
                    Try querying the document you just uploaded.
                  </p>
                </div>

                {/* Chat preview card */}
                <div
                  className="rounded-xl p-6 relative overflow-hidden"
                  style={{
                    background: '#f9f9f9',
                    border: '1px solid #e0e0e0',
                  }}
                >
                  {/* Left accent bar */}
                  <div
                    className="absolute top-0 left-0 w-1 h-full"
                    style={{ background: '#0a0a0a' }}
                  />

                  <div className="flex gap-4 mb-6">
                    {/* Avatar */}
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                      style={{
                        background: '#e5e7eb',
                        border: '1px solid #c8c8c8',
                      }}
                    >
                      <span
                        className="text-sm font-bold"
                        style={{ color: '#0a0a0a' }}
                      >
                        {user?.avatar_initials}
                      </span>
                    </div>

                    {/* Query bubble */}
                    <div
                      className="flex-1 rounded-lg px-4 py-3"
                      style={{
                        background: '#ffffff',
                        border: '1px solid #e0e0e0',
                        color: '#0a0a0a',
                        fontSize: 14,
                      }}
                    >
                      What are the key findings in this document?
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      onClick={handleNext}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all"
                      style={{
                        background: '#0a0a0a',
                        color: '#ffffff',
                        border: 'none',
                        cursor: 'pointer',
                      }}
                      onMouseEnter={(e) =>
                        ((e.currentTarget as HTMLButtonElement).style.background = '#1a1a1a')
                      }
                      onMouseLeave={(e) =>
                        ((e.currentTarget as HTMLButtonElement).style.background = '#0a0a0a')
                      }
                    >
                      <Send className="w-4 h-4" /> Ask Now
                    </button>
                  </div>
                </div>

                <div className="mt-8 text-center">
                  <p className="text-sm mb-4" style={{ color: '#888888' }}>
                    The agent will process your query, retrieve relevant chunks,
                    and check for hallucinations before answering.
                  </p>
                  <button
                    onClick={() => navigate('/dashboard')}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all"
                    style={{
                      background: '#ffffff',
                      color: '#0a0a0a',
                      border: '1px solid #c8c8c8',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.background = '#f4f4f5';
                      (e.currentTarget as HTMLButtonElement).style.borderColor = '#999999';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.background = '#ffffff';
                      (e.currentTarget as HTMLButtonElement).style.borderColor = '#c8c8c8';
                    }}
                  >
                    Go to Dashboard <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}