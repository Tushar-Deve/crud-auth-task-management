import * as SecureStore from 'expo-secure-store';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';

import { useAuth } from '@/context/auth-context';

interface NotificationPreferencesValue {
  taskNotificationsEnabled: boolean;
  preferencesLoaded: boolean;
  setTaskNotificationsEnabled: (enabled: boolean) => void;
}

const NotificationPreferencesContext = createContext<NotificationPreferencesValue | undefined>(undefined);

export function NotificationPreferencesProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const accountKey = String(user?.id ?? 'account');
  const storageKey = `app-settings-${accountKey}`;
  const [taskNotificationsEnabled, setTaskNotificationsEnabled] = useState(true);
  const [loadedAccountKey, setLoadedAccountKey] = useState<string | null>(null);
  const preferencesLoaded = loadedAccountKey === accountKey;

  useEffect(() => {
    let active = true;

    const load = async () => {
      if (Platform.OS === 'web') {
        if (active) setLoadedAccountKey(accountKey);
        return;
      }
      try {
        const stored = await SecureStore.getItemAsync(storageKey);
        const parsed = stored ? JSON.parse(stored) as { taskNotifications?: unknown } : null;
        if (active && typeof parsed?.taskNotifications === 'boolean') {
          setTaskNotificationsEnabled(parsed.taskNotifications);
        } else if (active) {
          setTaskNotificationsEnabled(true);
        }
      } catch {
        if (active) setTaskNotificationsEnabled(true);
      } finally {
        if (active) setLoadedAccountKey(accountKey);
      }
    };

    void load();
    return () => { active = false; };
  }, [accountKey, storageKey]);

  const value = useMemo(() => ({
    taskNotificationsEnabled,
    preferencesLoaded,
    setTaskNotificationsEnabled,
  }), [preferencesLoaded, taskNotificationsEnabled]);

  return <NotificationPreferencesContext.Provider value={value}>{children}</NotificationPreferencesContext.Provider>;
}

export function useNotificationPreferences() {
  const context = useContext(NotificationPreferencesContext);
  if (!context) throw new Error('useNotificationPreferences must be used within NotificationPreferencesProvider.');
  return context;
}
