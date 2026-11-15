import { router } from 'expo-router';
import { ImageBackground, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { WebsiteTheme } from '@/constants/theme';

const backgroundImage = {
  uri: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1920&q=80',
};

export default function WelcomeScreen() {
  return (
    <ImageBackground source={backgroundImage} resizeMode="cover" style={styles.background}>
      <View pointerEvents="none" style={styles.overlay} />
      <View pointerEvents="none" style={styles.tealTint} />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.card}>
          <View style={styles.eyebrow}>
            <View style={styles.eyebrowDot} />
            <Text style={styles.eyebrowText}>TASK MANAGEMENT PLATFORM</Text>
          </View>

          <View style={styles.brandMark}>
            <Text style={styles.brandMarkText}>TM</Text>
          </View>

          <Text style={styles.title}>Task Management Portal</Text>
          <Text style={styles.tagline}>Manage your tasks a better way</Text>

          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/login')}
            style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}>
            <Text style={styles.buttonText}>Get Started</Text>
            <Text style={styles.buttonArrow}>→</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1, backgroundColor: WebsiteTheme.background },
  overlay: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(2, 6, 23, 0.82)' },
  tealTint: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(4, 78, 74, 0.42)' },
  safeArea: { flex: 1, justifyContent: 'center', paddingHorizontal: 20, paddingVertical: 24 },
  card: {
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 36,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: WebsiteTheme.cardBorder,
    backgroundColor: WebsiteTheme.card,
    shadowColor: '#042f2e',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 10,
  },
  eyebrow: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 30,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(94, 234, 212, 0.3)',
    borderRadius: 999,
    backgroundColor: 'rgba(15, 118, 110, 0.15)',
  },
  eyebrowDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: WebsiteTheme.accent },
  eyebrowText: { color: '#ccfbf1', fontSize: 11, fontWeight: '600', letterSpacing: 0.7 },
  brandMark: {
    width: 58,
    height: 58,
    marginBottom: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: WebsiteTheme.primary,
    shadowColor: WebsiteTheme.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  brandMarkText: { color: WebsiteTheme.buttonText, fontSize: 20, fontWeight: '700', letterSpacing: 0.5 },
  title: {
    color: WebsiteTheme.text,
    fontSize: 32,
    fontWeight: '700',
    lineHeight: 40,
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  tagline: { marginTop: 12, color: WebsiteTheme.supportingText, fontSize: 16, lineHeight: 24, textAlign: 'center' },
  button: {
    width: '100%',
    minHeight: 54,
    marginTop: 34,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderRadius: 12,
    backgroundColor: WebsiteTheme.primary,
    shadowColor: '#134e4a',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  buttonPressed: { backgroundColor: WebsiteTheme.primaryPressed, opacity: 0.92 },
  buttonText: { color: WebsiteTheme.buttonText, fontSize: 16, fontWeight: '600' },
  buttonArrow: { color: WebsiteTheme.buttonText, fontSize: 19, fontWeight: '500' },
});
