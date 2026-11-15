import { MaterialSymbols_400Regular } from '@expo-google-fonts/material-symbols/400Regular';
import { useFonts } from 'expo-font';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { Platform, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

const androidGlyphs: Record<string, number> = {
  arrow_back: 58820,
  attach_file: 57894,
  check: 58826,
  check_circle: 59500,
  checklist: 59057,
  chevron_right: 58828,
  circle: 61258,
  groups: 62003,
  home: 59530,
  link: 57687,
  notifications: 59380,
  person: 59389,
  schedule: 59573,
  settings: 59576,
};

const fallbackGlyphs: Record<string, string> = {
  arrow_back: '←',
  attach_file: '⌁',
  check: '✓',
  check_circle: '✓',
  checklist: '☷',
  chevron_right: '›',
  circle: '●',
  groups: '♟',
  home: '⌂',
  link: '↗',
  notifications: '♧',
  person: '♙',
  schedule: '◷',
  settings: '⚙',
};

type AppIconProps = {
  name: NonNullable<SymbolViewProps['name']>;
  size?: number;
  tintColor?: string;
  weight?: SymbolViewProps['weight'];
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
};

/** Uses Material Symbols on Android with a text glyph fallback if font loading fails. */
export function AppIcon({ name, size = 24, tintColor, weight, style, accessibilityLabel }: AppIconProps) {
  const [fontLoaded, fontError] = useFonts({ MaterialSymbols_400Regular });
  const androidName = typeof name === 'string' ? name : name.android ?? name.web ?? '';

  if (Platform.OS !== 'android') {
    return <SymbolView name={name} size={size} tintColor={tintColor} weight={weight} style={style} accessibilityLabel={accessibilityLabel} />;
  }

  const codePoint = androidGlyphs[androidName];
  const iconText = fontLoaded && !fontError && codePoint
    ? String.fromCharCode(codePoint)
    : fallbackGlyphs[androidName] ?? '•';

  return (
    <View accessible={Boolean(accessibilityLabel)} accessibilityLabel={accessibilityLabel} style={[styles.container, { width: size, height: size }, style]}>
      <Text allowFontScaling={false} style={{ color: tintColor, fontSize: size, lineHeight: size, fontFamily: fontLoaded && !fontError && codePoint ? 'MaterialSymbols_400Regular' : undefined }}>
        {iconText}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center', overflow: 'visible' },
});
