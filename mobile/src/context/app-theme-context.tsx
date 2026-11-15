import * as SecureStore from 'expo-secure-store';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Platform, StyleSheet, useColorScheme } from 'react-native';

import { useAuth } from '@/context/auth-context';

export type ThemePreference = 'light' | 'dark' | 'system';

interface AppThemeValue {
  preference: ThemePreference;
  isDark: boolean;
  setPreference: (preference: ThemePreference) => void;
}

const AppThemeContext = createContext<AppThemeValue | undefined>(undefined);

export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const deviceScheme = useColorScheme();
  const settingsKey = `app-settings-${String(user?.id ?? 'account')}`;
  const [storedPreference, setStoredPreference] = useState<{ settingsKey: string; preference: ThemePreference }>(() => ({
    settingsKey,
    preference: 'system',
  }));
  const preference = storedPreference.settingsKey === settingsKey ? storedPreference.preference : 'system';
  const isDark = preference === 'dark' || (preference === 'system' && deviceScheme === 'dark');

  useEffect(() => {
    let active = true;

    const restore = async () => {
      if (Platform.OS === 'web') return;
      try {
        const raw = await SecureStore.getItemAsync(settingsKey);
        if (!raw) return;
        const stored = JSON.parse(raw) as { theme?: unknown };
        if (stored.theme === 'light' || stored.theme === 'dark' || stored.theme === 'system') {
          if (active) setStoredPreference({ settingsKey, preference: stored.theme });
        }
      } catch {
        // Keep the system appearance if local settings are unavailable.
      }
    };

    void restore();
    return () => { active = false; };
  }, [settingsKey]);

  const setPreference = useCallback((next: ThemePreference) => setStoredPreference({ settingsKey, preference: next }), [settingsKey]);
  const value = useMemo(() => ({ preference, isDark, setPreference }), [isDark, preference, setPreference]);

  return <AppThemeContext.Provider value={value}>{children}</AppThemeContext.Provider>;
}

export function useAppTheme() {
  const value = useContext(AppThemeContext);
  if (!value) throw new Error('useAppTheme must be used within AppThemeProvider.');
  return value;
}

const darkBackgroundMap: Record<string, string> = {
  '#ffffff': '#111a2a',
  '#f9fafb': '#0b1220',
  '#f3f4f6': '#1a2638',
  '#f0fdfa': '#163b38',
  '#eff6ff': '#15263d',
  '#e5e7eb': '#2b394d',
  '#dbeafe': '#293d58',
  '#d1d5db': '#3b4b63',
  '#fff7ed': '#35291a',
  '#fef2f2': '#39212a',
  '#fff7f7': '#39212a',
  '#dcfce7': '#12352e',
  '#fee2e2': '#5a2c38',
  '#ecfdf5': '#12352e',
};

const darkTextMap: Record<string, string> = {
  '#111827': '#f1f5f9',
  '#1f2937': '#e2e8f0',
  '#374151': '#d3ddeb',
  '#6b7280': '#a4b2c5',
  '#4b5563': '#c3cede',
  '#9ca3af': '#94a3b8',
  '#475569': '#b7c4d8',
  '#ccfbf1': '#99f6e4',
  '#047857': '#6ee7b7',
  '#059669': '#34d399',
  '#16a34a': '#4ade80',
  '#15803d': '#86efac',
  '#b91c1c': '#fca5a5',
  '#c2410c': '#fdba74',
  '#d97706': '#fbbf24',
  '#dc2626': '#f87171',
  '#2563eb': '#60a5fa',
};

const darkBorderMap: Record<string, string> = {
  '#e5e7eb': '#2b3a50',
  '#dbeafe': '#30445f',
  '#d1d5db': '#3b4b63',
  '#fee2e2': '#5a2c38',
  '#ffffff': '#2b394d',
};

function transformStyle(style: Record<string, unknown>, isDark: boolean) {
  if (!isDark) return style;
  const transformed = { ...style };
  const text = transformed.color;
  if (typeof text === 'string') transformed.color = darkTextMap[text.toLowerCase()] ?? text;
  const background = transformed.backgroundColor;
  if (typeof background === 'string') transformed.backgroundColor = darkBackgroundMap[background.toLowerCase()] ?? background;
  const border = transformed.borderColor;
  if (typeof border === 'string') transformed.borderColor = darkBorderMap[border.toLowerCase()] ?? border;
  const decoration = transformed.textDecorationColor;
  if (typeof decoration === 'string') transformed.textDecorationColor = darkTextMap[decoration.toLowerCase()] ?? decoration;
  return transformed;
}

export function useThemeStyles<T extends Record<string, unknown>>(baseStyles: T): T {
  const { isDark } = useAppTheme();
  return useMemo(() => {
    const themed: Record<string, unknown> = {};
    for (const [key, style] of Object.entries(baseStyles)) {
      const flattened = StyleSheet.flatten(style as never) as Record<string, unknown>;
      themed[key] = flattened ? transformStyle(flattened, isDark) : style;
    }
    return themed as T;
  }, [baseStyles, isDark]);
}
