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
} from 'lucide-react';
import {
  getUserStatistics,
  getAllUsersWithDetails,
  sendNotificationToUser,
  sendNotificationToMultipleUsers,
  suspendUserAccount,
  reactivateUserAccount,
  deleteUserAccount,
  UserWithDetails,
  UserStats,
} from '../lib/adminUtils';

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

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [users, searchTerm, statusFilter]);

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

    setFilteredUsers(filtered);
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
    const userIds = Array.from(selectedUsers);
    const result = await sendNotificationToMultipleUsers(userIds, messageTitle, messageBody, messageType);
    
    if (result.success) {
      setActionMessage({ type: 'success', text: `Message sent to ${result.sentCount} user(s)` });
      setShowMessageModal(false);
      setMessageTitle('');
      setMessageBody('');
      setSelectedUsers(new Set());
      setTimeout(() => setActionMessage(null), 3000);
    } else {
      setActionMessage({ type: 'error', text: result.error || 'Failed to send message' });
    }
    setActionLoading(false);
  };

  const handleSuspendUser = async (userId: string, email: string) => {
    const reason = prompt(`Enter suspension reason for ${email}:`);
    if (!reason) return;

    setActionLoading(true);
    const result = await suspendUserAccount(userId, reason);
    
    if (result.success) {
      setActionMessage({ type: 'success', text: 'User suspended successfully' });
      loadData();
      setTimeout(() => setActionMessage(null), 3000);
    } else {
      setActionMessage({ type: 'error', text: result.error || 'Failed to suspend user' });
    }
    setActionLoading(false);
  };

  const handleReactivateUser = async (userId: string, email: string) => {
    if (!confirm(`Reactivate account for ${email}?`)) return;

    setActionLoading(true);
    const result = await reactivateUserAccount(userId);
    
    if (result.success) {
      setActionMessage({ type: 'success', text: 'User reactivated successfully' });
      loadData();
      setTimeout(() => setActionMessage(null), 3000);
    } else {
      setActionMessage({ type: 'error', text: result.error || 'Failed to reactivate user' });
    }
    setActionLoading(false);
  };

  const handleDeleteUser = async (userId: string, email: string) => {
    const reason = prompt(`Enter deletion reason for ${email}:`);
    if (!reason) return;

    if (!confirm(`Are you sure you want to delete ${email}? This action cannot be undone.`)) return;

    setActionLoading(true);
    const result = await deleteUserAccount(userId, reason);
    
    if (result.success) {
      setActionMessage({ type: 'success', text: 'User deleted successfully' });
      loadData();
      setTimeout(() => setActionMessage(null), 3000);
    } else {
      setActionMessage({ type: 'error', text: result.error || 'Failed to delete user' });
    }
    setActionLoading(false);
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Admin Dashboard</h2>
          <p className="text-sm text-slate-600 mt-1">Manage users and send notifications</p>
        </div>
        <button
          onClick={loadData}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Action Message */}
      {actionMessage && (
        <div className={`p-4 rounded-lg flex items-center gap-2 ${
          actionMessage.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
        }`}>
          <AlertCircle className="w-5 h-5" />
          {actionMessage.text}
        </div>
      )}

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <Users className="w-8 h-8 text-blue-600" />
              <span className="text-2xl font-bold text-slate-900">{stats.total_users}</span>
            </div>
            <p className="text-sm text-slate-600 font-medium">Total Users</p>
          </div>

          <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <UserCheck className="w-8 h-8 text-emerald-600" />
              <span className="text-2xl font-bold text-slate-900">{stats.active_users}</span>
            </div>
            <p className="text-sm text-slate-600 font-medium">Active Users</p>
          </div>

          <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <UserMinus className="w-8 h-8 text-amber-600" />
              <span className="text-2xl font-bold text-slate-900">{stats.suspended_users}</span>
            </div>
            <p className="text-sm text-slate-600 font-medium">Suspended</p>
          </div>

          <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <UserX className="w-8 h-8 text-red-600" />
              <span className="text-2xl font-bold text-slate-900">{stats.deleted_users}</span>
            </div>
            <p className="text-sm text-slate-600 font-medium">Deleted</p>
          </div>
        </div>
      )}

      {/* Filters and Actions */}
      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by email or name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>

          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 bg-white appearance-none cursor-pointer"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
              <option value="deleted">Deleted</option>
            </select>
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
        <div className="overflow-x-auto">
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
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  User
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Income
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Expenses
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Net
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Joined
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
                      <div>
                        <p className="font-medium text-slate-900">{user.full_name || 'N/A'}</p>
                        <p className="text-sm text-slate-500">{user.email}</p>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                        user.status === 'active' ? 'bg-emerald-100 text-emerald-700' :
                        user.status === 'suspended' ? 'bg-amber-100 text-amber-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {user.status === 'active' && <UserCheck className="w-3 h-3" />}
                        {user.status === 'suspended' && <UserMinus className="w-3 h-3" />}
                        {user.status === 'deleted' && <UserX className="w-3 h-3" />}
                        {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-1 text-emerald-600 font-medium">
                        <TrendingUp className="w-4 h-4" />
                        {formatCurrency(user.total_income)}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-1 text-red-600 font-medium">
                        <TrendingDown className="w-4 h-4" />
                        {formatCurrency(user.total_expenses)}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`font-bold ${netAmount >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {formatCurrency(netAmount)}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-600">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => sendNotificationToUser(user.id, 'Admin Message', 'You have a new message from admin', 'info')}
                          className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors"
                          title="Send message"
                        >
                          <Mail className="w-4 h-4" />
                        </button>
                        
                        {user.status === 'active' && (
                          <button
                            onClick={() => handleSuspendUser(user.id, user.email)}
                            className="p-2 hover:bg-amber-50 text-amber-600 rounded-lg transition-colors"
                            title="Suspend user"
                          >
                            <Ban className="w-4 h-4" />
                          </button>
                        )}
                        
                        {user.status === 'suspended' && (
                          <button
                            onClick={() => handleReactivateUser(user.id, user.email)}
                            className="p-2 hover:bg-emerald-50 text-emerald-600 rounded-lg transition-colors"
                            title="Reactivate user"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                        )}
                        
                        <button
                          onClick={() => handleDeleteUser(user.id, user.email)}
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

        {filteredUsers.length === 0 && (
          <div className="text-center py-12 text-slate-500">
            <Users className="w-12 h-12 mx-auto mb-2 opacity-20" />
            <p>No users found</p>
          </div>
        )}
      </div>

      {/* Message Modal */}
      {showMessageModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full p-6 animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-xl font-bold text-slate-900 mb-4">Send Message to Selected Users</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Message Type</label>
                <select
                  value={messageType}
                  onChange={(e) => setMessageType(e.target.value as any)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="info">Info</option>
                  <option value="success">Success</option>
                  <option value="warning">Warning</option>
                  <option value="error">Error</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
                <input
                  type="text"
                  value={messageTitle}
                  onChange={(e) => setMessageTitle(e.target.value)}
                  placeholder="Enter message title..."
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Message</label>
                <textarea
                  value={messageBody}
                  onChange={(e) => setMessageBody(e.target.value)}
                  placeholder="Enter your message..."
                  rows={6}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
                />
              </div>

              <div className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg">
                This message will be sent to <span className="font-bold">{selectedUsers.size}</span> user(s)
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowMessageModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSendMessage}
                  disabled={actionLoading}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
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
          </div>
        </div>
      )}
    </div>
  );
};
