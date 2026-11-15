import { useEffect, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

import { useThemeStyles } from '@/context/app-theme-context';

export function DashboardWelcome({ name, subtitle }: { name?: string | null; subtitle: string }) {
  const styles = useThemeStyles(baseStyles);
  const [entrance] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const animation = Animated.timing(entrance, { toValue: 1, duration: 420, useNativeDriver: true });
    animation.start();
    return () => animation.stop();
  }, [entrance]);

  const displayName = name?.trim() || 'there';

  return (
    <Animated.View
      style={[
        styles.card,
        { opacity: entrance, transform: [{ translateY: entrance.interpolate({ inputRange: [0, 1], outputRange: [9, 0] }) }] },
      ]}>
      <View pointerEvents="none" style={styles.glow} />
      <View pointerEvents="none" style={styles.orbit} />
      <Text style={styles.title}>Dashboard</Text>
      <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.78} style={styles.greeting}>
        <Text style={styles.greetingLead}>Welcome, </Text><Text style={styles.name}>{displayName}</Text>
      </Text>
      <Text numberOfLines={1} style={styles.subtitle}>{subtitle}</Text>
    </Animated.View>
  );
}

const baseStyles = StyleSheet.create({
  card: {
    position: 'relative',
    overflow: 'hidden',
    paddingHorizontal: 19,
    paddingVertical: 17,
    gap: 5,
    borderWidth: 1,
    borderColor: '#0f766e',
    borderRadius: 22,
    backgroundColor: '#134e4a',
  },
  glow: { position: 'absolute', top: -63, right: -30, width: 170, height: 170, borderRadius: 85, backgroundColor: 'rgba(45, 212, 191, 0.22)' },
  orbit: { position: 'absolute', top: -33, right: 13, width: 110, height: 110, borderRadius: 55, borderWidth: 1, borderColor: 'rgba(153, 246, 228, 0.18)' },
  title: { color: '#99f6e4', fontSize: 14, lineHeight: 19, fontWeight: '700', letterSpacing: 0.5 },
  greeting: { color: '#ffffff', fontSize: 22, lineHeight: 28, fontWeight: '600', letterSpacing: -0.35 },
  greetingLead: { color: '#ccfbf1', fontSize: 17, fontWeight: '500' },
  name: { color: '#ffffff', fontSize: 23, fontWeight: '800' },
  subtitle: { color: '#99f6e4', fontSize: 12, lineHeight: 17 },
});
