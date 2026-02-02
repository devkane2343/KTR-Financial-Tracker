import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { LogIn, UserPlus, Loader2, AlertCircle } from 'lucide-react';

const LOGO_URL = '/logo.png';

type AuthMode = 'signin' | 'signup';

export const AuthPage: React.FC = () => {
  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  const clearMessage = () => setMessage(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setLoading(true);
    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMessage({ type: 'success', text: 'Check your email to confirm your account.' });
        setPassword('');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        setMessage({ type: 'success', text: 'Signed in.' });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setMessage({ type: 'error', text: msg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-slate-900 p-1.5 rounded-full shadow-lg w-14 h-14 flex items-center justify-center mb-4">
            <img src={LOGO_URL} className="w-full h-full object-contain" alt="KTR Logo" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">KTR Financial Tracker</h1>
          <p className="text-slate-500 text-sm mt-1">Sign in to your account</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden">
          <div className="flex border-b border-slate-200">
            <button
              type="button"
              onClick={() => { setMode('signin'); clearMessage(); }}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
                mode === 'signin' ? 'bg-red-50 text-red-700 border-b-2 border-red-600' : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              <LogIn className="w-4 h-4" />
              Sign in
            </button>
            <button
              type="button"
              onClick={() => { setMode('signup'); clearMessage(); }}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
                mode === 'signup' ? 'bg-red-50 text-red-700 border-b-2 border-red-600' : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              <UserPlus className="w-4 h-4" />
              Sign up
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <label htmlFor="auth-email" className="block text-sm font-medium text-slate-700 mb-1">
                Email
              </label>
              <input
                id="auth-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoComplete="email"
                className="w-full px-4 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>
            <div>
              <label htmlFor="auth-password" className="block text-sm font-medium text-slate-700 mb-1">
                Password
              </label>
              <input
                id="auth-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
              {mode === 'signup' && (
                <p className="text-xs text-slate-500 mt-1">At least 6 characters</p>
              )}
            </div>

            {message && (
              <div
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
                  message.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'
                }`}
              >
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{message.text}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors shadow-lg shadow-red-900/20"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {mode === 'signup' ? 'Creating account…' : 'Signing in…'}
                </>
              ) : mode === 'signup' ? (
                'Create account'
              ) : (
                'Sign in'
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">
          Your data is stored securely and only you can see it.
        </p>
      </div>
    </div>
  );
};

export default AuthPage;
