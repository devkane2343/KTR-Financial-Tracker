import React, { useState, useEffect, useRef } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { uploadProfilePicture, deleteProfilePicture, getProfilePictureUrl } from '../lib/profilePicture';
import { loadPortfolio, savePortfolio } from '../lib/portfolioUtils';
import { Portfolio } from '../types';
import { User as UserIcon, Mail, Lock, Save, Loader2, CheckCircle, AlertCircle, Camera, Trash2, Upload, Briefcase, DollarSign, Target } from 'lucide-react';

interface ProfilePageProps {
  user: User;
  onPortfolioSaved?: () => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({ user, onPortfolioSaved }) => {
  const [fullName, setFullName] = useState(user?.user_metadata?.full_name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const [passwordResetSent, setPasswordResetSent] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(getProfilePictureUrl(user));
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [portfolio, setPortfolio] = useState<Portfolio>({
    company_name: '',
    position: '',
    rate_type: 'hourly',
    hourly_rate: 0,
    monthly_rate: 0,
    hours_per_day: 8,
    dreams: '',
  });
  const [portfolioLoading, setPortfolioLoading] = useState(false);
  const [portfolioMessage, setPortfolioMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  useEffect(() => {
    setFullName(user?.user_metadata?.full_name || '');
    setEmail(user?.email || '');
    setAvatarUrl(getProfilePictureUrl(user));
  }, [user]);

  useEffect(() => {
    const fetchPortfolio = async () => {
      const result = await loadPortfolio();
      if (result.ok && result.data) {
        setPortfolio(result.data);
      }
    };
    fetchPortfolio();
  }, []);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        data: { full_name: fullName.trim() || undefined },
      });
      if (updateError) throw updateError;
      if (email !== user.email) {
        const { error: emailError } = await supabase.auth.updateUser({ email });
        if (emailError) throw emailError;
        setMessage({ type: 'success', text: 'Profile updated. Confirm the email change in your inbox.' });
      } else {
        setMessage({ type: 'success', text: 'Profile updated.' });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setMessage({ type: 'error', text: msg });
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    setMessage(null);
    setLoading(true);
    setPasswordResetSent(false);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user.email!, {
        redirectTo: `${window.location.origin}/`,
      });
      if (error) throw error;
      setPasswordResetSent(true);
      setMessage({ type: 'success', text: 'Password reset email sent. Check your inbox.' });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setMessage({ type: 'error', text: msg });
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMessage(null);
    setUploadingAvatar(true);
    try {
      const result = await uploadProfilePicture(file, user.id);
      if (result.error) {
        setMessage({ type: 'error', text: result.error });
      } else if (result.url) {
        setAvatarUrl(result.url);
        setMessage({ type: 'success', text: 'Profile picture updated.' });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setMessage({ type: 'error', text: msg });
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleAvatarDelete = async () => {
    if (!confirm('Remove your profile picture?')) return;
    setMessage(null);
    setUploadingAvatar(true);
    try {
      const result = await deleteProfilePicture(user.id);
      if (result.error) {
        setMessage({ type: 'error', text: result.error });
      } else {
        setAvatarUrl(null);
        setMessage({ type: 'success', text: 'Profile picture removed.' });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setMessage({ type: 'error', text: msg });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleRateTypeChange = (type: 'hourly' | 'monthly') => {
    setPortfolio(prev => ({ ...prev, rate_type: type }));
  };

  const handleRateChange = (value: string) => {
    const numValue = parseFloat(value) || 0;
    const hoursPerDay = portfolio.hours_per_day || 8;
    if (portfolio.rate_type === 'hourly') {
      setPortfolio(prev => ({ ...prev, hourly_rate: numValue, monthly_rate: numValue * hoursPerDay * 22.5 }));
    } else {
      setPortfolio(prev => ({ ...prev, monthly_rate: numValue, hourly_rate: numValue / 22.5 / hoursPerDay }));
    }
  };

  const handleHoursPerDayChange = (value: string) => {
    const numValue = parseFloat(value) || 8;
    setPortfolio(prev => {
      const newPortfolio = { ...prev, hours_per_day: numValue };
      if (prev.rate_type === 'hourly' && prev.hourly_rate > 0) {
        newPortfolio.monthly_rate = prev.hourly_rate * numValue * 22.5;
      } else if (prev.rate_type === 'monthly' && prev.monthly_rate > 0) {
        newPortfolio.hourly_rate = prev.monthly_rate / 22.5 / numValue;
      }
      return newPortfolio;
    });
  };

  const handleSavePortfolio = async (e: React.FormEvent) => {
    e.preventDefault();
    setPortfolioMessage(null);
    setPortfolioLoading(true);
    try {
      const result = await savePortfolio(portfolio);
      if (result.ok) {
        setPortfolioMessage({ type: 'success', text: 'Portfolio saved.' });
        setTimeout(() => setPortfolioMessage(null), 3000);
        if (onPortfolioSaved) onPortfolioSaved();
      } else {
        setPortfolioMessage({ type: 'error', text: result.error });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setPortfolioMessage({ type: 'error', text: msg });
    } finally {
      setPortfolioLoading(false);
    }
  };

  const labelClass = "text-xs font-medium text-ink-soft mb-1 block";
  const inputClass = "w-full px-3 py-2.5 bg-paper border border-rule rounded-lg focus:border-ink/30 focus:ring-2 focus:ring-ink/5 outline-none text-sm text-ink placeholder:text-ink-whisper transition-all";

  const renderMessage = (msg: { type: 'error' | 'success'; text: string } | null) => {
    if (!msg) return null;
    return (
      <div
        className={`px-3 py-2.5 rounded-lg text-sm flex items-start gap-2 ${
          msg.type === 'error'
            ? 'bg-coral-50 text-coral-700 border border-coral-100'
            : 'bg-jade-50 text-jade-700 border border-jade-100'
        }`}
      >
        {msg.type === 'error' ? <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /> : <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />}
        <span>{msg.text}</span>
      </div>
    );
  };

  return (
    <div className="max-w-5xl mx-auto space-y-4 animate-fade-up">
      {/* Account section */}
      <div className="bg-paper rounded-xl border border-rule overflow-hidden">
        <div className="p-5 border-b border-rule flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-paper-soft border border-rule flex items-center justify-center overflow-hidden">
            {avatarUrl ? (
              <img src={avatarUrl} className="w-full h-full object-cover" alt="" />
            ) : (
              <UserIcon className="w-5 h-5 text-ink-muted" />
            )}
          </div>
          <div>
            <h2 className="text-base font-medium text-ink">Account</h2>
            <p className="text-xs text-ink-muted">Manage your profile</p>
          </div>
        </div>

        <div className="p-5 space-y-5">
          {renderMessage(message)}

          {/* Avatar */}
          <div className="border-b border-rule pb-5">
            <label className="text-xs font-medium text-ink-soft mb-3 flex items-center gap-1.5">
              <Camera className="w-3.5 h-3.5" />
              Profile picture
            </label>
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="h-20 w-20 rounded-full bg-paper-soft border border-rule flex items-center justify-center overflow-hidden">
                  {avatarUrl ? (
                    <img src={avatarUrl} className="w-full h-full object-cover" alt="" />
                  ) : (
                    <UserIcon className="w-8 h-8 text-ink-muted" />
                  )}
                </div>
                {uploadingAvatar && (
                  <div className="absolute inset-0 bg-ink/50 rounded-full flex items-center justify-center">
                    <Loader2 className="w-5 h-5 text-paper animate-spin" />
                  </div>
                )}
              </div>
              <div className="flex-1 space-y-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                  onChange={handleAvatarUpload}
                  className="hidden"
                  id="avatar-upload"
                />
                <div className="flex gap-2">
                  <label
                    htmlFor="avatar-upload"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-ink hover:bg-ink-soft text-paper text-sm font-medium transition-colors cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    Upload
                  </label>
                  {avatarUrl && (
                    <button
                      type="button"
                      onClick={handleAvatarDelete}
                      disabled={uploadingAvatar}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-paper hover:bg-paper-soft border border-rule text-coral-600 text-sm font-medium transition-colors disabled:opacity-60"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Remove
                    </button>
                  )}
                </div>
                <p className="text-xs text-ink-muted">
                  JPG, PNG, WebP or GIF. Max 5MB.
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div>
              <label htmlFor="profile-name" className={labelClass}>
                <span className="inline-flex items-center gap-1.5"><UserIcon className="w-3.5 h-3.5" /> Full name</span>
              </label>
              <input
                id="profile-name"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your full name"
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="profile-email" className={labelClass}>
                <span className="inline-flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> Email</span>
              </label>
              <input
                id="profile-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className={inputClass}
              />
              <p className="text-xs text-ink-muted mt-1.5">
                Changing email requires verification of both addresses.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-lg bg-ink hover:bg-ink-soft text-paper text-sm font-medium disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save changes
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Password */}
      <div className="bg-paper rounded-xl border border-rule overflow-hidden">
        <div className="p-5 border-b border-rule">
          <div className="flex items-center gap-2 mb-1">
            <Lock className="w-4 h-4 text-ink-soft" />
            <h3 className="text-base font-medium text-ink">Password</h3>
          </div>
          <p className="text-sm text-ink-muted">
            We&rsquo;ll email a secure link to reset your password.
          </p>
        </div>

        <div className="p-5">
          <button
            type="button"
            onClick={handlePasswordReset}
            disabled={loading || passwordResetSent}
            className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-lg bg-paper hover:bg-paper-soft border border-rule text-ink text-sm font-medium disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Sending…
              </>
            ) : passwordResetSent ? (
              <>
                <CheckCircle className="w-4 h-4" />
                Reset email sent
              </>
            ) : (
              <>
                <Lock className="w-4 h-4" />
                Send reset link
              </>
            )}
          </button>
        </div>
      </div>

      {/* Portfolio & Career */}
      <div className="bg-paper rounded-xl border border-rule overflow-hidden">
        <div className="p-5 border-b border-rule flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-paper-soft border border-rule flex items-center justify-center">
            <Briefcase className="w-5 h-5 text-ink-soft" />
          </div>
          <div>
            <h2 className="text-base font-medium text-ink">Portfolio &amp; career</h2>
            <p className="text-xs text-ink-muted">Your professional information</p>
          </div>
        </div>

        <div className="p-5 space-y-5">
          {renderMessage(portfolioMessage)}

          <form onSubmit={handleSavePortfolio} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="company-name" className={labelClass}>
                  <span className="inline-flex items-center gap-1.5"><Briefcase className="w-3.5 h-3.5" /> Company</span>
                </label>
                <input
                  id="company-name"
                  type="text"
                  value={portfolio.company_name}
                  onChange={(e) => setPortfolio(prev => ({ ...prev, company_name: e.target.value }))}
                  placeholder="Company name"
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="position" className={labelClass}>
                  <span className="inline-flex items-center gap-1.5"><UserIcon className="w-3.5 h-3.5" /> Position</span>
                </label>
                <input
                  id="position"
                  type="text"
                  value={portfolio.position}
                  onChange={(e) => setPortfolio(prev => ({ ...prev, position: e.target.value }))}
                  placeholder="Your role"
                  className={inputClass}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className={labelClass}>
                  <span className="inline-flex items-center gap-1.5"><DollarSign className="w-3.5 h-3.5" /> Rate type</span>
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleRateTypeChange('hourly')}
                    className={`flex-1 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                      portfolio.rate_type === 'hourly'
                        ? 'border-ink bg-ink text-paper'
                        : 'border-rule bg-paper text-ink hover:bg-paper-soft'
                    }`}
                  >
                    Hourly
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRateTypeChange('monthly')}
                    className={`flex-1 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                      portfolio.rate_type === 'monthly'
                        ? 'border-ink bg-ink text-paper'
                        : 'border-rule bg-paper text-ink hover:bg-paper-soft'
                    }`}
                  >
                    Monthly
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="hours-per-day" className={labelClass}>Hours / day</label>
                <input
                  id="hours-per-day"
                  type="number"
                  step="0.5"
                  min="1"
                  max="24"
                  value={portfolio.hours_per_day}
                  onChange={(e) => handleHoursPerDayChange(e.target.value)}
                  className={`${inputClass} num`}
                />
                <p className="text-xs text-ink-muted mt-1">Default: 8 hours</p>
              </div>
            </div>

            <div>
              <label htmlFor="rate-amount" className={labelClass}>
                <span className="inline-flex items-center gap-1.5"><DollarSign className="w-3.5 h-3.5" /> {portfolio.rate_type === 'hourly' ? 'Hourly rate' : 'Monthly rate'}</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted text-sm font-mono">₱</span>
                <input
                  id="rate-amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={portfolio.rate_type === 'hourly' ? portfolio.hourly_rate : portfolio.monthly_rate}
                  onChange={(e) => handleRateChange(e.target.value)}
                  placeholder="0.00"
                  className={`${inputClass} pl-7 num`}
                />
              </div>
              {portfolio.rate_type === 'monthly' && portfolio.monthly_rate > 0 && (
                <p className="text-xs text-ink-muted mt-1.5 num">
                  Daily ₱{(portfolio.monthly_rate / 22.5).toFixed(2)} &middot; Hourly ₱{(portfolio.monthly_rate / 22.5 / portfolio.hours_per_day).toFixed(2)} ({portfolio.hours_per_day}h/day)
                </p>
              )}
              {portfolio.rate_type === 'hourly' && portfolio.hourly_rate > 0 && (
                <p className="text-xs text-ink-muted mt-1.5 num">
                  Daily ₱{(portfolio.hourly_rate * portfolio.hours_per_day).toFixed(2)} &middot; Monthly ₱{(portfolio.hourly_rate * portfolio.hours_per_day * 22.5).toFixed(2)} ({portfolio.hours_per_day}h/day)
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={portfolioLoading}
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-lg bg-ink hover:bg-ink-soft text-paper text-sm font-medium disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              {portfolioLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save portfolio
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Dreams & Goals */}
      <div className="bg-paper rounded-xl border border-rule overflow-hidden">
        <div className="p-5 border-b border-rule flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-paper-soft border border-rule flex items-center justify-center">
            <Target className="w-5 h-5 text-ink-soft" />
          </div>
          <div>
            <h2 className="text-base font-medium text-ink">5-year vision</h2>
            <p className="text-xs text-ink-muted">Where do you see yourself?</p>
          </div>
        </div>

        <div className="p-5">
          <form onSubmit={handleSavePortfolio}>
            <div>
              <label htmlFor="dreams" className={labelClass}>
                <span className="inline-flex items-center gap-1.5"><Target className="w-3.5 h-3.5" /> Goals &amp; dreams</span>
              </label>
              <textarea
                id="dreams"
                value={portfolio.dreams}
                onChange={(e) => setPortfolio(prev => ({ ...prev, dreams: e.target.value }))}
                placeholder="Describe your career aspirations, personal goals, skills you want to develop…"
                rows={6}
                className={`${inputClass} resize-none`}
              />
              <p className="text-xs text-ink-muted mt-1.5">
                What you want to build, learn, or become.
              </p>
            </div>

            <button
              type="submit"
              disabled={portfolioLoading}
              className="w-full mt-4 inline-flex items-center justify-center gap-2 py-2.5 rounded-lg bg-ink hover:bg-ink-soft text-paper text-sm font-medium disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              {portfolioLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save vision
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Account info footer */}
      <div className="bg-paper rounded-xl border border-rule p-5">
        <h3 className="text-xs font-medium text-ink-soft mb-2">Account info</h3>
        <div className="space-y-1.5 text-sm">
          <div className="flex justify-between gap-3">
            <span className="text-ink-muted">User ID</span>
            <span className="text-ink-soft font-mono text-xs truncate">{user.id}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-ink-muted">Created</span>
            <span className="text-ink-soft">{new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
