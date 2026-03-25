import { useState, useEffect, useCallback } from 'react';

export interface NotificationItem {
  id: string;
  type: 'missing' | 'attention' | 'overdue' | 'preparing' | 'replenished';
  title: string;
  body: string;
  timestamp: Date;
  read: boolean;
  itemId?: string;
}

const STORAGE_KEY = 'notification-history';
const MAX_NOTIFICATIONS = 50;

export function useNotificationHistory() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        const items = parsed.map((n: NotificationItem) => ({
          ...n,
          timestamp: new Date(n.timestamp),
        }));
        setNotifications(items);
        setUnreadCount(items.filter((n: NotificationItem) => !n.read).length);
      }
    } catch (error) {
      console.error('Error loading notification history:', error);
    }
  }, []);

  // Save to localStorage whenever notifications change
  const saveNotifications = useCallback((items: NotificationItem[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (error) {
      console.error('Error saving notification history:', error);
    }
  }, []);

  const addNotification = useCallback((notification: Omit<NotificationItem, 'id' | 'timestamp' | 'read'>) => {
    const newNotification: NotificationItem = {
      ...notification,
      id: crypto.randomUUID(),
      timestamp: new Date(),
      read: false,
    };

    setNotifications(prev => {
      const updated = [newNotification, ...prev].slice(0, MAX_NOTIFICATIONS);
      saveNotifications(updated);
      return updated;
    });

    setUnreadCount(prev => prev + 1);
  }, [saveNotifications]);

  const markAsRead = useCallback((id: string) => {
    setNotifications(prev => {
      const updated = prev.map(n => 
        n.id === id ? { ...n, read: true } : n
      );
      saveNotifications(updated);
      setUnreadCount(updated.filter(n => !n.read).length);
      return updated;
    });
  }, [saveNotifications]);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => {
      const updated = prev.map(n => ({ ...n, read: true }));
      saveNotifications(updated);
      setUnreadCount(0);
      return updated;
    });
  }, [saveNotifications]);

  const clearAll = useCallback(() => {
    setNotifications([]);
    setUnreadCount(0);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => {
      const notification = prev.find(n => n.id === id);
      const updated = prev.filter(n => n.id !== id);
      saveNotifications(updated);
      if (notification && !notification.read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
      return updated;
    });
  }, [saveNotifications]);

  return {
    notifications,
    unreadCount,
    addNotification,
    markAsRead,
    markAllAsRead,
    clearAll,
    removeNotification,
  };
}
