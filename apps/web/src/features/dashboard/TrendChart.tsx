import type { Granularity, TrendPoint, TrendsResponse } from '@finance/shared';
import {
  Box,
  Paper,
  Skeleton,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  type TooltipProps,
  XAxis,
  YAxis,
} from 'recharts';
import { EmptyState } from '../../components/EmptyState';
import { formatCompactMoney, formatMoney, formatPeriod, formatPeriodLong } from '../../lib/format';
import { tokens } from '../../theme/tokens';

const CHART_HEIGHT = 280;

const GRANULARITY_LABELS: Record<Granularity, string> = {
  day: 'Day',
  week: 'Week',
  month: 'Month',
};

interface TrendChartProps {
  trends: TrendsResponse | undefined;
  isLoading: boolean;
  granularity: Granularity;
  onGranularityChange: (granularity: Granularity) => void;
}

export function TrendChart({
  trends,
  isLoading,
  granularity,
  onGranularityChange,
}: TrendChartProps) {
  return (
    <Paper sx={{ p: 2.5, height: '100%' }}>
      <Stack
        direction="row"
        flexWrap="wrap"
        useFlexGap
        spacing={2}
        alignItems="center"
        justifyContent="space-between"
        sx={{ mb: 2 }}
      >
        <Typography variant="h2">Revenue vs Expenses</Typography>
        <Stack direction="row" spacing={2} alignItems="center">
          <LegendDot color={tokens.color.brand} label="Revenue" />
          <LegendDot color={tokens.color.warning} label="Expenses" />
          <ToggleButtonGroup
            size="small"
            exclusive
            value={granularity}
            onChange={(_event, value: Granularity | null) => value && onGranularityChange(value)}
            aria-label="Chart granularity"
          >
            {(Object.keys(GRANULARITY_LABELS) as Granularity[]).map((option) => (
              <ToggleButton key={option} value={option}>
                {GRANULARITY_LABELS[option]}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </Stack>
      </Stack>

      <Box sx={{ height: CHART_HEIGHT }}>
        {isLoading ? (
          <Skeleton variant="rounded" height={CHART_HEIGHT} />
        ) : !trends || trends.series.length === 0 ? (
          <EmptyState title="No data for this range" />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trends.series} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid vertical={false} stroke={tokens.color.border} strokeDasharray="3 3" />
              <XAxis
                dataKey="period"
                tickFormatter={(period: string) => formatPeriod(period, trends.granularity)}
                tick={{ fill: tokens.color.textMuted, fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                minTickGap={16}
              />
              <YAxis
                tickFormatter={(value: number) => formatCompactMoney(value)}
                tick={{ fill: tokens.color.textMuted, fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                width={64}
              />
              <Tooltip
                content={<TrendTooltip granularity={trends.granularity} />}
                cursor={{ stroke: tokens.color.border }}
              />
              <Line
                type="monotone"
                dataKey="revenue"
                name="Revenue"
                stroke={tokens.color.brand}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="expense"
                name="Expenses"
                stroke={tokens.color.warning}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </Box>
    </Paper>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <Stack direction="row" spacing={0.75} alignItems="center">
      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: color }} />
      <Typography variant="caption">{label}</Typography>
    </Stack>
  );
}

type TrendTooltipProps = TooltipProps<number, string> & { granularity: Granularity };

/** Date, both values and the net for the hovered period. */
function TrendTooltip({ active, payload, granularity }: TrendTooltipProps) {
  const point = payload?.[0]?.payload as TrendPoint | undefined;
  if (!active || !point) {
    return null;
  }

  return (
    <Paper elevation={8} sx={{ p: 1.5, border: `1px solid ${tokens.color.border}` }}>
      <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
        {formatPeriodLong(point.period, granularity)}
      </Typography>
      <TooltipLine label="Revenue" value={formatMoney(point.revenue)} color={tokens.color.brand} />
      <TooltipLine
        label="Expenses"
        value={formatMoney(point.expense)}
        color={tokens.color.warning}
      />
      <TooltipLine
        label="Net"
        value={formatMoney(point.net)}
        color={point.net >= 0 ? tokens.color.brand : tokens.color.danger}
      />
    </Paper>
  );
}

function TooltipLine({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <Stack direction="row" justifyContent="space-between" spacing={3}>
      <Typography variant="caption">{label}</Typography>
      <Typography variant="caption" sx={{ color, fontWeight: 600 }}>
        {value}
      </Typography>
    </Stack>
  );
}
