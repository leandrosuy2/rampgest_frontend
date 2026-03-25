import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export type AlertType = 'missing' | 'attention' | 'overdue' | 'preparing' | 'replenished';

export interface AlertPreferences {
  sound: {
    missing: boolean;
    attention: boolean;
    overdue: boolean;
    preparing: boolean;
    replenished: boolean;
  };
  notification: {
    missing: boolean;
    attention: boolean;
    overdue: boolean;
    preparing: boolean;
    replenished: boolean;
  };
}

const defaultPreferences: AlertPreferences = {
  sound: {
    missing: true,
    attention: true,
    overdue: true,
    preparing: false,
    replenished: true,
  },
  notification: {
    missing: true,
    attention: true,
    overdue: true,
    preparing: false,
    replenished: false,
  },
};

const LOCAL_STORAGE_KEY = 'alert-preferences';

export function useAlertPreferences() {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<AlertPreferences>(defaultPreferences);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load preferences - from DB if logged in, localStorage as fallback
  useEffect(() => {
    const loadPreferences = async () => {
      // First, load from localStorage for immediate display
      try {
        const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          setPreferences({
            sound: { ...defaultPreferences.sound, ...parsed.sound },
            notification: { ...defaultPreferences.notification, ...parsed.notification },
          });
        }
      } catch (error) {
        console.error('Error loading local preferences:', error);
      }

      // Then, if logged in, fetch from database
      if (user?.id) {
        try {
          const { data, error } = await supabase
            .from('user_preferences')
            .select('alert_preferences')
            .eq('user_id', user.id)
            .maybeSingle();

          if (error) {
            console.error('Error fetching preferences from DB:', error);
          } else if (data?.alert_preferences) {
            const dbPrefs = data.alert_preferences as unknown as AlertPreferences;
            const mergedPrefs = {
              sound: { ...defaultPreferences.sound, ...dbPrefs.sound },
              notification: { ...defaultPreferences.notification, ...dbPrefs.notification },
            };
            setPreferences(mergedPrefs);
            // Also update localStorage for offline access
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(mergedPrefs));
          }
        } catch (error) {
          console.error('Error loading DB preferences:', error);
        }
      }

      setIsLoaded(true);
    };

    loadPreferences();
  }, [user?.id]);

  // Subscribe to realtime changes for cross-device sync
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`preferences-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'user_preferences',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newPrefs = payload.new.alert_preferences as AlertPreferences;
          if (newPrefs) {
            const mergedPrefs = {
              sound: { ...defaultPreferences.sound, ...newPrefs.sound },
              notification: { ...defaultPreferences.notification, ...newPrefs.notification },
            };
            setPreferences(mergedPrefs);
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(mergedPrefs));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  // Save preferences with debouncing
  const savePreferences = useCallback(async (newPreferences: AlertPreferences) => {
    setPreferences(newPreferences);
    
    // Always save to localStorage immediately
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newPreferences));
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }

    // Debounce database saves
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    if (user?.id) {
      saveTimeoutRef.current = setTimeout(async () => {
        setIsSyncing(true);
        try {
          // Check if record exists
          const { data: existing } = await supabase
            .from('user_preferences')
            .select('id')
            .eq('user_id', user.id)
            .maybeSingle();

          if (existing) {
            // Update existing
            const { error: updateError } = await supabase
              .from('user_preferences')
              .update({ alert_preferences: JSON.parse(JSON.stringify(newPreferences)) })
              .eq('user_id', user.id);

            if (updateError) console.error('Error updating preferences:', updateError);
          } else {
            // Insert new
            const { error: insertError } = await supabase
              .from('user_preferences')
              .insert([{
                user_id: user.id,
                alert_preferences: JSON.parse(JSON.stringify(newPreferences)),
              }]);

            if (insertError) console.error('Error inserting preferences:', insertError);
          }
        } catch (err) {
          console.error('Error syncing preferences:', err);
        } finally {
          setIsSyncing(false);
        }
      }, 500); // 500ms debounce
    }
  }, [user?.id]);

  const toggleSound = useCallback((type: AlertType) => {
    savePreferences({
      ...preferences,
      sound: {
        ...preferences.sound,
        [type]: !preferences.sound[type],
      },
    });
  }, [preferences, savePreferences]);

  const toggleNotification = useCallback((type: AlertType) => {
    savePreferences({
      ...preferences,
      notification: {
        ...preferences.notification,
        [type]: !preferences.notification[type],
      },
    });
  }, [preferences, savePreferences]);

  const setSoundEnabled = useCallback((type: AlertType, enabled: boolean) => {
    savePreferences({
      ...preferences,
      sound: {
        ...preferences.sound,
        [type]: enabled,
      },
    });
  }, [preferences, savePreferences]);

  const setNotificationEnabled = useCallback((type: AlertType, enabled: boolean) => {
    savePreferences({
      ...preferences,
      notification: {
        ...preferences.notification,
        [type]: enabled,
      },
    });
  }, [preferences, savePreferences]);

  const resetToDefaults = useCallback(() => {
    savePreferences(defaultPreferences);
  }, [savePreferences]);

  const shouldPlaySound = useCallback((type: AlertType): boolean => {
    return preferences.sound[type] ?? true;
  }, [preferences]);

  const shouldSendNotification = useCallback((type: AlertType): boolean => {
    return preferences.notification[type] ?? true;
  }, [preferences]);

  return {
    preferences,
    isLoaded,
    isSyncing,
    toggleSound,
    toggleNotification,
    setSoundEnabled,
    setNotificationEnabled,
    resetToDefaults,
    shouldPlaySound,
    shouldSendNotification,
  };
}
