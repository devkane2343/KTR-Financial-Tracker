import React, { useState, useEffect } from 'react';
import {
  Users,
  UserCheck,
  UserX,
  UserMinus,
  MessageSquare,
  Send,
  Ban,
  RotateCcw,
  Trash2,
  Search,
  Filter,
  RefreshCw,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Mail,
  AlertCircle,
  Eye,
  X,
  Calendar,
  Clock,
  Activity,
  Bell,
  ChevronDown,
  ChevronUp,
  Download,
  MoreVertical,
  Shield,
  Receipt,
} from 'lucide-react';
import {
  getUserStatistics,
  getAllUsersWithDetails,
  sendNotificationToUser,
  sendNotificationToMultipleUsers,
  suspendUserAccount,
  reactivateUserAccount,
  deleteUserAccount,
  loadUserPortfolio,
  loadUserFinancialData,
  getSentNotificationsWithReadStatus,
  UserWithDetails,
  UserStats,
  UserNotification,
} from '../lib/adminUtils';
import { Portfolio, FinancialData } from '../types';
import { Briefcase, Target, CheckCircle2, Clock as ClockIcon } from 'lucide-react';
import { ModalShell } from './ModalShell';
import { Select } from './UI/Select';

type SortField = 'email' | 'created_at' | 'total_income' | 'total_expenses' | 'last_sign_in_at';
type SortDirection = 'asc' | 'desc';

interface ActionModal {
  type: 'suspend' | 'delete' | 'reactivate' | 'message' | 'details' | null;
  user?: UserWithDetails;
}

/** Avatar for admin users list: profile picture when available, else first letter initial. */
function UserAvatar({ user, size = 'sm' }: { user: UserWithDetails; size?: 'sm' | 'lg' }) {
  const [imgError, setImgError] = useState(false);
  const showImg = user.avatar_url && !imgError;
  const initial = (user.full_name || user.email).charAt(0).toUpperCase();
  const sizeClass = size === 'lg' ? 'w-16 h-16 text-2xl' : 'w-10 h-10 text-sm';

  return (
    <div className={`${sizeClass} rounded-full flex-shrink-0 overflow-hidden flex items-center justify-center bg-ink text-paper font-medium`}>
      {showImg ? (
        <img
          src={user.avatar_url!}
          alt=""
          className="w-full h-full object-cover"
          onError={() => setImgError(true)}
        />
      ) : (
        initial
      )}
    </div>
  );
}

export const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [users, setUsers] = useState<UserWithDetails[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended' | 'deleted'>('all');
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageTitle, setMessageTitle] = useState('');
  const [messageBody, setMessageBody] = useState('');
  const [messageType, setMessageType] = useState<'info' | 'warning' | 'success' | 'error'>('info');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [actionModal, setActionModal] = useState<ActionModal>({ type: null });
  const [actionReason, setActionReason] = useState('');
  const [openMenuUserId, setOpenMenuUserId] = useState<string | null>(null);
  const [userPortfolio, setUserPortfolio] = useState<Portfolio | null>(null);
  const [portfolioLoading, setPortfolioLoading] = useState(false);
  const [userFinData, setUserFinData] = useState<FinancialData | null>(null);
  const [finDataLoading, setFinDataLoading] = useState(false);
  const [entriesTab, setEntriesTab] = useState<'income' | 'expenses' | 'bills'>('income');
  const [showSentMessagesModal, setShowSentMessagesModal] = useState(false);
  const [sentMessages, setSentMessages] = useState<any[]>([]);
  const [sentMessagesLoading, setSentMessagesLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [users, searchTerm, statusFilter, sortField, sortDirection]);

  useEffect(() => {
    // Load portfolio + table entries when user details modal opens
    if (actionModal.type === 'details' && actionModal.user) {
      loadPortfolio(actionModal.user.id);
      loadFinData(actionModal.user.id);
      setEntriesTab('income');
    } else {
      setUserPortfolio(null);
      setUserFinData(null);
    }
  }, [actionModal]);

  const loadPortfolio = async (userId: string) => {
    setPortfolioLoading(true);
    const portfolio = await loadUserPortfolio(userId);
    setUserPortfolio(portfolio);
    setPortfolioLoading(false);
  };

  const loadFinData = async (userId: string) => {
    setFinDataLoading(true);
    const data = await loadUserFinancialData(userId);
    setUserFinData(data);
    setFinDataLoading(false);
  };

  const loadSentMessages = async () => {
    setSentMessagesLoading(true);
    const messages = await getSentNotificationsWithReadStatus();
    // Enhance messages with user info
    const enhancedMessages = messages.map(msg => {
      const user = users.find(u => u.id === msg.user_id);
      return {
        ...msg,
        recipient_name: user?.full_name || user?.email || 'Unknown User',
        recipient_email: user?.email || 'N/A'
      };
    });
    setSentMessages(enhancedMessages);
    setSentMessagesLoading(false);
  };

  const loadData = async () => {
    setLoading(true);
    const [statsData, usersData] = await Promise.all([
      getUserStatistics(),
      getAllUsersWithDetails(),
    ]);
    
    if (statsData) setStats(statsData);
    setUsers(usersData);
    setLoading(false);
  };

  const filterUsers = () => {
    let filtered = users;

    if (statusFilter !== 'all') {
      filtered = filtered.filter(u => u.status === statusFilter);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(u => 
        u.email.toLowerCase().includes(term) ||
        u.full_name?.toLowerCase().includes(term)
      );
    }

    // Sort users
    filtered = [...filtered].sort((a, b) => {
      let aVal: any = a[sortField];
      let bVal: any = b[sortField];

      // Handle null/undefined values
      if (aVal === null || aVal === undefined) aVal = '';
      if (bVal === null || bVal === undefined) bVal = '';

      // Convert to numbers for numeric fields
      if (sortField === 'total_income' || sortField === 'total_expenses') {
        aVal = Number(aVal);
        bVal = Number(bVal);
      }

      // Compare
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    setFilteredUsers(filtered);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const handleSelectUser = (userId: string) => {
    setSelectedUsers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedUsers.size === filteredUsers.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(filteredUsers.map(u => u.id)));
    }
  };

  const handleSendMessage = async () => {
    if (!messageTitle || !messageBody) {
      setActionMessage({ type: 'error', text: 'Please fill in all fields' });
      return;
    }

    setActionLoading(true);
    
    // Check if it's a single user message or bulk
    if (actionModal.type === 'message' && actionModal.user) {
      const result = await sendNotificationToUser(actionModal.user.id, messageTitle, messageBody, messageType);
      if (result.success) {
        setActionMessage({ type: 'success', text: 'Message sent successfully' });
      } else {
        setActionMessage({ type: 'error', text: result.error || 'Failed to send message' });
      }
    } else {
      const userIds = Array.from(selectedUsers);
      const result = await sendNotificationToMultipleUsers(userIds, messageTitle, messageBody, messageType);
      
      if (result.success) {
        setActionMessage({ type: 'success', text: `Message sent to ${result.sentCount} user(s)` });
        setSelectedUsers(new Set());
      } else {
        setActionMessage({ type: 'error', text: result.error || 'Failed to send message' });
      }
    }
    
    setShowMessageModal(false);
    setActionModal({ type: null });
    setMessageTitle('');
    setMessageBody('');
    setTimeout(() => setActionMessage(null), 3000);
    setActionLoading(false);
  };

  const handleSuspendUser = async () => {
    if (!actionModal.user || !actionReason.trim()) {
      setActionMessage({ type: 'error', text: 'Please provide a reason' });
      return;
    }

    setActionLoading(true);
    const result = await suspendUserAccount(actionModal.user.id, actionReason);
    
    if (result.success) {
      setActionMessage({ type: 'success', text: 'User suspended successfully' });
      loadData();
      setTimeout(() => setActionMessage(null), 3000);
    } else {
      setActionMessage({ type: 'error', text: result.error || 'Failed to suspend user' });
    }
    
    setActionModal({ type: null });
    setActionReason('');
    setActionLoading(false);
  };

  const handleReactivateUser = async () => {
    if (!actionModal.user) return;

    setActionLoading(true);
    const result = await reactivateUserAccount(actionModal.user.id);
    
    if (result.success) {
      setActionMessage({ type: 'success', text: 'User reactivated successfully' });
      loadData();
      setTimeout(() => setActionMessage(null), 3000);
    } else {
      setActionMessage({ type: 'error', text: result.error || 'Failed to reactivate user' });
    }
    
    setActionModal({ type: null });
    setActionLoading(false);
  };

  const handleDeleteUser = async () => {
    if (!actionModal.user || !actionReason.trim()) {
      setActionMessage({ type: 'error', text: 'Please provide a reason' });
      return;
    }

    setActionLoading(true);
    const result = await deleteUserAccount(actionModal.user.id, actionReason);
    
    if (result.success) {
      setActionMessage({ type: 'success', text: 'User deleted successfully' });
      loadData();
      setTimeout(() => setActionMessage(null), 3000);
    } else {
      setActionMessage({ type: 'error', text: result.error || 'Failed to delete user' });
    }
    
    setActionModal({ type: null });
    setActionReason('');
    setActionLoading(false);
  };

  const exportToCSV = () => {
    const csvRows = [];
    const headers = ['Email', 'Name', 'Status', 'Total Income', 'Total Expenses', 'Net Amount', 'Joined', 'Last Sign In'];
    csvRows.push(headers.join(','));

    filteredUsers.forEach(user => {
      const row = [
        user.email,
        user.full_name || 'N/A',
        user.status,
        user.total_income,
        user.total_expenses,
        user.total_income - user.total_expenses,
        new Date(user.created_at).toLocaleDateString(),
        user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleDateString() : 'Never',
      ];
      csvRows.push(row.join(','));
    });

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `users-export-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-600 font-medium">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-ink-soft" />
            <h2 className="font-display text-2xl text-ink tracking-tight">Admin dashboard</h2>
          </div>
          <p className="text-sm text-ink-muted mt-1">User management and analytics</p>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => {
              setShowSentMessagesModal(true);
              loadSentMessages();
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-paper hover:bg-paper-soft border border-rule text-ink rounded-lg transition-colors text-sm font-medium"
          >
            <MessageSquare className="w-4 h-4" />
            <span className="hidden sm:inline">Sent messages</span>
          </button>
          <button
            onClick={exportToCSV}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-paper hover:bg-paper-soft border border-rule text-ink rounded-lg transition-colors text-sm font-medium"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>
          <button
            onClick={loadData}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-paper hover:bg-paper-soft border border-rule text-ink rounded-lg transition-colors disabled:opacity-50 text-sm font-medium"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {actionMessage && (
        <div className={`p-3 rounded-lg flex items-center gap-2 text-sm border ${
          actionMessage.type === 'success'
            ? 'bg-jade-50 text-jade-700 border-jade-100'
            : 'bg-coral-50 text-coral-700 border-coral-100'
        }`}>
          <AlertCircle className="w-4 h-4 shrink-0" />
          {actionMessage.text}
        </div>
      )}

      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-paper rounded-xl p-5 border border-rule">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 bg-paper-soft rounded-md">
                <Users className="w-4 h-4 text-ink-soft" />
              </div>
              <span className="num text-2xl font-semibold text-ink">{stats.total_users}</span>
            </div>
            <p className="text-sm font-medium text-ink">Total users</p>
            <p className="text-xs text-ink-muted mt-0.5">All accounts</p>
          </div>

          <div className="bg-paper rounded-xl p-5 border border-rule">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 bg-jade-50 rounded-md">
                <UserCheck className="w-4 h-4 text-jade-600" />
              </div>
              <span className="num text-2xl font-semibold text-ink">{stats.active_users}</span>
            </div>
            <p className="text-sm font-medium text-ink">Active</p>
            <p className="text-xs text-ink-muted mt-0.5">
              {stats.total_users > 0 ? Math.round((stats.active_users / stats.total_users) * 100) : 0}% of total
            </p>
          </div>

          <div className="bg-paper rounded-xl p-5 border border-rule">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 bg-gold-50 rounded-md">
                <UserMinus className="w-4 h-4 text-gold-600" />
              </div>
              <span className="num text-2xl font-semibold text-ink">{stats.suspended_users}</span>
            </div>
            <p className="text-sm font-medium text-ink">Suspended</p>
            <p className="text-xs text-ink-muted mt-0.5">Temporarily disabled</p>
          </div>

          <div className="bg-paper rounded-xl p-5 border border-rule">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 bg-coral-50 rounded-md">
                <UserX className="w-4 h-4 text-coral-600" />
              </div>
              <span className="num text-2xl font-semibold text-ink">{stats.deleted_users}</span>
            </div>
            <p className="text-sm font-medium text-ink">Deleted</p>
            <p className="text-xs text-ink-muted mt-0.5">Soft deleted</p>
          </div>
        </div>
      )}

      <div className="bg-paper rounded-xl p-5 border border-rule space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-whisper" />
            <input
              type="text"
              placeholder="Search by email or name…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm bg-paper border border-rule rounded-lg focus:border-ink/30 focus:ring-2 focus:ring-ink/5 outline-none text-ink placeholder:text-ink-whisper transition-all"
            />
          </div>

          <div className="w-44">
            <Select
              aria-label="Filter by status"
              value={statusFilter}
              onChange={(v) => setStatusFilter(v as any)}
              leadingIcon={<Filter className="w-4 h-4 shrink-0 text-ink-whisper" />}
              options={[
                { value: 'all', label: 'All Status' },
                { value: 'active', label: 'Active' },
                { value: 'suspended', label: 'Suspended' },
                { value: 'deleted', label: 'Deleted' },
              ]}
            />
          </div>
        </div>

        {selectedUsers.size > 0 && (
          <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <span className="text-sm font-medium text-blue-900">
              {selectedUsers.size} user(s) selected
            </span>
            <button
              onClick={() => setShowMessageModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              <MessageSquare className="w-4 h-4" />
              Send Message
            </button>
            <button
              onClick={() => setSelectedUsers(new Set())}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Clear selection
            </button>
          </div>
        )}
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-4 sm:px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Users List</h3>
            <p className="text-sm text-slate-600 mt-1">
              Showing {filteredUsers.length} of {users.length} users
            </p>
          </div>
          {filteredUsers.length > 0 && (
            <span className="text-xs text-slate-500 hidden md:inline">
              Click column headers to sort
            </span>
          )}
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden divide-y divide-slate-100">
          {filteredUsers.map((user) => {
            const netAmount = user.total_income - user.total_expenses;
            return (
              <div key={user.id} className="p-4 space-y-3">
                {/* Identity */}
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={selectedUsers.has(user.id)}
                    onChange={() => handleSelectUser(user.id)}
                    className="w-4 h-4 shrink-0 rounded border-slate-300 text-red-600 focus:ring-red-500"
                  />
                  <UserAvatar user={user} />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900 truncate">{user.full_name || 'Unnamed User'}</p>
                    <p className="text-xs text-slate-500 truncate">{user.email}</p>
                  </div>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold shrink-0 ${
                    user.status === 'active' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' :
                    user.status === 'suspended' ? 'bg-amber-100 text-amber-700 border border-amber-200' :
                    'bg-red-100 text-red-700 border border-red-200'
                  }`}>
                    {user.status === 'active' && <UserCheck className="w-3 h-3" />}
                    {user.status === 'suspended' && <UserMinus className="w-3 h-3" />}
                    {user.status === 'deleted' && <UserX className="w-3 h-3" />}
                    {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                  </span>
                </div>

                {/* Financial summary — stacked rows so amounts never overflow */}
                <div className="bg-slate-50 rounded-lg border border-slate-200 divide-y divide-slate-200/70">
                  <div className="flex items-center justify-between px-3 py-1.5">
                    <span className="flex items-center gap-1.5 text-xs text-slate-500">
                      <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                      Income
                    </span>
                    <span className="text-sm font-semibold text-emerald-600 tabular-nums">{formatCurrency(user.total_income)}</span>
                  </div>
                  <div className="flex items-center justify-between px-3 py-1.5">
                    <span className="flex items-center gap-1.5 text-xs text-slate-500">
                      <TrendingDown className="w-3.5 h-3.5 text-red-500" />
                      Expenses
                    </span>
                    <span className="text-sm font-semibold text-red-600 tabular-nums">{formatCurrency(user.total_expenses)}</span>
                  </div>
                  <div className="flex items-center justify-between px-3 py-1.5">
                    <span className="text-xs font-medium text-slate-600">Net</span>
                    <span className={`text-sm font-bold tabular-nums ${netAmount >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {formatCurrency(netAmount)}
                    </span>
                  </div>
                </div>

                {/* Meta */}
                <div className="flex items-center gap-4 text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Joined {new Date(user.created_at).toLocaleDateString()}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {user.last_sign_in_at
                      ? new Date(user.last_sign_in_at).toLocaleDateString()
                      : 'Never'
                    }
                  </span>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setActionModal({ type: 'details', user })}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors text-sm font-medium"
                  >
                    <Eye className="w-4 h-4" />
                    View
                  </button>
                  <button
                    onClick={() => {
                      setActionModal({ type: 'message', user });
                      setShowMessageModal(true);
                    }}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition-colors text-sm font-medium"
                  >
                    <Mail className="w-4 h-4" />
                    Message
                  </button>
                  {user.status === 'active' && (
                    <button
                      onClick={() => setActionModal({ type: 'suspend', user })}
                      className="px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg transition-colors"
                      title="Suspend"
                    >
                      <Ban className="w-4 h-4" />
                    </button>
                  )}
                  {user.status === 'suspended' && (
                    <button
                      onClick={() => setActionModal({ type: 'reactivate', user })}
                      className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg transition-colors"
                      title="Reactivate"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => setActionModal({ type: 'delete', user })}
                    className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedUsers.size === filteredUsers.length && filteredUsers.length > 0}
                    onChange={handleSelectAll}
                    className="w-4 h-4 rounded border-slate-300 text-red-600 focus:ring-red-500"
                  />
                </th>
                <th 
                  className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors"
                  onClick={() => handleSort('email')}
                >
                  <div className="flex items-center gap-1">
                    User
                    {sortField === 'email' && (
                      sortDirection === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                    )}
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Status
                </th>
                <th 
                  className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors"
                  onClick={() => handleSort('total_income')}
                >
                  <div className="flex items-center gap-1">
                    Income
                    {sortField === 'total_income' && (
                      sortDirection === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                    )}
                  </div>
                </th>
                <th 
                  className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors"
                  onClick={() => handleSort('total_expenses')}
                >
                  <div className="flex items-center gap-1">
                    Expenses
                    {sortField === 'total_expenses' && (
                      sortDirection === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                    )}
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Net
                </th>
                <th 
                  className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors"
                  onClick={() => handleSort('created_at')}
                >
                  <div className="flex items-center gap-1">
                    Joined
                    {sortField === 'created_at' && (
                      sortDirection === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                    )}
                  </div>
                </th>
                <th 
                  className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors"
                  onClick={() => handleSort('last_sign_in_at')}
                >
                  <div className="flex items-center gap-1">
                    Last Active
                    {sortField === 'last_sign_in_at' && (
                      sortDirection === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                    )}
                  </div>
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.map((user) => {
                const netAmount = user.total_income - user.total_expenses;
                return (
                  <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-4">
                      <input
                        type="checkbox"
                        checked={selectedUsers.has(user.id)}
                        onChange={() => handleSelectUser(user.id)}
                        className="w-4 h-4 rounded border-slate-300 text-red-600 focus:ring-red-500"
                      />
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <UserAvatar user={user} />
                        <div>
                          <p className="font-semibold text-slate-900">{user.full_name || 'Unnamed User'}</p>
                          <p className="text-sm text-slate-500">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${
                        user.status === 'active' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' :
                        user.status === 'suspended' ? 'bg-amber-100 text-amber-700 border border-amber-200' :
                        'bg-red-100 text-red-700 border border-red-200'
                      }`}>
                        {user.status === 'active' && <UserCheck className="w-3.5 h-3.5" />}
                        {user.status === 'suspended' && <UserMinus className="w-3.5 h-3.5" />}
                        {user.status === 'deleted' && <UserX className="w-3.5 h-3.5" />}
                        {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-1.5 text-emerald-600 font-semibold text-sm">
                        <TrendingUp className="w-4 h-4" />
                        {formatCurrency(user.total_income)}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-1.5 text-red-600 font-semibold text-sm">
                        <TrendingDown className="w-4 h-4" />
                        {formatCurrency(user.total_expenses)}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`font-bold text-sm ${netAmount >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {formatCurrency(netAmount)}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-1.5 text-sm text-slate-600">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {new Date(user.created_at).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-1.5 text-sm text-slate-600">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {user.last_sign_in_at 
                          ? new Date(user.last_sign_in_at).toLocaleDateString()
                          : <span className="text-slate-400 italic">Never</span>
                        }
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setActionModal({ type: 'details', user })}
                          className="p-2 hover:bg-slate-100 text-slate-600 rounded-lg transition-colors"
                          title="View details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        
                        <button
                          onClick={() => {
                            setActionModal({ type: 'message', user });
                            setShowMessageModal(true);
                          }}
                          className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors"
                          title="Send message"
                        >
                          <Mail className="w-4 h-4" />
                        </button>
                        
                        {user.status === 'active' && (
                          <button
                            onClick={() => setActionModal({ type: 'suspend', user })}
                            className="p-2 hover:bg-amber-50 text-amber-600 rounded-lg transition-colors"
                            title="Suspend user"
                          >
                            <Ban className="w-4 h-4" />
                          </button>
                        )}
                        
                        {user.status === 'suspended' && (
                          <button
                            onClick={() => setActionModal({ type: 'reactivate', user })}
                            className="p-2 hover:bg-emerald-50 text-emerald-600 rounded-lg transition-colors"
                            title="Reactivate user"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                        )}
                        
                        <button
                          onClick={() => setActionModal({ type: 'delete', user })}
                          className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition-colors"
                          title="Delete user"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Empty State - Show on both mobile and desktop */}
        {filteredUsers.length === 0 && (
          <div className="text-center py-12 text-slate-500">
            <Users className="w-12 h-12 mx-auto mb-2 opacity-20" />
            <p>No users found</p>
          </div>
        )}
      </div>

      {/* Message Modal */}
      {showMessageModal && (
        <ModalShell
          onClose={() => {
            setShowMessageModal(false);
            setActionModal({ type: null });
            setMessageTitle('');
            setMessageBody('');
          }}
          label={actionModal.user ? `Send message to ${actionModal.user.email}` : 'Send message to selected users'}
          panelClassName="bg-white rounded-xl max-w-2xl w-full p-6 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto"
        >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-slate-900">
                {actionModal.user ? `Send Message to ${actionModal.user.email}` : 'Send Message to Selected Users'}
              </h3>
              <button
                onClick={() => {
                  setShowMessageModal(false);
                  setActionModal({ type: null });
                  setMessageTitle('');
                  setMessageBody('');
                }}
                className="p-1 hover:bg-slate-100 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Message Type</label>
                <div className="grid grid-cols-4 gap-2">
                  {(['info', 'success', 'warning', 'error'] as const).map((type) => (
                    <button
                      key={type}
                      onClick={() => setMessageType(type)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        messageType === type
                          ? type === 'info' ? 'bg-blue-600 text-white' :
                            type === 'success' ? 'bg-emerald-600 text-white' :
                            type === 'warning' ? 'bg-amber-600 text-white' :
                            'bg-red-600 text-white'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Title</label>
                <input
                  type="text"
                  value={messageTitle}
                  onChange={(e) => setMessageTitle(e.target.value)}
                  placeholder="Enter message title..."
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Message</label>
                <textarea
                  value={messageBody}
                  onChange={(e) => setMessageBody(e.target.value)}
                  placeholder="Enter your message..."
                  rows={6}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
                />
              </div>

              <div className="text-sm text-slate-600 bg-slate-50 p-4 rounded-lg border border-slate-200">
                <Bell className="w-4 h-4 inline mr-2" />
                This message will be sent to <span className="font-bold">
                  {actionModal.user ? '1 user' : `${selectedUsers.size} user(s)`}
                </span>
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <button
                  onClick={() => {
                    setShowMessageModal(false);
                    setActionModal({ type: null });
                    setMessageTitle('');
                    setMessageBody('');
                  }}
                  className="px-5 py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSendMessage}
                  disabled={actionLoading || !messageTitle || !messageBody}
                  className="flex items-center gap-2 px-5 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {actionLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Send Message
                    </>
                  )}
                </button>
              </div>
            </div>
        </ModalShell>
      )}

      {/* Suspend User Modal */}
      {actionModal.type === 'suspend' && actionModal.user && (
        <ModalShell
          onClose={() => { setActionModal({ type: null }); setActionReason(''); }}
          label={`Suspend user account — ${actionModal.user.email}`}
        >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-amber-100 rounded-full">
                <Ban className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">Suspend User Account</h3>
                <p className="text-sm text-slate-600">{actionModal.user.email}</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm text-amber-800">
                  The user will be temporarily unable to access their account. They will receive a notification about this suspension.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Suspension Reason *</label>
                <textarea
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  placeholder="Enter the reason for suspension (required)..."
                  rows={4}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
                />
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <button
                  onClick={() => {
                    setActionModal({ type: null });
                    setActionReason('');
                  }}
                  className="px-5 py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSuspendUser}
                  disabled={actionLoading || !actionReason.trim()}
                  className="flex items-center gap-2 px-5 py-2.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {actionLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Suspending...
                    </>
                  ) : (
                    <>
                      <Ban className="w-4 h-4" />
                      Suspend Account
                    </>
                  )}
                </button>
              </div>
            </div>
        </ModalShell>
      )}

      {/* Reactivate User Modal */}
      {actionModal.type === 'reactivate' && actionModal.user && (
        <ModalShell
          onClose={() => setActionModal({ type: null })}
          label={`Reactivate user account — ${actionModal.user.email}`}
        >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-emerald-100 rounded-full">
                <RotateCcw className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">Reactivate User Account</h3>
                <p className="text-sm text-slate-600">{actionModal.user.email}</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                <p className="text-sm text-emerald-800">
                  This will restore full access to the user's account. They will receive a notification about the reactivation.
                </p>
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <button
                  onClick={() => setActionModal({ type: null })}
                  className="px-5 py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReactivateUser}
                  disabled={actionLoading}
                  className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 font-medium"
                >
                  {actionLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Reactivating...
                    </>
                  ) : (
                    <>
                      <RotateCcw className="w-4 h-4" />
                      Reactivate Account
                    </>
                  )}
                </button>
              </div>
            </div>
        </ModalShell>
      )}

      {/* Delete User Modal */}
      {actionModal.type === 'delete' && actionModal.user && (
        <ModalShell
          onClose={() => { setActionModal({ type: null }); setActionReason(''); }}
          label={`Delete user account — ${actionModal.user.email}`}
        >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-red-100 rounded-full">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">Delete User Account</h3>
                <p className="text-sm text-slate-600">{actionModal.user.email}</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800 font-semibold mb-1">⚠️ Warning: This is a soft delete</p>
                <p className="text-sm text-red-700">
                  The user account will be marked as deleted. Their data will be preserved but they won't be able to access their account.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Deletion Reason *</label>
                <textarea
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  placeholder="Enter the reason for deletion (required)..."
                  rows={4}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
                />
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <button
                  onClick={() => {
                    setActionModal({ type: null });
                    setActionReason('');
                  }}
                  className="px-5 py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteUser}
                  disabled={actionLoading || !actionReason.trim()}
                  className="flex items-center gap-2 px-5 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {actionLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      Delete Account
                    </>
                  )}
                </button>
              </div>
            </div>
        </ModalShell>
      )}

      {/* User Details Modal */}
      {actionModal.type === 'details' && actionModal.user && (
        <ModalShell
          onClose={() => setActionModal({ type: null })}
          label={`User details — ${actionModal.user.email}`}
          panelClassName="bg-white rounded-xl max-w-3xl w-full p-4 sm:p-6 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto"
        >
            <div className="flex items-start justify-between gap-3 mb-6">
              <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                <UserAvatar user={actionModal.user} size="lg" />
                <div className="min-w-0">
                  <h3 className="text-xl sm:text-2xl font-bold text-slate-900 truncate">{actionModal.user.full_name || 'Unnamed User'}</h3>
                  <p className="text-sm sm:text-base text-slate-600 truncate">{actionModal.user.email}</p>
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold mt-2 ${
                    actionModal.user.status === 'active' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' :
                    actionModal.user.status === 'suspended' ? 'bg-amber-100 text-amber-700 border border-amber-200' :
                    'bg-red-100 text-red-700 border border-red-200'
                  }`}>
                    {actionModal.user.status === 'active' && <UserCheck className="w-3 h-3" />}
                    {actionModal.user.status === 'suspended' && <UserMinus className="w-3 h-3" />}
                    {actionModal.user.status === 'deleted' && <UserX className="w-3 h-3" />}
                    {actionModal.user.status.charAt(0).toUpperCase() + actionModal.user.status.slice(1)}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setActionModal({ type: null })}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="w-4 h-4 text-slate-500" />
                  <span className="text-sm font-medium text-slate-600">Joined</span>
                </div>
                <p className="text-lg font-semibold text-slate-900">
                  {new Date(actionModal.user.created_at).toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </p>
              </div>

              <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-slate-500" />
                  <span className="text-sm font-medium text-slate-600">Last Active</span>
                </div>
                <p className="text-lg font-semibold text-slate-900">
                  {actionModal.user.last_sign_in_at 
                    ? new Date(actionModal.user.last_sign_in_at).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })
                    : 'Never'
                  }
                </p>
              </div>

              <div className="bg-jade-50/60 rounded-lg p-4 border border-jade-100">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-jade-600" />
                  <span className="text-xs font-medium text-jade-700">Total income</span>
                </div>
                <p className="num text-xl font-semibold text-jade-700">
                  {formatCurrency(actionModal.user.total_income)}
                </p>
              </div>

              <div className="bg-coral-50/60 rounded-lg p-4 border border-coral-100">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingDown className="w-4 h-4 text-coral-600" />
                  <span className="text-xs font-medium text-coral-700">Total expenses</span>
                </div>
                <p className="num text-xl font-semibold text-coral-600">
                  {formatCurrency(actionModal.user.total_expenses)}
                </p>
              </div>
            </div>

            <div className="bg-slate-900 rounded-lg p-5 text-white mb-6">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="w-4 h-4 opacity-70" />
                <span className="text-xs font-medium opacity-70">Net amount</span>
              </div>
              <p className={`num text-2xl font-semibold ${
                (actionModal.user.total_income - actionModal.user.total_expenses) >= 0 ? 'text-jade-300' : 'text-coral-400'
              }`}>
                {formatCurrency(actionModal.user.total_income - actionModal.user.total_expenses)}
              </p>
            </div>

            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
              <div className="flex items-center gap-2 mb-1">
                <Bell className="w-4 h-4 text-slate-500" />
                <span className="text-xs font-medium text-slate-500">Notifications</span>
              </div>
              <p className="text-base font-medium text-slate-900">
                {actionModal.user.notification_count} notification(s) sent
              </p>
            </div>

            {/* Portfolio Information */}
            <div className="mt-6 pt-6 border-t border-slate-200">
              <h4 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-slate-700" />
                Portfolio Information
              </h4>
              
              {portfolioLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : userPortfolio && (userPortfolio.company_name || userPortfolio.position || userPortfolio.dreams) ? (
                <div className="space-y-4">
                  {/* Company and Position */}
                  {(userPortfolio.company_name || userPortfolio.position) && (
                    <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {userPortfolio.company_name && (
                          <div>
                            <div className="text-xs font-semibold text-slate-500 uppercase mb-1">Company</div>
                            <div className="text-base font-bold text-slate-800">{userPortfolio.company_name}</div>
                          </div>
                        )}
                        {userPortfolio.position && (
                          <div>
                            <div className="text-xs font-semibold text-slate-500 uppercase mb-1">Position</div>
                            <div className="text-base font-bold text-slate-800">{userPortfolio.position}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Rate Information */}
                  {(userPortfolio.hourly_rate > 0 || userPortfolio.monthly_rate > 0) && (
                    <div className="bg-emerald-50 rounded-lg p-4 border border-emerald-200">
                      <div className="flex items-center justify-between mb-3">
                        <div className="text-xs font-semibold text-emerald-700 uppercase">Compensation</div>
                        <div className="text-xs text-slate-600 bg-white px-2 py-1 rounded-full border border-emerald-200">
                          {userPortfolio.hours_per_day}h/day
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {userPortfolio.rate_type === 'monthly' && userPortfolio.monthly_rate > 0 && (
                          <>
                            <div>
                              <div className="text-xs text-slate-500 mb-1">Monthly Rate</div>
                              <div className="text-lg font-bold text-emerald-600">
                                ₱{userPortfolio.monthly_rate.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </div>
                            </div>
                            <div>
                              <div className="text-xs text-slate-500 mb-1">Daily Rate</div>
                              <div className="text-lg font-bold text-slate-700">
                                ₱{(userPortfolio.monthly_rate / 22.5).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </div>
                            </div>
                            <div>
                              <div className="text-xs text-slate-500 mb-1">Hourly Rate</div>
                              <div className="text-lg font-bold text-slate-700">
                                ₱{(userPortfolio.monthly_rate / 22.5 / userPortfolio.hours_per_day).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </div>
                            </div>
                          </>
                        )}
                        {userPortfolio.rate_type === 'hourly' && userPortfolio.hourly_rate > 0 && (
                          <>
                            <div>
                              <div className="text-xs text-slate-500 mb-1">Hourly Rate</div>
                              <div className="text-lg font-bold text-emerald-600">
                                ₱{userPortfolio.hourly_rate.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </div>
                            </div>
                            <div>
                              <div className="text-xs text-slate-500 mb-1">Daily Rate</div>
                              <div className="text-lg font-bold text-slate-700">
                                ₱{(userPortfolio.hourly_rate * userPortfolio.hours_per_day).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </div>
                            </div>
                            <div>
                              <div className="text-xs text-slate-500 mb-1">Monthly Estimate</div>
                              <div className="text-lg font-bold text-slate-700">
                                ₱{(userPortfolio.hourly_rate * userPortfolio.hours_per_day * 22.5).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Dreams/Goals */}
                  {userPortfolio.dreams && (
                    <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                      <div className="flex items-center gap-2 mb-2">
                        <Target className="w-4 h-4 text-purple-600" />
                        <div className="text-xs font-semibold text-purple-700 uppercase">5-Year Vision</div>
                      </div>
                      <p className="text-sm text-slate-700 whitespace-pre-wrap">{userPortfolio.dreams}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-slate-50 rounded-lg p-6 text-center border border-slate-200">
                  <Briefcase className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm text-slate-500">No portfolio information available</p>
                </div>
              )}
            </div>

            {/* Table Entries — what the user has input into their tables */}
            <div className="mt-6 pt-6 border-t border-slate-200">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                <h4 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-slate-700" />
                  Table Entries
                </h4>
                {userFinData && (
                  <div className="flex items-center gap-1.5 overflow-x-auto">
                    <button
                      onClick={() => setEntriesTab('income')}
                      className={`shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                        entriesTab === 'income' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      <TrendingUp className="w-3.5 h-3.5" />
                      Income ({userFinData.incomeHistory.length})
                    </button>
                    <button
                      onClick={() => setEntriesTab('expenses')}
                      className={`shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                        entriesTab === 'expenses' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      <TrendingDown className="w-3.5 h-3.5" />
                      Expenses ({userFinData.expenses.length})
                    </button>
                    <button
                      onClick={() => setEntriesTab('bills')}
                      className={`shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                        entriesTab === 'bills' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      <Receipt className="w-3.5 h-3.5" />
                      Bills ({userFinData.bills.length})
                    </button>
                  </div>
                )}
              </div>

              {finDataLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : !userFinData ? (
                <div className="bg-slate-50 rounded-lg p-6 text-center border border-slate-200">
                  <p className="text-sm text-slate-500">Could not load this user's entries</p>
                </div>
              ) : (
                <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
                  {entriesTab === 'income' && (
                    userFinData.incomeHistory.length === 0 ? (
                      <div className="bg-slate-50 rounded-lg p-6 text-center border border-slate-200">
                        <p className="text-sm text-slate-500">No income entries yet</p>
                      </div>
                    ) : (
                      userFinData.incomeHistory.map((entry) => {
                        const deductions: Array<[string, number | undefined]> = [
                          ['SSS', entry.sss],
                          ['Pag-IBIG', entry.pagibig],
                          ['PhilHealth', entry.philhealth],
                          ['VUL', entry.vul],
                          ['Emergency Fund', entry.emergencyFund],
                          ['General Savings', entry.generalSavings],
                        ];
                        return (
                          <div key={entry.id} className="bg-slate-50 rounded-lg border border-slate-200 p-3">
                            <div className="flex items-center justify-between gap-3 mb-2">
                              <span className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                                <Calendar className="w-3 h-3" />
                                {new Date(entry.date).toLocaleDateString()}
                              </span>
                              <span className="text-sm font-bold text-emerald-600 tabular-nums">
                                {formatCurrency(entry.weeklySalary)}
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {deductions.filter(([, amount]) => (amount ?? 0) > 0).map(([label, amount]) => (
                                <span key={label} className="px-2 py-0.5 bg-white border border-slate-200 rounded-full text-[11px] text-slate-600">
                                  {label}: {formatCurrency(amount ?? 0)}
                                </span>
                              ))}
                              {(entry.paidBills ?? []).map((bill) => (
                                <span key={bill.billId} className="px-2 py-0.5 bg-amber-50 border border-amber-200 rounded-full text-[11px] text-amber-700">
                                  {bill.name}: {formatCurrency(bill.amount)}
                                </span>
                              ))}
                            </div>
                          </div>
                        );
                      })
                    )
                  )}

                  {entriesTab === 'expenses' && (
                    userFinData.expenses.length === 0 ? (
                      <div className="bg-slate-50 rounded-lg p-6 text-center border border-slate-200">
                        <p className="text-sm text-slate-500">No expenses yet</p>
                      </div>
                    ) : (
                      userFinData.expenses.map((expense) => (
                        <div key={expense.id} className="flex items-center justify-between gap-3 bg-slate-50 rounded-lg border border-slate-200 px-3 py-2">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-slate-800 truncate">{expense.description || expense.category}</p>
                            <p className="text-[11px] text-slate-500">{expense.category} · {new Date(expense.date).toLocaleDateString()}</p>
                          </div>
                          <span className="text-sm font-semibold text-red-600 tabular-nums shrink-0">{formatCurrency(expense.amount)}</span>
                        </div>
                      ))
                    )
                  )}

                  {entriesTab === 'bills' && (
                    userFinData.bills.length === 0 ? (
                      <div className="bg-slate-50 rounded-lg p-6 text-center border border-slate-200">
                        <p className="text-sm text-slate-500">No bills yet</p>
                      </div>
                    ) : (
                      userFinData.bills.map((bill) => {
                        const paymentsMade = userFinData.billPayments.filter(p => p.billId === bill.id).length;
                        return (
                          <div key={bill.id} className="flex items-center justify-between gap-3 bg-slate-50 rounded-lg border border-slate-200 px-3 py-2">
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-slate-800 truncate">{bill.name}</p>
                              <p className="text-[11px] text-slate-500">
                                {bill.category} · Due {new Date(bill.dueDate).toLocaleDateString()} · {paymentsMade} payment{paymentsMade === 1 ? '' : 's'}
                              </p>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-sm font-semibold text-slate-800 tabular-nums">{formatCurrency(bill.amount)}</p>
                              <p className={`text-[11px] font-medium ${bill.active ? 'text-emerald-600' : 'text-slate-400'}`}>
                                {bill.active ? 'Active' : 'Inactive'}
                              </p>
                            </div>
                          </div>
                        );
                      })
                    )
                  )}
                </div>
              )}
            </div>

            <div className="flex gap-3 justify-end mt-6 pt-6 border-t border-slate-200">
              <button
                onClick={() => setActionModal({ type: null })}
                className="px-5 py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setShowMessageModal(true);
                }}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                <Mail className="w-4 h-4" />
                Send Message
              </button>
            </div>
        </ModalShell>
      )}

      {/* Sent Messages Modal */}
      {showSentMessagesModal && (
        <ModalShell
          onClose={() => setShowSentMessagesModal(false)}
          label="Sent messages"
          panelClassName="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col"
        >
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <div>
                <h3 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                  <MessageSquare className="w-6 h-6 text-blue-600" />
                  Sent Messages
                </h3>
                <p className="text-sm text-slate-600 mt-1">Track delivery and read status of your messages</p>
              </div>
              <button
                onClick={() => setShowSentMessagesModal(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {sentMessagesLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : sentMessages.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <MessageSquare className="w-16 h-16 mx-auto mb-3 opacity-20" />
                  <p className="font-medium">No messages sent yet</p>
                  <p className="text-sm mt-1">Messages you send to users will appear here</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {sentMessages.map((message) => (
                    <div
                      key={message.id}
                      className="bg-slate-50 rounded-lg p-4 border border-slate-200 hover:border-slate-300 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-bold text-slate-900">{message.title}</h4>
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                              message.type === 'info' ? 'bg-blue-100 text-blue-700' :
                              message.type === 'success' ? 'bg-emerald-100 text-emerald-700' :
                              message.type === 'warning' ? 'bg-amber-100 text-amber-700' :
                              'bg-red-100 text-red-700'
                            }`}>
                              {message.type}
                            </span>
                          </div>
                          <p className="text-sm text-slate-600 mb-2">{message.message}</p>
                          <div className="flex items-center gap-3 text-xs text-slate-500">
                            <span className="font-medium">To: {message.recipient_name}</span>
                            <span>•</span>
                            <span>{message.recipient_email}</span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2 shrink-0">
                          {message.is_read ? (
                            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-full text-xs font-semibold">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Read
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-200 text-slate-600 rounded-full text-xs font-semibold">
                              <ClockIcon className="w-3.5 h-3.5" />
                              Unread
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center justify-between pt-3 border-t border-slate-200">
                        <div className="text-xs text-slate-500">
                          <span className="font-medium">Sent:</span> {new Date(message.sent_at).toLocaleString(undefined, {
                            dateStyle: 'medium',
                            timeStyle: 'short'
                          })}
                        </div>
                        {message.read_at && (
                          <div className="text-xs text-emerald-600 font-medium">
                            <span>Read:</span> {new Date(message.read_at).toLocaleString(undefined, {
                              dateStyle: 'medium',
                              timeStyle: 'short'
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-between items-center p-6 border-t border-slate-200 bg-slate-50">
              <div className="text-sm text-slate-600">
                {sentMessages.length > 0 && (
                  <>
                    <span className="font-semibold">{sentMessages.filter(m => m.is_read).length}</span> read, {' '}
                    <span className="font-semibold">{sentMessages.filter(m => !m.is_read).length}</span> unread
                  </>
                )}
              </div>
              <button
                onClick={() => setShowSentMessagesModal(false)}
                className="px-5 py-2.5 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors font-medium"
              >
                Close
              </button>
            </div>
        </ModalShell>
      )}
    </div>
  );
};
