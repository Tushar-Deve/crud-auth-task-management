import { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { WebsiteTheme } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';

export default function HomeScreen() {
  const { user, logout, isLoading } = useAuth();
  const [error, setError] = useState('');

  const handleLogout = async () => {
    setError('');
    try {
      await logout();
    } catch {
      setError('Could not clear the saved session. Please try again.');
    }
  };

  if (isLoading || !user) {
    return (
      <SafeAreaView style={styles.loadingScreen}>
        <StatusBar style="dark" />
        <ActivityIndicator color={WebsiteTheme.primary} />
        <Text style={styles.loadingText}>Checking your session…</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <View style={styles.brandMark}>
            <Text style={styles.brandMarkText}>TM</Text>
          </View>
          <Text style={styles.heading}>You’re signed in</Text>
          <Text style={styles.subtitle}>Your account details</Text>

          <View style={styles.details}>
            {user?.name ? <Detail label="Name" value={user.name} /> : null}
            {user?.email ? <Detail label="Email" value={user.email} /> : null}
            {user?.role ? <Detail label="Role" value={user.role} /> : null}
            {user?.id !== undefined ? <Detail label="Account ID" value={String(user.id)} /> : null}
          </View>

          {error ? <Text accessibilityLiveRegion="polite" style={styles.error}>{error}</Text> : null}

          <Pressable
            accessibilityRole="button"
            disabled={isLoading}
            onPress={handleLogout}
            style={({ pressed }) => [styles.button, pressed && !isLoading && styles.buttonPressed, isLoading && styles.buttonDisabled]}>
            <Text style={styles.buttonText}>{isLoading ? 'Signing out…' : 'Log out'}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detail}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f5f7fb' },
  scrollContent: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, paddingVertical: 24 },
  loadingScreen: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: '#f5f7fb' },
  loadingText: { color: '#6b7280', fontSize: 14 },
  card: { width: '100%', maxWidth: 480, alignSelf: 'center', paddingHorizontal: 20, paddingVertical: 28, borderRadius: 20, borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#ffffff', elevation: 3 },
  brandMark: { width: 52, height: 52, alignSelf: 'center', alignItems: 'center', justifyContent: 'center', marginBottom: 18, borderRadius: 16, backgroundColor: WebsiteTheme.primary },
  brandMarkText: { color: WebsiteTheme.buttonText, fontSize: 18, fontWeight: '700', letterSpacing: 0.5 },
  heading: { color: '#111827', fontSize: 26, lineHeight: 34, fontWeight: '700', textAlign: 'center' },
  subtitle: { marginTop: 6, color: '#6b7280', fontSize: 15, lineHeight: 23, textAlign: 'center' },
  details: { gap: 14, marginTop: 28 },
  detail: { padding: 14, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, backgroundColor: '#f9fafb' },
  detailLabel: { color: '#6b7280', fontSize: 13, fontWeight: '600' },
  detailValue: { marginTop: 4, color: '#111827', fontSize: 16 },
  error: { marginTop: 14, color: '#dc2626', fontSize: 13, textAlign: 'center' },
  button: { minHeight: 52, alignItems: 'center', justifyContent: 'center', marginTop: 24, borderRadius: 12, backgroundColor: WebsiteTheme.primary },
  buttonPressed: { backgroundColor: WebsiteTheme.primaryPressed },
  buttonDisabled: { opacity: 0.65 },
  buttonText: { color: WebsiteTheme.buttonText, fontSize: 16, fontWeight: '600' },
});
