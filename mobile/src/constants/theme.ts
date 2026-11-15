/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#000000',
    background: '#ffffff',
    backgroundElement: '#F0F0F3',
    backgroundSelected: '#E0E1E6',
    textSecondary: '#60646C',
  },
  dark: {
    text: '#ffffff',
    background: '#000000',
    backgroundElement: '#212225',
    backgroundSelected: '#2E3135',
    textSecondary: '#B0B4BA',
  },
} as const;

// Values sampled from the website's welcome and login page Tailwind styles.
export const WebsiteTheme = {
  background: '#0b1220', // deep navy, under the image and dark overlay
  overlay: 'rgba(2, 6, 23, 0.82)', // slate-950 with transparency
  teal: '#134e4a', // deep teal surface
  blue: '#0f3d38', // deep teal surface
  primary: '#0f766e', // teal-700
  primaryPressed: '#115e59', // teal-800
  blueButton: '#0f766e', // teal-700
  accent: '#5eead4', // teal-300
  text: '#ffffff',
  supportingText: '#cbd5e1', // slate-300
  mutedText: '#94a3b8', // slate-400
  label: '#e2e8f0', // slate-200
  card: 'rgba(255, 255, 255, 0.10)',
  cardBorder: 'rgba(255, 255, 255, 0.20)',
  input: 'rgba(255, 255, 255, 0.05)',
  inputFocused: 'rgba(255, 255, 255, 0.10)',
  inputBorder: 'rgba(255, 255, 255, 0.15)',
  error: '#fecaca',
  buttonText: '#ffffff',
  fontFamily: 'Geist, system-ui, sans-serif',
  radius: 12,
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
