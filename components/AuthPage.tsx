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
      
      // Provide user-friendly error messages
      let displayMsg = msg;
      if (msg.toLowerCase().includes('rate limit') || msg.toLowerCase().includes('email rate')) {
        displayMsg = 'Too many attempts. Please wait a few minutes and try again, or contact support if this persists.';
      } else if (msg.toLowerCase().includes('invalid login')) {
        displayMsg = 'Invalid email or password. Please try again.';
      } else if (msg.toLowerCase().includes('email not confirmed')) {
        displayMsg = 'Please check your email and confirm your account before signing in.';
      }
      
      setMessage({ type: 'error', text: displayMsg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-paper flex flex-col lg:flex-row relative overflow-hidden">
      {/* Editorial cover panel */}
      <div className="lg:w-1/2 relative bg-ink text-paper p-10 lg:p-16 flex flex-col justify-between min-h-[40vh] lg:min-h-screen overflow-hidden">
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-jade-500/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-40 -left-20 w-[28rem] h-[28rem] rounded-full bg-gold-500/15 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex items-center gap-3">
          <img src={LOGO_URL} className="w-9 h-9 object-contain" alt="" />
          <div>
            <p className="font-display text-lg leading-none">KTR <em className="not-italic text-jade-200">/</em> Financial Journal</p>
            <p className="eyebrow text-paper/45 mt-1">Volume I &middot; The Personal Ledger</p>
          </div>
        </div>

        <div className="relative z-10 my-12 lg:my-0">
          <p className="eyebrow text-gold-300 mb-4">Foreword</p>
          <h1 className="font-display text-4xl lg:text-6xl leading-[0.92] tracking-tight">
            Wealth is built<br />
            <em className="text-gold-300" style={{ fontStyle: 'italic' }}>quietly,</em><br />
            in entries kept<br />
            <em className="text-jade-200" style={{ fontStyle: 'italic' }}>honestly.</em>
          </h1>
          <p className="text-paper/65 text-base lg:text-lg leading-relaxed max-w-md mt-8">
            Log every paycheck. Settle every bill. Watch the discipline compound — a private journal of your financial year.
          </p>
        </div>

        <div className="relative z-10 grid grid-cols-3 gap-4 max-w-md">
          <div>
            <p className="font-display text-2xl text-paper">7</p>
            <p className="eyebrow text-paper/45 text-[9px]">Categories tracked</p>
          </div>
          <div>
            <p className="font-display text-2xl text-paper">∞</p>
            <p className="eyebrow text-paper/45 text-[9px]">Months archived</p>
          </div>
          <div>
            <p className="font-display text-2xl text-paper">100%</p>
            <p className="eyebrow text-paper/45 text-[9px]">Yours alone</p>
          </div>
        </div>
      </div>

      {/* Auth panel */}
      <div className="lg:w-1/2 flex items-center justify-center p-6 lg:p-12 relative">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <p className="eyebrow mb-2">Section &middot; Access</p>
            <h2 className="font-display text-3xl lg:text-4xl text-ink leading-tight">
              {mode === 'signup' ? 'Begin your journal.' : mode === 'forgot-password' ? 'Recover your access.' : 'Welcome back.'}
            </h2>
            {mode !== 'forgot-password' && (
              <p className="text-ink-muted text-sm mt-2 leading-relaxed">
                {mode === 'signup' ? 'Create an account to start your private financial record.' : 'Continue keeping the ledger.'}
              </p>
            )}
          </div>

          {mode !== 'forgot-password' && (
            <div className="flex gap-1 mb-6 p-1 bg-ink/5 rounded-full w-fit">
              <button
                type="button"
                onClick={() => { setMode('signin'); clearMessage(); }}
                className={`px-4 py-1.5 text-xs font-medium rounded-full transition-all flex items-center gap-1.5 ${
                  mode === 'signin' ? 'bg-ink text-paper' : 'text-ink-muted hover:text-ink'
                }`}
              >
                <LogIn className="w-3.5 h-3.5" />
                Sign in
              </button>
              <button
                type="button"
                onClick={() => { setMode('signup'); clearMessage(); }}
                className={`px-4 py-1.5 text-xs font-medium rounded-full transition-all flex items-center gap-1.5 ${
                  mode === 'signup' ? 'bg-ink text-paper' : 'text-ink-muted hover:text-ink'
                }`}
              >
                <UserPlus className="w-3.5 h-3.5" />
                Sign up
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {mode === 'forgot-password' && (
              <button
                type="button"
                onClick={() => { setMode('signin'); clearMessage(); }}
                className="text-xs text-ink-muted hover:text-ink transition-colors"
              >
                ← Back to sign in
              </button>
            )}

            {mode === 'signup' && (
              <div>
                <label htmlFor="auth-name" className="eyebrow mb-1.5 block">Name</label>
                <input
                  id="auth-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  autoComplete="name"
                  className="w-full px-0 py-2 bg-transparent border-0 border-b border-rule focus:border-ink focus:ring-0 outline-none text-base text-ink placeholder:text-ink-whisper transition-colors"
                />
              </div>
            )}
            <div>
              <label htmlFor="auth-email" className="eyebrow mb-1.5 block">Email</label>
              <input
                id="auth-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoComplete="email"
                className="w-full px-0 py-2 bg-transparent border-0 border-b border-rule focus:border-ink focus:ring-0 outline-none text-base text-ink placeholder:text-ink-whisper transition-colors"
              />
            </div>
            {mode !== 'forgot-password' && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="auth-password" className="eyebrow">Password</label>
                  {mode === 'signin' && (
                    <button
                      type="button"
                      onClick={() => { setMode('forgot-password'); clearMessage(); }}
                      className="text-[11px] text-ink-muted hover:text-ink transition-colors"
                    >
                      Forgot?
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
                  className="w-full px-0 py-2 bg-transparent border-0 border-b border-rule focus:border-ink focus:ring-0 outline-none text-base text-ink placeholder:text-ink-whisper font-mono transition-colors"
                />
                {mode === 'signup' && (
                  <p className="text-[11px] text-ink-muted mt-2">At least 6 characters</p>
                )}
              </div>
            )}

            {message && (
              <div
                className={`p-4 rounded-xl text-sm space-y-2 ${
                  message.type === 'error' ? 'bg-coral-50 text-coral-600 border border-coral-100' : 'bg-jade-50 text-jade-700 border border-jade-100'
                }`}
              >
                {message.type === 'success' && signupSuccess ? (
                  <>
                    <div className="flex items-center gap-2 font-medium">
                      <Mail className="w-4 h-4 shrink-0" />
                      Check your email to confirm
                    </div>
                    <p className="text-jade-700/90 text-xs leading-relaxed">
                      We sent you a confirmation link. If it&rsquo;s not in your inbox, check spam.
                    </p>
                    <p className="text-jade-700/90 text-xs pt-1">
                      Made by{' '}
                      <a
                        href="https://kanereroma.vercel.app"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 font-medium underline hover:no-underline"
                      >
                        kanereroma.vercel.app
                        <ExternalLink className="w-3 h-3" />
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
              className="w-full flex items-center justify-center gap-2 py-3 rounded-full bg-ink hover:bg-jade-500 text-paper text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {mode === 'signup' ? 'Creating account…' : mode === 'forgot-password' ? 'Sending…' : 'Signing in…'}
                </>
              ) : mode === 'signup' ? (
                'Open the journal'
              ) : mode === 'forgot-password' ? (
                resetEmailSent ? 'Email sent' : 'Send reset link'
              ) : (
                'Continue'
              )}
            </button>
          </form>

          <p className="text-center text-[11px] text-ink-whisper mt-8 font-mono">
            Encrypted &middot; Yours alone &middot; Built with discipline
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
