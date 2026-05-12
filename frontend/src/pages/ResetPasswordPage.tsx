import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Input } from '@/components/ui/Input';
import { Brain, FileText } from 'lucide-react';
import { motion } from 'framer-motion';
import axios from 'axios';
import { toast } from 'sonner';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // If no token is provided in the URL, redirect to auth
  useEffect(() => {
    if (!token) {
      toast.error('Invalid or missing password reset token.');
      navigate('/auth', { replace: true });
    }
  }, [token, navigate]);

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
    if (!token) return;

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await axios.post(`${API_URL}/auth/reset-password`, {
        token,
        new_password: password,
      });

      toast.success('Password successfully reset! You can now sign in.');
      navigate('/auth', { replace: true });
    } catch (err: any) {
      const detail =
        err?.response?.data?.detail || err?.message || 'Failed to reset password.';
      setError(typeof detail === 'string' ? detail : JSON.stringify(detail));
    } finally {
      setLoading(false);
    }
  };

  if (!token) return null; // Prevent rendering while useEffect redirects

  return (
    <div className="flex min-h-screen bg-white">
      {/* ── Left Panel ── */}
      <div className="hidden lg:flex w-[45%] relative overflow-hidden flex-col justify-between p-12"
        style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)' }}>

        <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full opacity-10 blur-[80px]"
          style={{ background: '#ffffff' }} />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 rounded-full opacity-20 blur-[80px]"
          style={{ background: '#6366f1' }} />

        <div className="relative z-10 flex items-center gap-2 text-white">
          <div className="relative">
            <Brain className="w-8 h-8 absolute -translate-x-1" />
            <FileText className="w-8 h-8 translate-x-2 translate-y-1 opacity-80" />
          </div>
          <span className="ml-4 font-bold text-2xl tracking-tight">DocMind AI</span>
        </div>

        <motion.div
          className="relative z-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h1 className="text-4xl font-bold text-white leading-tight mb-6">
            Securely reset your password
          </h1>
          <p className="text-white/80 text-lg max-w-md leading-relaxed">
            Create a strong, new password to regain access to your DocMind AI workspace.
          </p>
        </motion.div>

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
          <div className="mb-8 text-center lg:text-left">
            <h2 className="text-3xl font-bold mb-2" style={{ color: '#0a0a0a' }}>
              Create New Password
            </h2>
            <p style={{ color: '#555555' }}>
              Enter your new password below.
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg text-sm" style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1">
              <label className="text-sm font-medium" style={{ color: '#1a1a1a' }}>
                New Password
              </label>
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

              {password.length > 0 && (
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

            <div className="space-y-1">
              <label className="text-sm font-medium" style={{ color: '#1a1a1a' }}>
                Confirm Password
              </label>
              <Input
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                style={{
                  border: '1px solid #c8c8c8',
                  color: '#0a0a0a',
                  background: '#ffffff',
                }}
              />
            </div>

            <button
              type="submit"
              disabled={loading || password.length < 6}
              className="w-full mt-6 h-10 rounded-lg text-sm font-medium transition-all"
              style={{
                background: (loading || password.length < 6) ? '#444444' : '#0a0a0a',
                color: '#ffffff',
                border: 'none',
                cursor: (loading || password.length < 6) ? 'not-allowed' : 'pointer',
                opacity: (loading || password.length < 6) ? 0.8 : 1,
              }}
            >
              {loading ? 'Saving...' : 'Save Password'}
            </button>
          </form>

          <div className="mt-8 text-center">
            <button
              type="button"
              onClick={() => navigate('/auth')}
              className="text-sm font-medium hover:underline transition-all"
              style={{ color: '#6366f1' }}
            >
              Cancel and back to sign in
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
