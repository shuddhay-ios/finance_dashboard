import { beforeEach, describe, expect, it } from 'vitest';
import { PALETTES } from './palettes';
import { useThemeMode } from './theme-mode';

describe('theme mode', () => {
  beforeEach(() => {
    useThemeMode.setState({ mode: 'dark' });
    localStorage.clear();
  });

  it('switches between dark and light and remembers the choice', () => {
    useThemeMode.getState().toggle();

    expect(useThemeMode.getState().mode).toBe('light');
    expect(localStorage.getItem('findash.theme')).toBe('light');

    useThemeMode.getState().toggle();
    expect(useThemeMode.getState().mode).toBe('dark');
  });

  it('defines the same colours in both themes, so nothing is missing after a switch', () => {
    expect(Object.keys(PALETTES.light).sort()).toEqual(Object.keys(PALETTES.dark).sort());
  });
});
