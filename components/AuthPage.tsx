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
      let displayMsg = msg;
      if (msg.toLowerCase().includes('rate limit') || msg.toLowerCase().includes('email rate')) {
        displayMsg = 'Too many attempts. Please wait a few minutes and try again.';
      } else if (msg.toLowerCase().includes('invalid login')) {
        displayMsg = 'Invalid email or password. Please try again.';
      } else if (msg.toLowerCase().includes('email not confirmed')) {
        displayMsg = 'Please confirm your email before signing in.';
      }
      setMessage({ type: 'error', text: displayMsg });
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full px-3 py-2.5 bg-paper border border-rule rounded-lg focus:border-ink/30 focus:ring-2 focus:ring-ink/5 outline-none text-sm text-ink placeholder:text-ink-whisper transition-all";

  return (
    <div className="min-h-screen bg-paper-soft flex flex-col lg:flex-row">
      {/* Left side — minimal hero */}
      <div className="lg:w-1/2 relative bg-ink text-paper p-8 lg:p-12 flex flex-col justify-between min-h-[40vh] lg:min-h-screen overflow-hidden">
        <div className="absolute -top-32 -right-32 w-72 h-72 rounded-full bg-jade-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -left-20 w-72 h-72 rounded-full bg-paper/5 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg overflow-hidden bg-paper flex items-center justify-center">
            <img src={LOGO_URL} className="w-full h-full object-contain" alt="" />
          </div>
          <span className="font-display text-base text-paper tracking-tight">Fintech</span>
        </div>

        <div className="relative z-10 my-10 lg:my-0 max-w-md">
          <h1 className="font-display text-3xl lg:text-5xl tracking-tight leading-[1.05] text-paper">
            A clean, private home for your money.
          </h1>
          <p className="text-paper/65 text-sm lg:text-base leading-relaxed mt-5">
            Log every paycheck, settle every bill, watch the numbers compound. Your data, your rules.
          </p>
        </div>

        <div className="relative z-10 grid grid-cols-3 gap-4 max-w-md">
          <div>
            <p className="font-display text-xl text-paper">7+</p>
            <p className="text-xs text-paper/45 mt-0.5">Categories</p>
          </div>
          <div>
            <p className="font-display text-xl text-paper">∞</p>
            <p className="text-xs text-paper/45 mt-0.5">Months stored</p>
          </div>
          <div>
            <p className="font-display text-xl text-paper">100%</p>
            <p className="text-xs text-paper/45 mt-0.5">Yours alone</p>
          </div>
        </div>
      </div>

      {/* Right side — auth */}
      <div className="lg:w-1/2 flex items-center justify-center p-6 lg:p-12 bg-paper">
        <div className="w-full max-w-sm">
          <div className="mb-7">
            <h2 className="font-display text-2xl lg:text-3xl text-ink tracking-tight">
              {mode === 'signup' ? 'Create your account' : mode === 'forgot-password' ? 'Reset your password' : 'Welcome back'}
            </h2>
            {mode !== 'forgot-password' && (
              <p className="text-ink-muted text-sm mt-1.5">
                {mode === 'signup' ? 'Start tracking your finances today.' : 'Sign in to continue.'}
              </p>
            )}
          </div>

          {mode !== 'forgot-password' && (
            <div className="flex gap-1 mb-6 p-1 bg-paper-soft border border-rule rounded-lg w-fit">
              <button
                type="button"
                onClick={() => { setMode('signin'); clearMessage(); }}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 ${
                  mode === 'signin' ? 'bg-paper text-ink shadow-paper' : 'text-ink-muted hover:text-ink'
                }`}
              >
                <LogIn className="w-3.5 h-3.5" />
                Sign in
              </button>
              <button
                type="button"
                onClick={() => { setMode('signup'); clearMessage(); }}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 ${
                  mode === 'signup' ? 'bg-paper text-ink shadow-paper' : 'text-ink-muted hover:text-ink'
                }`}
              >
                <UserPlus className="w-3.5 h-3.5" />
                Sign up
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
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
                <label htmlFor="auth-name" className="text-xs font-medium text-ink-soft mb-1 block">Name</label>
                <input
                  id="auth-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  autoComplete="name"
                  className={inputClass}
                />
              </div>
            )}
            <div>
              <label htmlFor="auth-email" className="text-xs font-medium text-ink-soft mb-1 block">Email</label>
              <input
                id="auth-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoComplete="email"
                className={inputClass}
              />
            </div>
            {mode !== 'forgot-password' && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="auth-password" className="text-xs font-medium text-ink-soft">Password</label>
                  {mode === 'signin' && (
                    <button
                      type="button"
                      onClick={() => { setMode('forgot-password'); clearMessage(); }}
                      className="text-xs text-ink-muted hover:text-ink transition-colors"
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
                  className={`${inputClass} font-mono`}
                />
                {mode === 'signup' && (
                  <p className="text-xs text-ink-muted mt-1.5">At least 6 characters</p>
                )}
              </div>
            )}

            {message && (
              <div
                className={`p-3 rounded-lg text-sm space-y-1.5 ${
                  message.type === 'error' ? 'bg-coral-50 text-coral-700 border border-coral-100' : 'bg-jade-50 text-jade-700 border border-jade-100'
                }`}
              >
                {message.type === 'success' && signupSuccess ? (
                  <>
                    <div className="flex items-center gap-2 font-medium">
                      <Mail className="w-4 h-4 shrink-0" />
                      Check your email to confirm
                    </div>
                    <p className="text-jade-700/90 text-xs leading-relaxed">
                      We sent a confirmation link. If it&rsquo;s not in your inbox, check spam.
                    </p>
                    <p className="text-jade-700/90 text-xs pt-0.5">
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
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-ink hover:bg-ink-soft text-paper text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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

          <p className="text-center text-xs text-ink-whisper mt-7">
            Encrypted &middot; Private &middot; Yours alone
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
