import React, { useState, useEffect } from 'react';
import { Bell, X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { getUserNotifications, markNotificationAsRead, deleteNotification, UserNotification } from '../lib/adminUtils';

export const NotificationBar: React.FC = () => {
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadNotifications = async () => {
    setLoading(true);
    const data = await getUserNotifications();
    setNotifications(data);
    setLoading(false);
  };

  const handleMarkAsRead = async (id: string) => {
    const result = await markNotificationAsRead(id);
    if (result.success) {
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, is_read: true, read_at: new Date().toISOString() } : n)
      );
    }
  };

  const handleDelete = async (id: string) => {
    const result = await deleteNotification(id);
    if (result.success) {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const getIcon = (type: UserNotification['type']) => {
    switch (type) {
      case 'success': return <CheckCircle className="w-4 h-4 text-jade-600" />;
      case 'error':   return <AlertCircle className="w-4 h-4 text-coral-600" />;
      case 'warning': return <AlertTriangle className="w-4 h-4 text-gold-600" />;
      default:        return <Info className="w-4 h-4 text-ink-muted" />;
    }
  };

  if (notifications.length === 0) {
    return null;
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg hover:bg-paper-soft active:bg-paper-deep transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center"
        title="Notifications"
        aria-label={`Notifications ${unreadCount > 0 ? `(${unreadCount} unread)` : ''}`}
      >
        <Bell className="w-4 h-4 text-ink-soft" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-coral-500 text-paper text-[10px] font-medium rounded-full w-4 h-4 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/20 sm:bg-transparent"
            onClick={() => setIsOpen(false)}
          />
          <div className="fixed sm:absolute inset-x-3 top-14 sm:inset-x-auto sm:right-0 sm:top-auto sm:mt-2 sm:w-96 max-h-[calc(100vh-5rem)] sm:max-h-[560px] bg-paper rounded-xl shadow-paper-lift border border-rule z-50 animate-fade-up overflow-hidden flex flex-col">
            <div className="px-4 py-3 border-b border-rule bg-paper-soft/60 flex items-center justify-between sticky top-0 z-10">
              <h3 className="font-medium text-ink flex items-center gap-2 text-sm">
                <Bell className="w-4 h-4" />
                Notifications
                {unreadCount > 0 && (
                  <span className="bg-ink text-paper text-[10px] px-1.5 py-0.5 rounded-md font-medium">
                    {unreadCount} new
                  </span>
                )}
              </h3>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 hover:bg-paper-soft rounded-md transition-colors"
                aria-label="Close notifications"
              >
                <X className="w-4 h-4 text-ink-muted" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 overscroll-contain">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-5 h-5 border-2 border-ink/15 border-t-ink rounded-full animate-spin" />
                </div>
              ) : notifications.length === 0 ? (
                <div className="px-4 py-8 text-center text-ink-muted">
                  <Bell className="w-10 h-10 mx-auto mb-2 opacity-20" />
                  <p className="text-sm">No notifications</p>
                </div>
              ) : (
                <div className="divide-y divide-rule">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-3.5 transition-colors ${
                        notification.is_read ? 'bg-paper' : 'bg-paper-soft/40'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="shrink-0 mt-0.5">
                          {getIcon(notification.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-0.5">
                            <h4 className="font-medium text-ink text-sm leading-tight">
                              {notification.title}
                            </h4>
                            <button
                              onClick={() => handleDelete(notification.id)}
                              className="shrink-0 p-1 hover:bg-paper-soft rounded-md transition-colors"
                              title="Delete notification"
                              aria-label="Delete notification"
                            >
                              <X className="w-3.5 h-3.5 text-ink-muted" />
                            </button>
                          </div>
                          <p className="text-sm text-ink-muted mb-2 whitespace-pre-wrap break-words leading-relaxed">
                            {notification.message}
                          </p>
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                            <span className="text-xs text-ink-whisper order-2 sm:order-1">
                              {new Date(notification.sent_at).toLocaleString(undefined, {
                                dateStyle: 'short',
                                timeStyle: 'short'
                              })}
                            </span>
                            {!notification.is_read && (
                              <button
                                onClick={() => handleMarkAsRead(notification.id)}
                                className="text-xs text-ink hover:text-ink-soft font-medium self-start sm:self-auto order-1 sm:order-2 py-0.5 underline-offset-2 hover:underline"
                              >
                                Mark as read
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
