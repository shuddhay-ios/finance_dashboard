import { Stack } from '@mui/material';
import { FilterBar } from '../transactions/FilterBar';
import { TransactionsPanel } from '../transactions/TransactionsPanel';
import { useDashboardView } from '../transactions/use-dashboard-view';
import { ChartsRow } from './ChartsRow';
import { MetricCards } from './MetricCards';
import { useSummary } from './queries';

/** Everything on one screen, like the design: filters, cards, charts and the table. */
export function DashboardPage() {
  const { view, updateView } = useDashboardView();
  const summary = useSummary(view);

  return (
    <Stack spacing={3}>
      <FilterBar view={view} updateView={updateView} />
      <MetricCards summary={summary.data} isLoading={summary.isPending} />
      <ChartsRow view={view} updateView={updateView} />
      <TransactionsPanel view={view} updateView={updateView} />
    </Stack>
  );
}

/** Just the table, filters and export. */
export function TransactionsPage() {
  const { view, updateView } = useDashboardView();

  return (
    <Stack spacing={3}>
      <FilterBar view={view} updateView={updateView} />
      <TransactionsPanel view={view} updateView={updateView} />
    </Stack>
  );
}

/** Just the numbers and charts. */
export function AnalyticsPage() {
  const { view, updateView } = useDashboardView();
  const summary = useSummary(view);

  return (
    <Stack spacing={3}>
      <FilterBar view={view} updateView={updateView} />
      <MetricCards summary={summary.data} isLoading={summary.isPending} />
      <ChartsRow view={view} updateView={updateView} />
    </Stack>
  );
}
