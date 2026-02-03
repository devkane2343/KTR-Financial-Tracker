import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { LogIn, UserPlus, Loader2, AlertCircle, Mail, ExternalLink } from 'lucide-react';

const LOGO_URL = '/logo.png';

type AuthMode = 'signin' | 'signup' | 'forgot-password';

export const AuthPage: React.FC = () => {
  const [mode, setMode] = useState<AuthMode>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const [signupSuccess, setSignupSuccess] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);

  const clearMessage = () => {
    setMessage(null);
    setSignupSuccess(false);
    setResetEmailSent(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setLoading(true);
    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: name.trim() || undefined },
            emailRedirectTo: `${window.location.origin}/`,
          },
        });
        if (error) throw error;
        setMessage({ type: 'success', text: 'Check your email to confirm your account.' });
        setSignupSuccess(true);
        setPassword('');
        setName('');
      } else if (mode === 'forgot-password') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/`,
        });
        if (error) throw error;
        setMessage({ type: 'success', text: 'Password reset email sent! Check your inbox.' });
        setResetEmailSent(true);
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
          <div className="border-4 border-slate-200 p-2 rounded-full shadow-lg w-24 h-24 flex items-center justify-center mb-4 bg-white">
            <img src={LOGO_URL} className="w-full h-full object-contain" alt="KTR Logo" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">KTR Financial Tracker</h1>
          <p className="text-slate-500 text-sm mt-1">Sign in to your account</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden">
          {mode !== 'forgot-password' && (
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
          )}

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {mode === 'forgot-password' && (
              <div className="mb-4">
                <button
                  type="button"
                  onClick={() => { setMode('signin'); clearMessage(); }}
                  className="text-sm text-slate-600 hover:text-red-600 transition-colors"
                >
                  ← Back to sign in
                </button>
                <h3 className="text-lg font-bold text-slate-900 mt-2 mb-1">Reset Password</h3>
                <p className="text-sm text-slate-600">
                  Enter your email and we&apos;ll send you a link to reset your password.
                </p>
              </div>
            )}

            {mode === 'signup' && (
              <div>
                <label htmlFor="auth-name" className="block text-sm font-medium text-slate-700 mb-1">
                  Name
                </label>
                <input
                  id="auth-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  autoComplete="name"
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>
            )}
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
            {mode !== 'forgot-password' && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="auth-password" className="block text-sm font-medium text-slate-700">
                    Password
                  </label>
                  {mode === 'signin' && (
                    <button
                      type="button"
                      onClick={() => { setMode('forgot-password'); clearMessage(); }}
                      className="text-xs text-red-600 hover:text-red-700 font-medium transition-colors"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
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
            )}

            {message && (
              <div
                className={`px-3 py-3 rounded-lg text-sm space-y-2 ${
                  message.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'
                }`}
              >
                {message.type === 'success' && signupSuccess ? (
                  <>
                    <div className="flex items-center gap-2 font-semibold">
                      <Mail className="w-4 h-4 shrink-0" />
                      Confirm your email to KTR Financial Tracker
                    </div>
                    <p className="text-emerald-800/90">
                      Check your email to confirm your account. If you don&apos;t see it, check your spam folder.
                    </p>
                    <p className="text-emerald-800/90 pt-1">
                      Made by{' '}
                      <a
                        href="https://kanereroma.vercel.app"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 font-medium underline hover:no-underline"
                      >
                        kanereroma.vercel.app
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </p>
                  </>
                ) : (
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{message.text}</span>
                  </div>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || (mode === 'forgot-password' && resetEmailSent)}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors shadow-lg shadow-red-900/20"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {mode === 'signup' ? 'Creating account…' : mode === 'forgot-password' ? 'Sending…' : 'Signing in…'}
                </>
              ) : mode === 'signup' ? (
                'Create account'
              ) : mode === 'forgot-password' ? (
                resetEmailSent ? 'Email sent' : 'Send reset link'
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
