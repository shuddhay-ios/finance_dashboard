import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined';
import LightModeOutlinedIcon from '@mui/icons-material/LightModeOutlined';
import { IconButton, Tooltip } from '@mui/material';
import { useThemeMode } from './theme-mode';

/** Switches between the dark and light themes; the choice is remembered in this browser. */
export function ThemeModeToggle() {
  const mode = useThemeMode((state) => state.mode);
  const toggle = useThemeMode((state) => state.toggle);
  const label = mode === 'dark' ? 'Switch to light theme' : 'Switch to dark theme';

  return (
    <Tooltip title={label}>
      <IconButton onClick={toggle} aria-label={label} sx={{ color: 'text.secondary' }}>
        {mode === 'dark' ? (
          <LightModeOutlinedIcon fontSize="small" />
        ) : (
          <DarkModeOutlinedIcon fontSize="small" />
        )}
      </IconButton>
    </Tooltip>
  );
}
