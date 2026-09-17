import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import CloseIcon from '@mui/icons-material/Close';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { Box, Button, IconButton, Paper, Stack, Typography } from '@mui/material';
import { tokens } from '../../theme/tokens';
import { type AlertChip, type ChipSeverity, useAlertChips } from './alert-chip-store';

const SEVERITY_STYLE: Record<
  ChipSeverity,
  { color: string; background: string; icon: JSX.Element }
> = {
  error: {
    color: tokens.color.danger,
    background: tokens.color.dangerSoft,
    icon: <ErrorOutlineIcon fontSize="small" />,
  },
  success: {
    color: tokens.color.brand,
    background: tokens.color.brandSoft,
    icon: <CheckCircleOutlineIcon fontSize="small" />,
  },
  info: {
    color: tokens.color.textSecondary,
    background: tokens.color.surfaceRaised,
    icon: <InfoOutlinedIcon fontSize="small" />,
  },
};

/** Renders the alert chips in the bottom-right corner, newest at the bottom. */
export function AlertChipStack() {
  const chips = useAlertChips((state) => state.chips);
  const dismiss = useAlertChips((state) => state.dismiss);

  return (
    <Stack
      spacing={1}
      sx={{
        position: 'fixed',
        right: 16,
        bottom: 16,
        left: { xs: 16, sm: 'auto' },
        zIndex: (theme) => theme.zIndex.snackbar,
        maxWidth: { sm: 420 },
      }}
    >
      {chips.map((chip) => (
        <AlertChipItem key={chip.id} chip={chip} onDismiss={() => dismiss(chip.id)} />
      ))}
    </Stack>
  );
}

function AlertChipItem({ chip, onDismiss }: { chip: AlertChip; onDismiss: () => void }) {
  const style = SEVERITY_STYLE[chip.severity];

  return (
    <Paper
      // role="alert" makes screen readers announce the message as soon as it appears.
      role={chip.severity === 'error' ? 'alert' : 'status'}
      elevation={6}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        pl: 1.5,
        pr: 0.5,
        py: 0.75,
        border: `1px solid ${style.color}`,
        backgroundColor: tokens.color.surface,
        backgroundImage: `linear-gradient(${style.background}, ${style.background})`,
      }}
    >
      <Box sx={{ color: style.color, display: 'flex' }}>{style.icon}</Box>
      <Typography variant="body2" sx={{ flex: 1 }}>
        {chip.message}
      </Typography>
      {chip.action && (
        <Button
          size="small"
          sx={{ color: style.color }}
          onClick={() => {
            chip.action?.onClick();
            onDismiss();
          }}
        >
          {chip.action.label}
        </Button>
      )}
      <IconButton size="small" aria-label="Dismiss" onClick={onDismiss}>
        <CloseIcon fontSize="small" />
      </IconButton>
    </Paper>
  );
}
