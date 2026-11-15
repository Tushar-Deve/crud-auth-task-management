import { DarkTheme, DefaultTheme, ThemeProvider, Stack, router, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { WebsiteTheme } from '@/constants/theme';
import { AuthProvider, useAuth } from '@/context/auth-context';
import { AppThemeProvider, useAppTheme } from '@/context/app-theme-context';

function AppNavigator() {
  const { user, hasStoredToken, isLoading, sessionExpired, logout } = useAuth();
  const { isDark } = useAppTheme();
  const segments = useSegments();
  const onAuthenticatedRoute = segments[0] === '(authenticated)';
  const onHomeRoute = segments[0] === 'home';
  const onLoginRoute = segments[0] === 'login';
  const hasSupportedRole = user?.role === 'user' || user?.role === 'admin';


  useEffect(() => {
    if (isLoading) return;

    if (hasSupportedRole && !onAuthenticatedRoute) {
      router.replace('/(authenticated)');
    } else if (!hasSupportedRole && (onAuthenticatedRoute || onHomeRoute || (hasStoredToken && !onLoginRoute))) {
      router.replace('/login');
    }
  }, [hasStoredToken, hasSupportedRole, isLoading, onAuthenticatedRoute, onHomeRoute, onLoginRoute]);

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: isDark ? '#0b1220' : '#f9fafb' },
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="home" />
        <Stack.Screen name="(authenticated)" />
      </Stack>
      <Modal visible={sessionExpired} transparent animationType="fade" onRequestClose={() => {}}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Session Expired</Text>
            <Text style={styles.modalMessage}>Your session has expired for security reasons. Please log in again to continue using your account.</Text>
            <Pressable
              accessibilityRole="button"
              onPress={async () => {
                await logout();
                router.replace('/login');
              }}
              style={styles.loginButton}>
              <Text style={styles.loginButtonText}>Log out and log in again</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <AppThemeProvider>
        <NavigationTheme>
        <AppNavigator />
        </NavigationTheme>
      </AppThemeProvider>
    </AuthProvider>
  );
}

function NavigationTheme({ children }: { children: React.ReactNode }) {
  const { isDark } = useAppTheme();
  const theme = isDark ? DarkTheme : DefaultTheme;
  return (
    <ThemeProvider value={{ ...theme, colors: { ...theme.colors, background: isDark ? '#0b1220' : '#f9fafb' } }}>
      {children}
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: 'rgba(0, 0, 0, 0.6)' },
  modalCard: { width: '100%', maxWidth: 420, alignSelf: 'center', padding: 24, borderRadius: 20, backgroundColor: '#ffffff' },
  modalTitle: { color: '#111827', fontSize: 23, fontWeight: '700', textAlign: 'center' },
  modalMessage: { marginTop: 12, color: '#6b7280', fontSize: 14, lineHeight: 21, textAlign: 'center' },
  loginButton: { marginTop: 22, paddingHorizontal: 18, paddingVertical: 14, alignItems: 'center', borderRadius: 12, backgroundColor: WebsiteTheme.primary },
  loginButtonText: { color: '#ffffff', fontSize: 14, fontWeight: '700' },
});
