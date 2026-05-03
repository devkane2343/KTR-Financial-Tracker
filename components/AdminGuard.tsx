import React, { useState, useEffect } from 'react';
import { Shield, AlertTriangle } from 'lucide-react';
import { isUserAdmin } from '../lib/adminUtils';

interface AdminGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * AdminGuard component to protect admin-only routes and components
 * Only renders children if the current user is an admin
 */
export const AdminGuard: React.FC<AdminGuardProps> = ({ children, fallback }) => {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAdminStatus();
  }, []);

  const checkAdminStatus = async () => {
    setLoading(true);
    const adminStatus = await isUserAdmin();
    setIsAdmin(adminStatus);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-ink/15 border-t-ink rounded-full animate-spin" />
          <p className="text-sm text-ink-muted">Verifying admin access…</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div className="flex items-center justify-center py-16">
        <div className="max-w-md bg-paper rounded-xl border border-rule p-8 text-center">
          <div className="w-12 h-12 bg-coral-50 rounded-full flex items-center justify-center mx-auto mb-3">
            <AlertTriangle className="w-6 h-6 text-coral-600" />
          </div>
          <h2 className="text-lg font-medium text-ink mb-1">Access denied</h2>
          <p className="text-sm text-ink-muted mb-4">
            You don&apos;t have permission to access this area. Admin privileges required.
          </p>
          <div className="inline-flex items-center justify-center gap-1.5 text-xs text-ink-soft bg-paper-soft px-3 py-1.5 rounded-md border border-rule">
            <Shield className="w-3.5 h-3.5" />
            <span>Admin only</span>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
