import { useState, useEffect, useCallback } from 'react';

type NotificationPermission = 'granted' | 'denied' | 'default';

interface UseNotificationsReturn {
  permission: NotificationPermission;
  isSupported: boolean;
  requestPermission: () => Promise<boolean>;
  sendNotification: (title: string, options?: NotificationOptions) => void;
}

export function useNotifications(): UseNotificationsReturn {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const isSupported = typeof window !== 'undefined' && 'Notification' in window;

  useEffect(() => {
    if (isSupported) {
      setPermission(Notification.permission);
    }
  }, [isSupported]);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      console.warn('Notifications not supported in this browser');
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result === 'granted';
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }, [isSupported]);

  const sendNotification = useCallback((title: string, options?: NotificationOptions) => {
    if (!isSupported) return;
    
    if (permission !== 'granted') {
      console.warn('Notification permission not granted');
      return;
    }

    // Check if document is hidden (user is not on the page)
    if (document.hidden) {
      try {
        const notificationOptions: NotificationOptions = {
          icon: '/favicon.ico',
          badge: '/favicon.ico',
          requireInteraction: true,
          ...options,
        };

        const notification = new Notification(title, notificationOptions);

        notification.onclick = () => {
          window.focus();
          notification.close();
        };

        // Auto-close after 10 seconds
        setTimeout(() => notification.close(), 10000);
      } catch (error) {
        console.error('Error creating notification:', error);
      }
    }
  }, [isSupported, permission]);

  return {
    permission,
    isSupported,
    requestPermission,
    sendNotification,
  };
}
