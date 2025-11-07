import { useEffect, useState } from 'react';
import { notificationApi, type Notification, NotificationType } from '../services/notifications';
import { UserAvatar } from './UserInfo';
import '../styles/NotificationPanel.css';

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NotificationPanel({ isOpen, onClose }: NotificationPanelProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      loadNotifications();
    }
  }, [isOpen]);

  const loadNotifications = async () => {
    try {
      setIsLoading(true);
      const data = await notificationApi.getNotifications(false, 20);
      setNotifications(data);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await notificationApi.markAsRead([notificationId]);
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n)
      );
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationApi.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case NotificationType.NEW_FOLLOWER:
        return '👤';
      case NotificationType.LIKE:
        return '❤️';
      case NotificationType.COMMENT:
        return '💬';
      case NotificationType.MENTION:
        return '@';
      default:
        return '🔔';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="notification-overlay" onClick={onClose}></div>
      <div className="notification-panel">
        <div className="notification-header">
          <h2>Notifications</h2>
          <div className="notification-header-actions">
            {notifications.some(n => !n.isRead) && (
              <button onClick={handleMarkAllAsRead} className="mark-all-read-btn">
                Mark all as read
              </button>
            )}
            <button onClick={onClose} className="close-btn">×</button>
          </div>
        </div>

        <div className="notification-list">
          {isLoading ? (
            <div className="notification-loading">
              <div className="loading-spinner"></div>
            </div>
          ) : notifications.length === 0 ? (
            <div className="notification-empty">
              <p>No notifications yet</p>
            </div>
          ) : (
            notifications.map(notification => (
              <div
                key={notification.id}
                className={`notification-item ${!notification.isRead ? 'unread' : ''}`}
                onClick={() => !notification.isRead && handleMarkAsRead(notification.id)}
              >
                <div className="notification-avatar">
                  {notification.metadata.fromUserId ? (
                    <UserAvatar userId={notification.metadata.fromUserId} size="medium" />
                  ) : (
                    <div className="notification-icon">
                      {getNotificationIcon(notification.type)}
                    </div>
                  )}
                </div>
                <div className="notification-content">
                  <p className="notification-text">{notification.content}</p>
                  <span className="notification-time">{formatDate(notification.createdAt)}</span>
                </div>
                {!notification.isRead && <div className="unread-indicator"></div>}
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
