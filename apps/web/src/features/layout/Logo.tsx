import InsightsIcon from '@mui/icons-material/Insights';
import { Stack, Typography } from '@mui/material';
import { tokens } from '../../theme/tokens';

export function Logo() {
  return (
    <Stack direction="row" alignItems="center" spacing={1}>
      <InsightsIcon sx={{ color: tokens.color.brand }} />
      <Typography sx={{ fontSize: '1.25rem', fontWeight: 600 }}>FinDash</Typography>
    </Stack>
  );
}
