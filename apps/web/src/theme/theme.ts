import { createTheme, type Theme } from '@mui/material/styles';
import { PALETTES, type ThemeMode } from './palettes';
import { tokens } from './tokens';

const { radius, font } = tokens;

/**
 * MUI needs real colour values (it computes hovers and shadows from them), so the theme is
 * rebuilt when the mode changes. Our own components use the CSS variables in `tokens`.
 */
export function createAppTheme(mode: ThemeMode): Theme {
  const color = PALETTES[mode];

  return createTheme({
    palette: {
      mode,
      primary: { main: color.brand, contrastText: mode === 'dark' ? color.surface : '#FFFFFF' },
      warning: { main: color.warning },
      error: { main: color.danger },
      success: { main: color.brand },
      background: { default: color.canvas, paper: color.surface },
      text: {
        primary: color.textPrimary,
        secondary: color.textSecondary,
        disabled: color.textMuted,
      },
      divider: color.border,
    },
    shape: { borderRadius: radius.md },
    typography: {
      fontFamily: font.family,
      h1: { fontSize: '1.375rem', fontWeight: 600 },
      h2: { fontSize: '1.125rem', fontWeight: 600 },
      h3: { fontSize: '1rem', fontWeight: 500 },
      body2: { fontSize: '0.8125rem' },
      caption: { color: color.textSecondary },
    },
    components: {
      MuiPaper: { styleOverrides: { root: { backgroundImage: 'none' } } },
      MuiButton: { styleOverrides: { root: { textTransform: 'none', fontWeight: 500 } } },
      MuiToggleButton: { styleOverrides: { root: { textTransform: 'none', paddingBlock: 4 } } },
      MuiOutlinedInput: {
        styleOverrides: {
          root: { backgroundColor: color.surfaceRaised, borderRadius: radius.sm },
          notchedOutline: { borderColor: color.border },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          root: { borderBottomColor: color.border },
          head: {
            color: color.textSecondary,
            backgroundColor: color.surfaceRaised,
            fontWeight: 500,
          },
        },
      },
      MuiChip: { styleOverrides: { root: { borderRadius: radius.sm, fontWeight: 500 } } },
    },
  });
}

/** The default theme, also used by component tests. */
export const theme = createAppTheme('dark');
