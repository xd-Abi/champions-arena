import { useEffect, useState } from 'react';
import { notificationApi } from '../services/notifications';
import { NotificationPanel } from './NotificationPanel';
import '../styles/NotificationBell.css';

export function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  useEffect(() => {
    loadUnreadCount();

    // Poll for updates every 30 seconds
    const interval = setInterval(loadUnreadCount, 30000);

    return () => clearInterval(interval);
  }, []);

  const loadUnreadCount = async () => {
    try {
      const { count } = await notificationApi.getUnreadCount();
      setUnreadCount(count);
    } catch (error) {
      console.error('Failed to load unread count:', error);
    }
  };

  const handleTogglePanel = () => {
    setIsPanelOpen(prev => !prev);
    if (!isPanelOpen && unreadCount > 0) {
      // Refresh count when opening panel
      setTimeout(loadUnreadCount, 1000);
    }
  };

  return (
    <>
      <button onClick={handleTogglePanel} className="notification-bell-btn">
        <svg viewBox="0 0 24 24" className="notification-bell-icon">
          <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2zm-2 1H8v-6c0-2.48 1.51-4.5 4-4.5s4 2.02 4 4.5v6z" fill="currentColor"/>
        </svg>
        {unreadCount > 0 && (
          <span className="notification-badge">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      <NotificationPanel
        isOpen={isPanelOpen}
        onClose={() => setIsPanelOpen(false)}
      />
    </>
  );
}
