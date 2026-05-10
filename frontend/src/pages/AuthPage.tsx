import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { Input } from '@/components/ui/Input';
import { Brain, FileText } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '@/components/auth/AuthContext';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Redirect already-authenticated users away from the auth page
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const endpoint = isLogin ? '/auth/login' : '/auth/register';
      const payload = isLogin
        ? { email, password }
        : { name, email, password };

      const response = await axios.post(`${API_URL}${endpoint}`, payload);
      const { token, user } = response.data;

      login({
        name: user.name,
        email: user.email,
        avatar_initials: user.avatar_initials,
        joined_date: user.joined_date,
        plan: user.plan,
        token,
      });

      navigate(isLogin ? '/dashboard' : '/onboarding', { replace: true });
    } catch (err: any) {
      const detail =
        err?.response?.data?.detail || err?.message || 'An unexpected error occurred.';
      setError(typeof detail === 'string' ? detail : JSON.stringify(detail));
    } finally {
      setLoading(false);
    }
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
              onClick={() => { setIsLogin(true); setError(''); }}
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
              onClick={() => { setIsLogin(false); setError(''); }}
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

          {/* Error message */}
          {error && (
            <div className="mb-4 p-3 rounded-lg text-sm" style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}>
              {error}
            </div>
          )}

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

          {/* Security Notice */}
          <div className="mt-8 p-4 rounded-lg flex items-start gap-3" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
            <div className="mt-0.5" style={{ color: '#6366f1' }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>
            </div>
            <div>
              <p className="text-sm font-medium" style={{ color: '#0f172a' }}>Secure Authentication</p>
              <p className="text-xs mt-1 leading-relaxed" style={{ color: '#64748b' }}>
                Your connection is encrypted. Passwords are hashed with bcrypt and never stored in plain text.
              </p>
            </div>
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