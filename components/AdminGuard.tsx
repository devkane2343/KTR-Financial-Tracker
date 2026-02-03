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
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-600 font-medium">Verifying admin access...</p>
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
        <div className="max-w-md bg-white rounded-xl border border-red-200 shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Access Denied</h2>
          <p className="text-slate-600 mb-4">
            You don't have permission to access this area. This section is restricted to administrators only.
          </p>
          <div className="flex items-center justify-center gap-2 text-sm text-slate-500 bg-slate-50 px-4 py-3 rounded-lg">
            <Shield className="w-4 h-4" />
            <span>Admin privileges required</span>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
