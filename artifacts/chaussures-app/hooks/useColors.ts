import { useColorScheme } from 'react-native';
import colors from '@/constants/colors';

type Palette = typeof colors.light;

/**
 * Returns the design tokens for the current color scheme.
 * Both light and dark keys point to the same dark palette, so this
 * always returns the dark theme regardless of system setting.
 */
export function useColors(): Palette & { radius: number } {
  const scheme = useColorScheme();
  const palette: Palette =
    scheme === 'dark' && 'dark' in colors
      ? (colors.dark as Palette)
      : colors.light;
  return { ...palette, radius: colors.radius };
}
