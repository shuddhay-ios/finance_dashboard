import type { BreakdownDimension, BreakdownResponse } from '@finance/shared';
import {
  Box,
  FormControl,
  MenuItem,
  Paper,
  Select,
  Skeleton,
  Stack,
  Typography,
} from '@mui/material';
import { EmptyState } from '../../components/EmptyState';
import { formatMoney } from '../../lib/format';
import { tokens } from '../../theme/tokens';

// The data has only two categories, so a fixed category chart would be two equal halves.
// Switching the dimension is what makes this panel useful.
const DIMENSION_LABELS: Record<BreakdownDimension, string> = {
  category: 'By category',
  status: 'By status',
  user: 'By user',
  month: 'By month',
};

interface BreakdownChartProps {
  breakdown: BreakdownResponse | undefined;
  isLoading: boolean;
  dimension: BreakdownDimension;
  onDimensionChange: (dimension: BreakdownDimension) => void;
}

export function BreakdownChart({
  breakdown,
  isLoading,
  dimension,
  onDimensionChange,
}: BreakdownChartProps) {
  return (
    <Paper sx={{ p: 2.5, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h2">Breakdown</Typography>
        <FormControl size="small">
          <Select
            value={dimension}
            onChange={(event) => onDimensionChange(event.target.value as BreakdownDimension)}
            inputProps={{ 'aria-label': 'Breakdown dimension' }}
          >
            {(Object.keys(DIMENSION_LABELS) as BreakdownDimension[]).map((option) => (
              <MenuItem key={option} value={option}>
                {DIMENSION_LABELS[option]}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Stack>

      {/* Fixed height with scrolling, so twelve months don't stretch the row. */}
      <Box sx={{ flex: 1, minHeight: 280, maxHeight: 280, overflowY: 'auto', pr: 0.5 }}>
        {isLoading ? (
          <Stack spacing={2}>
            {Array.from({ length: 4 }, (_, index) => (
              <Skeleton key={index} variant="rounded" height={44} />
            ))}
          </Stack>
        ) : !breakdown || breakdown.data.length === 0 ? (
          <EmptyState title="Nothing to break down" />
        ) : (
          <Stack component="ul" spacing={2} sx={{ listStyle: 'none', m: 0, p: 0 }}>
            {breakdown.data.map((row) => (
              <Box component="li" key={row.key}>
                <Stack direction="row" justifyContent="space-between" alignItems="baseline">
                  <Typography variant="body2" sx={{ fontWeight: 500 }} noWrap>
                    {row.label}
                  </Typography>
                  <Typography variant="body2" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                    {formatMoney(row.revenue + row.expense)}{' '}
                    <Typography component="span" variant="caption">
                      · {row.percentage.toFixed(1)}%
                    </Typography>
                  </Typography>
                </Stack>
                <Box
                  role="presentation"
                  sx={{ mt: 0.75, height: 8, borderRadius: 4, bgcolor: tokens.color.surfaceRaised }}
                >
                  <Box
                    sx={{
                      width: `${row.percentage}%`,
                      height: '100%',
                      borderRadius: 4,
                      // Same colours as the chart: green where revenue dominates, yellow for expenses.
                      bgcolor:
                        row.expense > row.revenue ? tokens.color.warning : tokens.color.brand,
                      transition: 'width 300ms ease',
                    }}
                  />
                </Box>
                <Typography variant="caption">
                  Net {formatMoney(row.net)} · {row.count} transactions
                </Typography>
              </Box>
            ))}
          </Stack>
        )}
      </Box>
    </Paper>
  );
}
