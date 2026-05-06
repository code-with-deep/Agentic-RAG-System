import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Brain, FileText } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '@/components/auth/AuthContext';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const getPasswordStrength = () => {
    if (password.length === 0) return 0;
    if (password.length < 6) return 25;
    if (password.length < 10) return 50;
    if (/[A-Z]/.test(password) && /[0-9]/.test(password)) return 100;
    return 75;
  };

  const strength = getPasswordStrength();
  const strengthColor =
    strength < 50
      ? 'bg-red-500'
      : strength < 100
      ? 'bg-amber-500'
      : 'bg-emerald-500';
  const strengthLabel =
    strength < 50 ? 'Weak' : strength < 100 ? 'Good' : 'Strong';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    setTimeout(() => {
      login({
        name: isLogin ? 'Demo User' : name,
        email,
        avatar_initials: isLogin ? 'DU' : name.substring(0, 2).toUpperCase(),
        joined_date: new Date().toISOString(),
        plan: 'free',
      });
      navigate(isLogin ? '/dashboard' : '/onboarding');
    }, 1000);
  };

  return (
    <div className="flex min-h-screen bg-white">
      {/* ── Left Panel ── */}
      <div className="hidden lg:flex w-[45%] relative overflow-hidden flex-col justify-between p-12"
        style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)' }}>

        {/* Decorative orbs */}
        <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full opacity-10 blur-[80px]"
          style={{ background: '#ffffff' }} />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 rounded-full opacity-20 blur-[80px]"
          style={{ background: '#6366f1' }} />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-2 text-white">
          <div className="relative">
            <Brain className="w-8 h-8 absolute -translate-x-1" />
            <FileText className="w-8 h-8 translate-x-2 translate-y-1 opacity-80" />
          </div>
          <span className="ml-4 font-bold text-2xl tracking-tight">DocMind AI</span>
        </div>

        {/* Headline */}
        <motion.div
          className="relative z-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h1 className="text-4xl font-bold text-white leading-tight mb-6">
            Stop searching.<br />Start knowing.
          </h1>
          <p className="text-white/80 text-lg max-w-md leading-relaxed">
            Join 500+ forward-thinking teams who use our agentic RAG platform
            to turn static documents into interactive knowledge bases.
          </p>
        </motion.div>

        {/* Avatars */}
        <div className="relative z-10">
          <div className="flex items-center gap-4 mb-6">
            <div className="flex -space-x-2">
              {[1, 2, 3].map((i) => (
                <img
                  key={i}
                  src={`https://i.pravatar.cc/100?img=${i + 10}`}
                  className="w-10 h-10 rounded-full border-2"
                  style={{ borderColor: '#16213e' }}
                  alt="avatar"
                />
              ))}
            </div>
            <div className="text-white/90 text-sm font-medium">
              Join 500+ researchers &amp; analysts
            </div>
          </div>
        </div>
      </div>

      {/* ── Right Panel ── */}
      <div className="flex-1 flex flex-col justify-center items-center p-8 sm:p-12 bg-white">
        <div className="w-full max-w-[420px]">

          {/* Header */}
          <div className="mb-8 text-center lg:text-left">
            <h2 className="text-3xl font-bold mb-2" style={{ color: '#0a0a0a' }}>
              {isLogin ? 'Welcome back' : 'Create an account'}
            </h2>
            <p style={{ color: '#555555' }}>
              {isLogin
                ? 'Enter your details to sign in to your workspace'
                : 'Sign up to start chatting with your documents'}
            </p>
          </div>

          {/* Tabs */}
          <div
            className="flex p-1 rounded-lg mb-8"
            style={{
              background: '#f4f4f5',
              border: '1px solid #e0e0e0',
            }}
          >
            <button
              type="button"
              onClick={() => setIsLogin(true)}
              className="flex-1 py-2 text-sm font-medium rounded-md transition-all"
              style={{
                background: isLogin ? '#ffffff' : 'transparent',
                color: isLogin ? '#0a0a0a' : '#666666',
                border: isLogin ? '1px solid #d0d0d0' : '1px solid transparent',
                boxShadow: isLogin ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              }}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => setIsLogin(false)}
              className="flex-1 py-2 text-sm font-medium rounded-md transition-all"
              style={{
                background: !isLogin ? '#ffffff' : 'transparent',
                color: !isLogin ? '#0a0a0a' : '#666666',
                border: !isLogin ? '1px solid #d0d0d0' : '1px solid transparent',
                boxShadow: !isLogin ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              }}
            >
              Sign Up
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Name field (signup only) */}
            {!isLogin && (
              <div className="space-y-1">
                <label className="text-sm font-medium" style={{ color: '#1a1a1a' }}>
                  Full Name
                </label>
                <Input
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  style={{
                    border: '1px solid #c8c8c8',
                    color: '#0a0a0a',
                    background: '#ffffff',
                  }}
                />
              </div>
            )}

            {/* Email */}
            <div className="space-y-1">
              <label className="text-sm font-medium" style={{ color: '#1a1a1a' }}>
                Work Email
              </label>
              <Input
                type="email"
                placeholder="john@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{
                  border: '1px solid #c8c8c8',
                  color: '#0a0a0a',
                  background: '#ffffff',
                }}
              />
            </div>

            {/* Password */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium" style={{ color: '#1a1a1a' }}>
                  Password
                </label>
                {isLogin && (
                  <a
                    href="#"
                    className="text-xs hover:underline"
                    style={{ color: '#4f46e5' }}
                  >
                    Forgot password?
                  </a>
                )}
              </div>
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{
                  border: '1px solid #c8c8c8',
                  color: '#0a0a0a',
                  background: '#ffffff',
                }}
              />

              {/* Password strength (signup only) */}
              {!isLogin && password.length > 0 && (
                <div className="mt-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs" style={{ color: '#888888' }}>
                      Password strength
                    </span>
                    <span className="text-xs font-medium" style={{ color: '#444444' }}>
                      {strengthLabel}
                    </span>
                  </div>
                  <div
                    className="h-1.5 w-full rounded-full overflow-hidden"
                    style={{ background: '#e5e7eb' }}
                  >
                    <div
                      className={`h-full transition-all duration-300 rounded-full ${strengthColor}`}
                      style={{ width: `${strength}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-6 h-10 rounded-lg text-sm font-medium transition-all"
              style={{
                background: loading ? '#444444' : '#0a0a0a',
                color: '#ffffff',
                border: 'none',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.8 : 1,
              }}
            >
              {loading
                ? 'Please wait…'
                : isLogin
                ? 'Sign In'
                : 'Create Account'}
            </button>
          </form>

          {/* Divider */}
          <div className="mt-8 flex items-center">
            <div className="flex-grow" style={{ borderTop: '1px solid #e0e0e0' }} />
            <span
              className="px-4 text-xs uppercase tracking-wider"
              style={{ color: '#999999' }}
            >
              Or continue with
            </span>
            <div className="flex-grow" style={{ borderTop: '1px solid #e0e0e0' }} />
          </div>

          {/* Social buttons */}
          <div className="mt-6 grid grid-cols-2 gap-4">
            {['Google', 'GitHub'].map((provider) => (
              <button
                key={provider}
                type="button"
                className="w-full h-10 rounded-lg text-sm font-medium transition-all"
                style={{
                  background: '#ffffff',
                  color: '#1a1a1a',
                  border: '1px solid #c8c8c8',
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
                {provider}
              </button>
            ))}
          </div>

          {/* Terms (signup only) */}
          {!isLogin && (
            <p className="mt-8 text-center text-xs" style={{ color: '#888888' }}>
              By signing up, you agree to our{' '}
              <a
                href="#"
                className="underline"
                style={{ color: '#555555' }}
                onMouseEnter={(e) =>
                  ((e.currentTarget as HTMLAnchorElement).style.color = '#0a0a0a')
                }
                onMouseLeave={(e) =>
                  ((e.currentTarget as HTMLAnchorElement).style.color = '#555555')
                }
              >
                Terms of Service
              </a>{' '}
              and{' '}
              <a
                href="#"
                className="underline"
                style={{ color: '#555555' }}
                onMouseEnter={(e) =>
                  ((e.currentTarget as HTMLAnchorElement).style.color = '#0a0a0a')
                }
                onMouseLeave={(e) =>
                  ((e.currentTarget as HTMLAnchorElement).style.color = '#555555')
                }
              >
                Privacy Policy
              </a>
              .
            </p>
          )}
        </div>
      </div>
    </div>
  );
}