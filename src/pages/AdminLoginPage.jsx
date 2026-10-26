import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Shield,
  Lock,
  Mail,
  ArrowLeft,
  KeyRound,
  AlertCircle,
  Sparkles,
  Database,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const { signIn, demoLogin, isConfigured, isAdmin } = useAuth();
  const { addToast } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (isAdmin) {
    navigate('/admin');
    return null;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg('Please enter both email and password.');
      return;
    }

    try {
      setLoading(true);
      setErrorMsg('');
      await signIn(email, password);
      addToast('Welcome back to Study Hub Admin!', 'success');
      navigate('/admin');
    } catch (err) {
      setErrorMsg(err.message || 'Authentication failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemoLogin = () => {
    demoLogin();
    addToast('Logged in as Study Hub Admin (Demo Mode)', 'success');
    navigate('/admin');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-[#070B14] text-white">
      <div className="w-full max-w-md">
        {/* Back link */}
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Study Hub
        </Link>

        {/* Card */}
        <div className="bg-[#0B1120] border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center text-white mx-auto shadow-lg shadow-blue-500/25 mb-4">
              <Shield className="w-7 h-7" />
            </div>
            <h1 className="text-2xl font-black text-white">
              Study Hub Admin Portal
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Authorized university personnel only
            </p>
          </div>

          {/* Backend Status */}
          <div className="mb-6 p-3 rounded-2xl border text-xs flex items-center gap-2.5 bg-[#0F172A] border-slate-800 text-slate-300">
            <Database className="w-4 h-4 text-blue-400 shrink-0" />
            <span>
              Backend: {isConfigured ? (
                <strong className="text-emerald-400">Connected to Supabase</strong>
              ) : (
                <strong className="text-amber-400">Local Demo Mode Active</strong>
              )}
            </span>
          </div>

          {/* Error alert */}
          {errorMsg && (
            <div className="mb-6 p-3.5 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Admin Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@studyhub.edu"
                  required
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <KeyRound className="w-4 h-4" />
              )}
              Sign In to Admin Portal
            </button>
          </form>

          {/* Quick Demo Access Box */}
          {!isConfigured && (
            <div className="mt-6 pt-6 border-t border-slate-800">
              <div className="p-3.5 rounded-2xl bg-amber-950/20 border border-amber-800/40 text-amber-200 text-xs">
                <p className="font-bold flex items-center gap-1.5 mb-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  Testing Demo Credentials:
                </p>
                <p>Email: <code className="bg-amber-900/40 px-1 py-0.5 rounded font-mono">admin@csstudyhub.edu</code></p>
                <p className="mt-0.5">Password: <code className="bg-amber-900/40 px-1 py-0.5 rounded font-mono">admin123</code></p>
              </div>

              <button
                type="button"
                onClick={handleQuickDemoLogin}
                className="mt-3 w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2"
              >
                One-Click Quick Login (Demo Mode)
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
