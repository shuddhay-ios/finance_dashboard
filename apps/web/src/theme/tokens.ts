import { type AppPalette, cssVariableName } from './palettes';

function colorVariables(): AppPalette {
  const keys: (keyof AppPalette)[] = [
    'canvas',
    'surface',
    'surfaceRaised',
    'border',
    'textPrimary',
    'textSecondary',
    'textMuted',
    'brand',
    'brandSoft',
    'warning',
    'warningSoft',
    'danger',
    'dangerSoft',
  ];
  return Object.fromEntries(
    keys.map((key) => [key, `var(${cssVariableName(key)})`]),
  ) as unknown as AppPalette;
}

/**
 * Design tokens from the Figma. Colours are CSS variables rather than fixed values, so
 * switching between the dark and light themes swaps them everywhere at once, with no
 * component needing to know which theme is active.
 */
export const tokens = {
  color: colorVariables(),
  radius: { sm: 6, md: 10, lg: 14 },
  font: {
    family: '"Poppins", "Segoe UI", system-ui, -apple-system, sans-serif',
  },
  layout: {
    sidebarWidth: 232,
    // Stops the dashboard stretching across very wide monitors.
    contentMaxWidth: 1440,
    // Below this width the table turns into cards and the sidebar hides.
    mobileMaxWidth: 767,
  },
} as const;
