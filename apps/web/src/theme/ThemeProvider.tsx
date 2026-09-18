import { CssBaseline, GlobalStyles, ThemeProvider as MuiThemeProvider } from '@mui/material';
import { type ReactNode, useMemo } from 'react';
import { paletteCss } from './palettes';
import { createAppTheme, theme as darkTheme } from './theme';
import { useThemeMode } from './theme-mode';

/**
 * Applies the active theme: MUI gets a rebuilt theme, and the colour CSS variables are
 * written onto `:root` so every component using `tokens.color.*` follows along.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const mode = useThemeMode((state) => state.mode);
  const theme = useMemo(() => (mode === 'dark' ? darkTheme : createAppTheme(mode)), [mode]);

  return (
    <MuiThemeProvider theme={theme}>
      <CssBaseline />
      <GlobalStyles styles={{ ':root': paletteCss(mode) }} />
      {children}
    </MuiThemeProvider>
  );
}
