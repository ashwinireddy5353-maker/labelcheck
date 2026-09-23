import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { notificationApi } from '../api/services';
import { useToast } from '../context/ToastContext';
import { NotificationItem } from '../types';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { 
  Bell, 
  Check, 
  Trash2, 
  AlertTriangle, 
  Info, 
  CheckCircle2, 
  ArrowRight 
} from 'lucide-react';

export const NotificationsPage: React.FC = () => {
  const { showToast } = useToast();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  useEffect(() => {
    async function loadNotifs() {
      try {
        const res = await notificationApi.getNotifications();
        setNotifications(res);
      } catch {
        showToast('Failed to load notifications.', 'error');
      }
    }
    loadNotifs();
  }, []);

  const handleMarkAsRead = async (id: string) => {
    try {
      await notificationApi.markAsRead(id);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    } catch {
      showToast('Could not update notification state.', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await notificationApi.deleteNotification(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      showToast('Notification deleted.', 'success');
    } catch {
      showToast('Failed to delete notification.', 'error');
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 flex items-center gap-2">
            <Bell className="w-7 h-7 text-teal-700" />
            Notifications & Alerts
          </h1>
          <p className="text-xs text-slate-500">
            Scan completion alerts, database safety updates, and cleaner alternative suggestions.
          </p>
        </div>
      </div>

      {/* Main List */}
      {notifications.length === 0 ? (
        <EmptyState
          title="No Notifications"
          description="You are all caught up! Account and scan alerts will appear here."
        />
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden divide-y divide-slate-100">
          {notifications.map((notif) => {
            const Icon = {
              warning: AlertTriangle,
              info: Info,
              success: CheckCircle2,
              alert: AlertTriangle,
            }[notif.type] || Bell;

            const iconColors = {
              warning: 'text-amber-600 bg-amber-50',
              info: 'text-teal-700 bg-teal-50',
              success: 'text-emerald-600 bg-emerald-50',
              alert: 'text-red-600 bg-red-50',
            }[notif.type];

            return (
              <div
                key={notif.id}
                className={`p-5 flex items-start justify-between gap-4 transition-colors ${
                  !notif.read ? 'bg-teal-50/20' : 'hover:bg-slate-50'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className={`p-2.5 rounded-2xl shrink-0 ${iconColors}`}>
                    <Icon className="w-5 h-5" />
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className={`text-sm ${!notif.read ? 'font-extrabold text-slate-900' : 'font-bold text-slate-700'}`}>
                        {notif.title}
                      </h4>
                      {!notif.read && (
                        <span className="w-2 h-2 rounded-full bg-teal-600" title="Unread" />
                      )}
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed">{notif.message}</p>
                    <p className="text-[10px] text-slate-400">{new Date(notif.createdAt).toLocaleString()}</p>

                    {notif.link && (
                      <Link
                        to={notif.link}
                        className="inline-flex items-center gap-1 text-xs font-bold text-teal-700 hover:underline pt-1"
                      >
                        <span>View Related Details</span>
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {!notif.read && (
                    <button
                      onClick={() => handleMarkAsRead(notif.id)}
                      className="p-1.5 text-slate-400 hover:text-teal-700 rounded-lg hover:bg-slate-100"
                      title="Mark as read"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(notif.id)}
                    className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-slate-100"
                    title="Delete notification"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
