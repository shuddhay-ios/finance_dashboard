import { create } from 'zustand';
import { PALETTES, type ThemeMode } from './palettes';

const STORAGE_KEY = 'findash.theme';

/** The saved choice, otherwise whatever the operating system prefers, otherwise dark. */
function initialMode(): ThemeMode {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'light' || saved === 'dark') {
      return saved;
    }
  } catch {
    // Private browsing can block storage; the default is fine.
  }
  return window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

interface ThemeModeState {
  mode: ThemeMode;
  toggle: () => void;
}

export const useThemeMode = create<ThemeModeState>((set, get) => ({
  mode: initialMode(),
  toggle: () => {
    const mode: ThemeMode = get().mode === 'dark' ? 'light' : 'dark';
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      // Remembering the choice is a convenience, not a requirement.
    }
    set({ mode });
  },
}));

/** The real colour values of the active theme, for places that can't use CSS variables. */
export function useAppPalette() {
  return PALETTES[useThemeMode((state) => state.mode)];
}
