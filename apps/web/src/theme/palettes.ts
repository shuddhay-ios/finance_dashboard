export type ThemeMode = 'dark' | 'light';

export interface AppPalette {
  canvas: string;
  surface: string;
  surfaceRaised: string;
  border: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  /** Green: income, positive numbers, "Paid", primary actions. */
  brand: string;
  brandSoft: string;
  /** Yellow/amber: expenses, "Pending". */
  warning: string;
  warningSoft: string;
  /** Red: a negative net and errors. */
  danger: string;
  dangerSoft: string;
}

/** The Figma's dark theme, and a light theme built to match its contrast. */
export const PALETTES: Record<ThemeMode, AppPalette> = {
  dark: {
    canvas: '#282C35',
    surface: '#1C1F26',
    surfaceRaised: '#2F333D',
    border: '#353945',
    textPrimary: '#FFFFFF',
    textSecondary: '#A3A8B4',
    textMuted: '#6E7482',
    brand: '#1FCB4F',
    brandSoft: 'rgba(31, 203, 79, 0.14)',
    warning: '#FFC01E',
    warningSoft: 'rgba(255, 192, 30, 0.14)',
    danger: '#FF5B5B',
    dangerSoft: 'rgba(255, 91, 91, 0.14)',
  },
  light: {
    canvas: '#F4F6FA',
    surface: '#FFFFFF',
    surfaceRaised: '#EDF1F7',
    border: '#DCE2EC',
    textPrimary: '#161A22',
    textSecondary: '#556072',
    textMuted: '#7B8698',
    // Darker than the dark theme's green and amber, so text stays readable on white.
    brand: '#0F9247',
    brandSoft: 'rgba(15, 146, 71, 0.12)',
    warning: '#B26A00',
    warningSoft: 'rgba(178, 106, 0, 0.12)',
    danger: '#D33A3A',
    dangerSoft: 'rgba(211, 58, 58, 0.12)',
  },
};

/** CSS custom property name for a colour, e.g. brand → --color-brand. */
export function cssVariableName(key: keyof AppPalette): string {
  return `--color-${key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`;
}

/** The `:root` block for one mode, so every component follows the theme automatically. */
export function paletteCss(mode: ThemeMode): Record<string, string> {
  const palette = PALETTES[mode];
  return Object.fromEntries(
    (Object.keys(palette) as (keyof AppPalette)[]).map((key) => [
      cssVariableName(key),
      palette[key],
    ]),
  );
}
