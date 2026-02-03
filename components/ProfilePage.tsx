import React, { useState, useEffect, useRef } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { uploadProfilePicture, deleteProfilePicture, getProfilePictureUrl } from '../lib/profilePicture';
import { User as UserIcon, Mail, Lock, Save, Loader2, CheckCircle, AlertCircle, Camera, Trash2, Upload } from 'lucide-react';

const LOGO_URL = '/logo.png';

interface ProfilePageProps {
  user: User;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({ user }) => {
  const [fullName, setFullName] = useState(user?.user_metadata?.full_name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const [passwordResetSent, setPasswordResetSent] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(getProfilePictureUrl(user));
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setFullName(user?.user_metadata?.full_name || '');
    setEmail(user?.email || '');
    setAvatarUrl(getProfilePictureUrl(user));
  }, [user]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setLoading(true);

    try {
      // Update user metadata (name)
      const { error: updateError } = await supabase.auth.updateUser({
        data: { full_name: fullName.trim() || undefined },
      });

      if (updateError) throw updateError;

      // Update email if changed
      if (email !== user.email) {
        const { error: emailError } = await supabase.auth.updateUser({
          email: email,
        });

        if (emailError) throw emailError;
        setMessage({ 
          type: 'success', 
          text: 'Profile updated! Check your new email to confirm the change.' 
        });
      } else {
        setMessage({ type: 'success', text: 'Profile updated successfully!' });
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
      setMessage({ 
        type: 'success', 
        text: 'Password reset email sent! Check your inbox to change your password.' 
      });
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
        setMessage({ type: 'success', text: 'Profile picture updated successfully!' });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setMessage({ type: 'error', text: msg });
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleAvatarDelete = async () => {
    if (!confirm('Are you sure you want to remove your profile picture?')) return;

    setMessage(null);
    setUploadingAvatar(true);

    try {
      const result = await deleteProfilePicture(user.id);
      
      if (result.error) {
        setMessage({ type: 'error', text: result.error });
      } else {
        setAvatarUrl(null);
        setMessage({ type: 'success', text: 'Profile picture removed successfully!' });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setMessage({ type: 'error', text: msg });
    } finally {
      setUploadingAvatar(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="bg-white rounded-xl border border-slate-200 shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-red-600 to-red-700 p-6 text-white relative overflow-hidden">
          <div className="relative z-10 flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-white/20 border-2 border-white flex items-center justify-center overflow-hidden backdrop-blur-sm">
              {avatarUrl ? (
                <img src={avatarUrl} className="w-full h-full object-cover" alt="Profile" />
              ) : (
                <img src={LOGO_URL} className="w-10 h-10 opacity-90" alt="Profile" />
              )}
            </div>
            <div>
              <h2 className="text-2xl font-bold">Profile Settings</h2>
              <p className="text-red-100 text-sm">Manage your account information</p>
            </div>
          </div>
          <img 
            src={LOGO_URL} 
            className="absolute -right-8 -bottom-8 w-48 h-48 opacity-10 rotate-12 pointer-events-none" 
            alt="Watermark" 
          />
        </div>

        <div className="p-6 space-y-6">
          {message && (
            <div
              className={`px-4 py-3 rounded-lg text-sm flex items-start gap-2 ${
                message.type === 'error' 
                  ? 'bg-red-50 text-red-700 border border-red-200' 
                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              }`}
            >
              {message.type === 'error' ? (
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              ) : (
                <CheckCircle className="w-5 h-5 shrink-0 mt-0.5" />
              )}
              <span>{message.text}</span>
            </div>
          )}

          {/* Profile Picture Upload Section */}
          <div className="border-b border-slate-200 pb-6">
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-4">
              <Camera className="w-4 h-4" />
              Profile Picture
            </label>
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="h-24 w-24 rounded-full bg-slate-100 border-2 border-slate-200 flex items-center justify-center overflow-hidden">
                  {avatarUrl ? (
                    <img src={avatarUrl} className="w-full h-full object-cover" alt="Profile" />
                  ) : (
                    <UserIcon className="w-10 h-10 text-slate-400" />
                  )}
                </div>
                {uploadingAvatar && (
                  <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                    <Loader2 className="w-6 h-6 text-white animate-spin" />
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
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-700 text-white text-sm font-medium hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <Upload className="w-4 h-4" />
                    Upload Photo
                  </label>
                  {avatarUrl && (
                    <button
                      type="button"
                      onClick={handleAvatarDelete}
                      disabled={uploadingAvatar}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-100 text-red-700 text-sm font-medium hover:bg-red-200 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <Trash2 className="w-4 h-4" />
                      Remove
                    </button>
                  )}
                </div>
                <p className="text-xs text-slate-500">
                  JPG, PNG, WebP or GIF. Max size 5MB.
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleUpdateProfile} className="space-y-6">
            <div>
              <label htmlFor="profile-name" className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-2">
                <UserIcon className="w-4 h-4" />
                Full Name
              </label>
              <input
                id="profile-name"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your full name"
                className="w-full px-4 py-3 rounded-lg border border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
              />
            </div>

            <div>
              <label htmlFor="profile-email" className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-2">
                <Mail className="w-4 h-4" />
                Email Address
              </label>
              <input
                id="profile-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                className="w-full px-4 py-3 rounded-lg border border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
              />
              <p className="text-xs text-slate-500 mt-1.5">
                Changing your email will require verification. You&apos;ll need to confirm both old and new email addresses.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors shadow-lg shadow-red-900/20"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  Save Changes
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-lg overflow-hidden">
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center gap-2 mb-2">
            <Lock className="w-5 h-5 text-slate-700" />
            <h3 className="text-lg font-bold text-slate-800">Password</h3>
          </div>
          <p className="text-sm text-slate-600">
            To change your password, we&apos;ll send you a secure reset link via email.
          </p>
        </div>

        <div className="p-6">
          <button
            type="button"
            onClick={handlePasswordReset}
            disabled={loading || passwordResetSent}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-lg bg-slate-700 text-white font-semibold hover:bg-slate-800 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Sending...
              </>
            ) : passwordResetSent ? (
              <>
                <CheckCircle className="w-5 h-5" />
                Reset Email Sent
              </>
            ) : (
              <>
                <Lock className="w-5 h-5" />
                Send Password Reset Email
              </>
            )}
          </button>
          <p className="text-xs text-slate-500 mt-3 text-center">
            You&apos;ll receive an email with a link to securely reset your password.
          </p>
        </div>
      </div>

      <div className="bg-slate-50 rounded-xl border border-slate-200 p-6">
        <h3 className="text-sm font-semibold text-slate-700 mb-2">Account Information</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-500">User ID:</span>
            <span className="text-slate-700 font-mono text-xs">{user.id}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Account Created:</span>
            <span className="text-slate-700">{new Date(user.created_at).toLocaleDateString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
