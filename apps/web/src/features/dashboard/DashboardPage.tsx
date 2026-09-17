import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import { Button, Grid, Paper, Stack, Typography } from '@mui/material';
import { useState } from 'react';
import { ExportDialog } from '../exports/ExportDialog';
import { FilterBar } from '../transactions/FilterBar';
import { useTransactions } from '../transactions/queries';
import { TransactionTable } from '../transactions/TransactionTable';
import { useDashboardView } from '../transactions/use-dashboard-view';
import { CLEARED_FILTERS } from '../transactions/url-filters';
import { BreakdownChart } from './BreakdownChart';
import { MetricCards } from './MetricCards';
import { useBreakdown, useSummary, useTrends } from './queries';
import { TrendChart } from './TrendChart';

export function DashboardPage() {
  const { view, updateView } = useDashboardView();
  const summary = useSummary(view);
  const trends = useTrends(view);
  const breakdown = useBreakdown(view);
  const transactions = useTransactions(view);

  const [isExportOpen, setIsExportOpen] = useState(false);

  const clearFilters = () => updateView(CLEARED_FILTERS);

  return (
    <Stack spacing={3}>
      <FilterBar view={view} updateView={updateView} />

      <MetricCards summary={summary.data} isLoading={summary.isPending} />

      <Grid container spacing={3}>
        <Grid item xs={12} lg={8}>
          <TrendChart
            trends={trends.data}
            isLoading={trends.isPending}
            granularity={view.granularity}
            onGranularityChange={(granularity) => updateView({ granularity })}
          />
        </Grid>
        <Grid item xs={12} lg={4}>
          <BreakdownChart
            breakdown={breakdown.data}
            isLoading={breakdown.isPending}
            dimension={view.dimension}
            onDimensionChange={(dimension) => updateView({ dimension })}
          />
        </Grid>
      </Grid>

      <Paper sx={{ p: { xs: 2, md: 2.5 } }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <Typography variant="h2">Transactions</Typography>
          <Button
            variant="contained"
            startIcon={<FileDownloadOutlinedIcon />}
            onClick={() => setIsExportOpen(true)}
          >
            Export
          </Button>
        </Stack>
        <TransactionTable
          data={transactions.data}
          isLoading={transactions.isPending}
          isShowingPreviousData={transactions.isPlaceholderData}
          view={view}
          updateView={updateView}
          onClearFilters={clearFilters}
        />
      </Paper>
      {/* Mounted only while open, so each export starts from fresh settings and queries. */}
      {isExportOpen && <ExportDialog open onClose={() => setIsExportOpen(false)} view={view} />}
    </Stack>
  );
}
