const API_BASE_URL = 'https://champions-arena.itsabi.com/api/notifications';

function getCookie(name: string): string | null {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    return parts.pop()?.split(';').shift() || null;
  }
  return null;
}

async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const token = getCookie('ca-auth');

  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  const response = await fetch(url, { ...options, headers });

  if (!response.ok) {
    throw new Error(`API Error: ${response.statusText}`);
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return null;
  }

  return response.json();
}

export enum NotificationType {
  NEW_FOLLOWER = 'NEW_FOLLOWER',
  LIKE = 'LIKE',
  COMMENT = 'COMMENT',
  MENTION = 'MENTION',
}

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  content: string;
  metadata: {
    fromUserId?: string;
    fromUsername?: string;
    tweetId?: string;
    commentId?: string;
  };
  isRead: boolean;
  createdAt: string;
}

export interface NotificationCount {
  count: number;
}

export const notificationApi = {
  // Get all notifications
  getNotifications: (unreadOnly = false, limit?: number): Promise<Notification[]> => {
    const params = new URLSearchParams();
    if (unreadOnly) params.append('unreadOnly', 'true');
    if (limit) params.append('limit', limit.toString());

    const query = params.toString() ? `?${params.toString()}` : '';
    return fetchWithAuth(`${API_BASE_URL}${query}`);
  },

  // Get unread count
  getUnreadCount: (): Promise<NotificationCount> => {
    return fetchWithAuth(`${API_BASE_URL}/count`);
  },

  // Mark notifications as read
  markAsRead: (notificationIds: string[]): Promise<void> => {
    return fetchWithAuth(`${API_BASE_URL}/mark-as-read`, {
      method: 'POST',
      body: JSON.stringify({ notificationIds }),
    });
  },

  // Mark all as read
  markAllAsRead: (): Promise<void> => {
    return fetchWithAuth(`${API_BASE_URL}/mark-all-read`, {
      method: 'POST',
    });
  },

  // Subscribe to push notifications
  subscribe: (deviceToken: string, platform: string): Promise<void> => {
    return fetchWithAuth(`${API_BASE_URL}/subscribe`, {
      method: 'POST',
      body: JSON.stringify({ deviceToken, platform }),
    });
  },

  // Unsubscribe from push notifications
  unsubscribe: (): Promise<void> => {
    return fetchWithAuth(`${API_BASE_URL}/unsubscribe`, {
      method: 'DELETE',
    });
  },

  // Create SSE connection for real-time notifications
  createEventSource: (userId: string): EventSource => {
    return new EventSource(`${API_BASE_URL}/stream?userId=${userId}`);
  },
};
