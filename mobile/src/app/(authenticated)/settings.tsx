import * as SecureStore from 'expo-secure-store';
import { useCallback, useEffect, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import { WebsiteTheme } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useAppTheme, useThemeStyles } from '@/context/app-theme-context';
import { useNotificationPreferences } from '@/context/notification-preferences-context';

type ThemePreference = 'light' | 'dark' | 'system';
type SettingsPreferences = {
  theme: ThemePreference;
  taskNotifications: boolean;
  emailNotifications: boolean;
};

const defaultPreferences: SettingsPreferences = {
  theme: 'system',
  taskNotifications: true,
  emailNotifications: true,
};

const themeOptions: { label: string; value: ThemePreference }[] = [
  { label: 'Light', value: 'light' },
  { label: 'Dark', value: 'dark' },
  { label: 'System', value: 'system' },
];

export default function SettingsScreen() {
  const { user } = useAuth();
  const { setPreference } = useAppTheme();
  const { setTaskNotificationsEnabled } = useNotificationPreferences();
  const styles = useThemeStyles(baseStyles);
  const [preferences, setPreferences] = useState(defaultPreferences);
  const [loaded, setLoaded] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const storageKey = `app-settings-${String(user?.id ?? 'account')}`;

  const persist = useCallback(async (next: SettingsPreferences) => {
    setPreferences(next);
    setSaveMessage('');
    if (Platform.OS === 'web') {
      setSaveMessage('Preference updated for this session.');
      return;
    }
    try {
      await SecureStore.setItemAsync(storageKey, JSON.stringify(next));
      setSaveMessage('Preferences saved on this device.');
    } catch {
      setSaveMessage('Could not save preferences on this device.');
    }
  }, [storageKey]);

  useEffect(() => {
    let active = true;
    const loadPreferences = async () => {
      if (Platform.OS !== 'web') {
        try {
          const stored = await SecureStore.getItemAsync(storageKey);
          if (stored) {
            const parsed = JSON.parse(stored) as Partial<SettingsPreferences>;
            const restored: SettingsPreferences = {
              theme: parsed.theme === 'light' || parsed.theme === 'dark' || parsed.theme === 'system' ? parsed.theme : 'system',
              taskNotifications: typeof parsed.taskNotifications === 'boolean' ? parsed.taskNotifications : true,
              emailNotifications: typeof parsed.emailNotifications === 'boolean' ? parsed.emailNotifications : true,
            };
            if (active) setPreferences(restored);
          }
        } catch {
          if (active) setSaveMessage('Saved preferences could not be loaded.');
        }
      }
      if (active) setLoaded(true);
    };
    void loadPreferences();
    return () => { active = false; };
  }, [storageKey]);

  const updatePreference = (key: keyof SettingsPreferences, value: SettingsPreferences[keyof SettingsPreferences]) => {
    const next = { ...preferences, [key]: value } as SettingsPreferences;
    if (key === 'theme') setPreference(value as ThemePreference);
    if (key === 'taskNotifications') setTaskNotificationsEnabled(value as boolean);
    void persist(next);
  };

  const roleLabel = user?.role === 'admin' ? 'Administrator' : user?.role === 'user' ? 'User' : user?.role || 'Role unavailable';

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.pageHeading}>
        <Text style={styles.title}>Settings</Text>
        <Text style={styles.subtitle}>Manage your account preferences.</Text>
      </View>

      <View style={styles.cards}>
        <SectionCard title="Account Settings" subtitle="Personal details" icon="◉">
          <InfoRow label="Name" value={user?.name?.trim() || 'Name unavailable'} />
          <InfoRow label="Email" value={user?.email || 'Email unavailable'} />
          <InfoRow label="Role" value={roleLabel} />
        </SectionCard>

        <SectionCard title="Appearance" subtitle="Choose your preferred theme" icon="◐">
          <View style={styles.themeOptions}>
            {themeOptions.map((option) => {
              const selected = preferences.theme === option.value;
              return (
                <Pressable
                  key={option.value}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected }}
                  onPress={() => updatePreference('theme', option.value)}
                  style={[styles.themeOption, selected && styles.themeOptionSelected]}>
                  <View style={[styles.radio, selected && styles.radioSelected]}>
                    {selected ? <View style={styles.radioDot} /> : null}
                  </View>
                  <Text style={[styles.themeLabel, selected && styles.themeLabelSelected]}>{option.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </SectionCard>

        <SectionCard title="Notifications" subtitle="Delivery preferences" icon="♧">
          <PreferenceSwitch
            label="Task notifications"
            description="Task assignments and status updates"
            value={preferences.taskNotifications}
            onValueChange={(value) => updatePreference('taskNotifications', value)}
          />
          <PreferenceSwitch
            label="Email notifications"
            description="Email updates about your account and tasks"
            value={preferences.emailNotifications}
            onValueChange={(value) => updatePreference('emailNotifications', value)}
          />
          <Text style={styles.helperText}>Task notifications control in-app badges and the notification list on this device. Unread items remain available when you turn notifications back on.</Text>
        </SectionCard>
      </View>
      {loaded && saveMessage ? <Text accessibilityRole="text" style={styles.saveMessage}>{saveMessage}</Text> : null}
    </ScrollView>
  );
}

function SectionCard({ title, subtitle, icon, children }: { title: string; subtitle: string; icon: string; children: React.ReactNode }) {
  const styles = useThemeStyles(baseStyles);
  return (
    <View style={styles.sectionCard}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionIcon}><Text style={styles.sectionIconText}>{icon}</Text></View>
        <View style={styles.sectionHeading}>
          <Text style={styles.sectionTitle}>{title}</Text>
          <Text style={styles.sectionSubtitle}>{subtitle}</Text>
        </View>
      </View>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  const styles = useThemeStyles(baseStyles);
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text selectable style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function PreferenceSwitch({ label, description, value, onValueChange }: { label: string; description: string; value: boolean; onValueChange: (value: boolean) => void }) {
  const { isDark } = useAppTheme();
  const styles = useThemeStyles(baseStyles);
  return (
    <View style={styles.switchRow}>
      <View style={styles.switchCopy}>
        <Text style={styles.switchLabel}>{label}</Text>
        <Text style={styles.switchDescription}>{description}</Text>
      </View>
      <Switch
        accessibilityLabel={label}
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: isDark ? '#3b4b63' : '#d1d5db', true: isDark ? '#115e59' : '#5eead4' }}
        thumbColor={isDark ? (value ? '#99f6e4' : '#cbd5e1') : (value ? WebsiteTheme.primary : '#f9fafb')}
      />
    </View>
  );
}

const baseStyles = StyleSheet.create({
  content: { flexGrow: 1, width: '100%', maxWidth: 1000, alignSelf: 'center', padding: 20, paddingBottom: 28, gap: 17 },
  pageHeading: { marginBottom: 2 },
  title: { color: '#111827', fontSize: 24, lineHeight: 31, fontWeight: '700' },
  subtitle: { marginTop: 4, color: '#6b7280', fontSize: 14, lineHeight: 20 },
  cards: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', gap: 14 },
  sectionCard: { flexGrow: 1, flexBasis: 340, minWidth: 0, overflow: 'hidden', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 17, backgroundColor: '#ffffff' },
  sectionHeader: { minHeight: 70, paddingHorizontal: 16, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#e5e7eb' },
  sectionIcon: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: '#f0fdfa' },
  sectionIconText: { color: WebsiteTheme.primary, fontSize: 21, fontWeight: '700' },
  sectionHeading: { flex: 1, minWidth: 0 },
  sectionTitle: { color: '#111827', fontSize: 16, fontWeight: '700' },
  sectionSubtitle: { marginTop: 3, color: '#6b7280', fontSize: 12, lineHeight: 17 },
  sectionBody: { padding: 15, gap: 10 },
  infoRow: { padding: 13, gap: 6, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, backgroundColor: '#f9fafb' },
  infoLabel: { color: '#6b7280', fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 },
  infoValue: { color: '#111827', fontSize: 14, lineHeight: 20, fontWeight: '600' },
  themeOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  themeOption: { flexGrow: 1, flexBasis: 90, minHeight: 44, paddingHorizontal: 11, flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 11, backgroundColor: '#f9fafb' },
  themeOptionSelected: { borderColor: WebsiteTheme.primary, backgroundColor: '#f0fdfa' },
  radio: { width: 18, height: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#9ca3af', borderRadius: 9 },
  radioSelected: { borderColor: WebsiteTheme.primary },
  radioDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: WebsiteTheme.primary },
  themeLabel: { color: '#4b5563', fontSize: 12, fontWeight: '600' },
  themeLabelSelected: { color: WebsiteTheme.primary },
  switchRow: { minHeight: 60, paddingHorizontal: 12, paddingVertical: 9, flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, backgroundColor: '#f9fafb' },
  switchCopy: { flex: 1, minWidth: 0, gap: 3 },
  switchLabel: { color: '#111827', fontSize: 13, fontWeight: '600' },
  switchDescription: { color: '#6b7280', fontSize: 11, lineHeight: 15 },
  helperText: { color: '#9ca3af', fontSize: 11, lineHeight: 16 },
  saveMessage: { color: '#6b7280', fontSize: 12, lineHeight: 17 },
});
