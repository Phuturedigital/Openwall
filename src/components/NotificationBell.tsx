import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Check, X, Clock, CheckCircle, XCircle, AlertCircle, Info } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

type Notification = {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  note_id: string | null;
  read: boolean;
  created_at: string;
  read_at: string | null;
};

type NotificationBellProps = {
  onViewChange?: (view: string) => void;
};

export function NotificationBell({ onViewChange }: NotificationBellProps = {}) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toastNotification, setToastNotification] = useState<Notification | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;

    fetchNotifications();

    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newNotification = payload.new as Notification;
          setNotifications((prev) => [newNotification, ...prev]);
          setToastNotification(newNotification);
          setTimeout(() => setToastNotification(null), 5000);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const updatedNotification = payload.new as Notification;
          setNotifications((prev) =>
            prev.map((n) => (n.id === updatedNotification.id ? updatedNotification : n))
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const fetchNotifications = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (!error && data) {
        setNotifications(data);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true, read_at: new Date().toISOString() })
        .eq('id', notificationId)
        .eq('user_id', user.id);

      if (!error) {
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notificationId ? { ...n, read: true, read_at: new Date().toISOString() } : n
          )
        );
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;

    try {
      const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id);
      if (unreadIds.length === 0) return;

      const { error } = await supabase
        .from('notifications')
        .update({ read: true, read_at: new Date().toISOString() })
        .in('id', unreadIds)
        .eq('user_id', user.id);

      if (!error) {
        setNotifications((prev) =>
          prev.map((n) => ({ ...n, read: true, read_at: n.read_at || new Date().toISOString() }))
        );
      }
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.read) {
      await markAsRead(notification.id);
    }

    setIsOpen(false);

    if (notification.note_id) {
      if (window.location.pathname === '/' || window.location.pathname === '/wall') {
        const noteElement = document.getElementById(`note-${notification.note_id}`);
        if (noteElement) {
          noteElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          noteElement.classList.add('note-highlight');
          setTimeout(() => {
            noteElement.classList.remove('note-highlight');
          }, 2000);
          return;
        }
      }

      if (onViewChange) {
        onViewChange('wall');
        setTimeout(() => {
          const noteElement = document.getElementById(`note-${notification.note_id}`);
          if (noteElement) {
            noteElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            noteElement.classList.add('note-highlight');
            setTimeout(() => {
              noteElement.classList.remove('note-highlight');
            }, 2000);
          }
        }, 300);
      }
    } else if (notification.link) {
      if (notification.link.startsWith('/')) {
        const view = notification.link.substring(1);
        if (onViewChange) {
          onViewChange(view || 'wall');
        } else {
          window.location.href = notification.link;
        }
      } else {
        window.location.href = notification.link;
      }
    }
  };

  const handleToastClick = (notification: Notification) => {
    setToastNotification(null);
    handleNotificationClick(notification);
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'request_approved':
        return <CheckCircle className="w-4 h-4 text-green-500" aria-hidden="true" />;
      case 'request_declined':
        return <XCircle className="w-4 h-4 text-red-500" aria-hidden="true" />;
      case 'request_received':
        return <AlertCircle className="w-4 h-4 text-blue-500" aria-hidden="true" />;
      case 'note_unlocked':
        return <Check className="w-4 h-4 text-blue-500" aria-hidden="true" />;
      case 'note_fulfilled':
        return <Clock className="w-4 h-4 text-yellow-500" aria-hidden="true" />;
      case 'system':
        return <Info className="w-4 h-4 text-gray-500" aria-hidden="true" />;
      default:
        return <Bell className="w-4 h-4 text-gray-500" aria-hidden="true" />;
    }
  };

  const getNotificationBgColor = (type: string) => {
    switch (type) {
      case 'request_approved':
        return 'bg-green-50 dark:bg-green-900/20';
      case 'request_declined':
        return 'bg-red-50 dark:bg-red-900/20';
      case 'request_received':
        return 'bg-blue-50 dark:bg-blue-900/20';
      case 'note_unlocked':
        return 'bg-blue-50 dark:bg-blue-900/20';
      case 'note_fulfilled':
        return 'bg-yellow-50 dark:bg-yellow-900/20';
      case 'system':
        return 'bg-gray-50 dark:bg-gray-700/50';
      default:
        return 'bg-gray-50 dark:bg-gray-700/50';
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  if (!user) return null;

  return (
    <div ref={dropdownRef} className="relative">
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors cursor-pointer"
        aria-label="Open notifications"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <Bell className="w-5 h-5" aria-hidden="true" />
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-semibold"
            aria-label={`${unreadCount} unread notifications`}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </motion.span>
        )}
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-96 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden z-50"
            role="menu"
            aria-orientation="vertical"
          >
            <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-white">Notifications</h3>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                >
                  Mark all as read
                </button>
              )}
            </div>

            <div className="max-h-96 overflow-y-auto">
              {loading ? (
                <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                  <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto" />
                  <p className="mt-2 text-sm">Loading notifications...</p>
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                  <Bell className="w-12 h-12 mx-auto mb-2 opacity-50" aria-hidden="true" />
                  <p className="text-sm">No notifications yet</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                  {notifications.map((notification) => (
                    <button
                      key={notification.id}
                      onClick={() => handleNotificationClick(notification)}
                      className={`w-full p-4 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer ${
                        !notification.read ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''
                      }`}
                      role="menuitem"
                    >
                      <div className="flex gap-3">
                        <div className={`flex-shrink-0 w-8 h-8 rounded-full ${getNotificationBgColor(notification.type)} flex items-center justify-center`}>
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className={`text-sm font-medium ${!notification.read ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}>
                              {notification.title}
                            </p>
                            {!notification.read && (
                              <div className="flex-shrink-0 w-2 h-2 bg-blue-600 rounded-full" aria-label="Unread" />
                            )}
                          </div>
                          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                            {notification.message}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                            {formatTime(notification.created_at)}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {notifications.length > 0 && (
              <div className="border-t border-gray-100 dark:border-gray-700 p-2 bg-gray-50 dark:bg-gray-800">
                <button
                  onClick={() => {
                    setIsOpen(false);
                  }}
                  className="w-full text-center text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white py-2 cursor-pointer"
                >
                  View all notifications
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toastNotification && (
          <motion.div
            initial={{ opacity: 0, y: -20, x: 20 }}
            animate={{ opacity: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, y: -20, x: 20 }}
            transition={{ duration: 0.3 }}
            className="fixed top-20 right-4 z-50 max-w-sm"
          >
            <button
              onClick={() => handleToastClick(toastNotification)}
              className={`w-full p-4 rounded-xl shadow-2xl border cursor-pointer transition-all hover:scale-105 ${
                toastNotification.type === 'request_approved'
                  ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                  : toastNotification.type === 'request_declined'
                  ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                  : toastNotification.type === 'note_fulfilled'
                  ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
                  : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
              }`}
            >
              <div className="flex gap-3 items-start">
                <div className={`flex-shrink-0 w-10 h-10 rounded-full ${getNotificationBgColor(toastNotification.type)} flex items-center justify-center`}>
                  {getNotificationIcon(toastNotification.type)}
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
                    {toastNotification.title}
                  </p>
                  <p className="text-xs text-gray-700 dark:text-gray-300">
                    {toastNotification.message}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    Click to view
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setToastNotification(null);
                  }}
                  className="flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  aria-label="Dismiss notification"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
