import SearchOffIcon from '@mui/icons-material/SearchOff';
import { Button, Stack, Typography } from '@mui/material';
import { tokens } from '../theme/tokens';

interface EmptyStateProps {
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
}

/** Shown instead of a blank box when there is nothing to display, with a way out. */
export function EmptyState({ title, message, actionLabel, onAction }: EmptyStateProps) {
  return (
    <Stack
      alignItems="center"
      justifyContent="center"
      spacing={1}
      sx={{ py: 6, px: 2, textAlign: 'center' }}
    >
      <SearchOffIcon sx={{ fontSize: 40, color: tokens.color.textMuted }} />
      <Typography variant="h3">{title}</Typography>
      {message && (
        <Typography variant="body2" color="text.secondary">
          {message}
        </Typography>
      )}
      {actionLabel && onAction && (
        <Button variant="outlined" size="small" onClick={onAction} sx={{ mt: 1 }}>
          {actionLabel}
        </Button>
      )}
    </Stack>
  );
}
