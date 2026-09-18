import type { SummaryResponse } from '@finance/shared';
import AccountBalanceWalletOutlinedIcon from '@mui/icons-material/AccountBalanceWalletOutlined';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined';
import ShoppingCartOutlinedIcon from '@mui/icons-material/ShoppingCartOutlined';
import { Box, Paper, Skeleton, Stack, Typography } from '@mui/material';
import type { ReactNode } from 'react';
import { formatMoney, formatPercentChange } from '../../lib/format';
import { tokens } from '../../theme/tokens';

interface MetricCardsProps {
  summary: SummaryResponse | undefined;
  isLoading: boolean;
}

export function MetricCards({ summary, isLoading }: MetricCardsProps) {
  const netIsPositive = (summary?.net ?? 0) >= 0;

  return (
    // A plain CSS grid, like the rest of the page: MUI's Grid adds negative margins that
    // would leave this row a few pixels right of the other boxes.
    <Box
      sx={{
        display: 'grid',
        gap: 2,
        gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' },
      }}
    >
      <MetricCard
        icon={<PaymentsOutlinedIcon />}
        label="Total Revenue"
        value={summary && formatMoney(summary.totalRevenue)}
        footer={summary && <DeltaText change={summary.deltas.revenue} higherIsBetter />}
        isLoading={isLoading}
      />
      <MetricCard
        icon={<ShoppingCartOutlinedIcon />}
        label="Total Expenses"
        value={summary && formatMoney(summary.totalExpense)}
        footer={summary && <DeltaText change={summary.deltas.expense} higherIsBetter={false} />}
        isLoading={isLoading}
      />
      <MetricCard
        icon={<AccountBalanceWalletOutlinedIcon />}
        label="Net"
        value={summary && formatMoney(summary.net)}
        valueColor={netIsPositive ? tokens.color.brand : tokens.color.danger}
        footer={summary && <DeltaText change={summary.deltas.net} higherIsBetter />}
        isLoading={isLoading}
      />
      <MetricCard
        icon={<HourglassEmptyIcon />}
        label="Pending"
        value={summary && formatMoney(summary.pendingAmount)}
        footer={
          summary && (
            <Typography variant="caption">
              {summary.pendingCount} pending transaction{summary.pendingCount === 1 ? '' : 's'}
            </Typography>
          )
        }
        isLoading={isLoading}
      />
    </Box>
  );
}

interface MetricCardProps {
  icon: ReactNode;
  label: string;
  value: string | undefined;
  valueColor?: string;
  footer: ReactNode;
  isLoading: boolean;
}

function MetricCard({ icon, label, value, valueColor, footer, isLoading }: MetricCardProps) {
  return (
    <Paper sx={{ p: 2.5, height: '100%' }}>
      <Stack direction="row" spacing={2} alignItems="center">
        <Box
          sx={{
            width: 44,
            height: 44,
            flexShrink: 0,
            display: 'grid',
            placeItems: 'center',
            borderRadius: `${tokens.radius.sm}px`,
            bgcolor: tokens.color.surfaceRaised,
            color: tokens.color.brand,
          }}
        >
          {icon}
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="caption">{label}</Typography>
          {/* Skeletons keep the card's shape while loading, so nothing jumps when data arrives. */}
          {isLoading || value === undefined ? (
            <Skeleton width={120} height={36} />
          ) : (
            <Typography
              sx={{ fontSize: '1.5rem', fontWeight: 600, color: valueColor, lineHeight: 1.4 }}
              noWrap
            >
              {value}
            </Typography>
          )}
        </Box>
      </Stack>
      <Box sx={{ mt: 1.5, minHeight: 20 }}>{isLoading ? <Skeleton width={140} /> : footer}</Box>
    </Paper>
  );
}

function DeltaText({ change, higherIsBetter }: { change: number | null; higherIsBetter: boolean }) {
  if (change === null) {
    // No closed date range (or nothing before it), so there is nothing to compare with.
    return (
      <Typography variant="caption" title="Choose a date range to compare with the previous period">
        — vs previous period
      </Typography>
    );
  }

  const isGood = change === 0 || change > 0 === higherIsBetter;
  const Arrow = change >= 0 ? ArrowUpwardIcon : ArrowDownwardIcon;
  return (
    <Stack direction="row" alignItems="center" spacing={0.5}>
      <Arrow sx={{ fontSize: 14, color: isGood ? tokens.color.brand : tokens.color.danger }} />
      <Typography
        variant="caption"
        sx={{ color: isGood ? tokens.color.brand : tokens.color.danger, fontWeight: 600 }}
      >
        {formatPercentChange(change)}
      </Typography>
      <Typography variant="caption">vs previous period</Typography>
    </Stack>
  );
}
