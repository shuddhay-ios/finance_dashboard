import { Grid } from '@mui/material';
import type { UpdateView } from '../transactions/use-dashboard-view';
import type { DashboardView } from '../transactions/url-filters';
import { BreakdownChart } from './BreakdownChart';
import { useBreakdown, useTrends } from './queries';
import { TrendChart } from './TrendChart';

interface ChartsRowProps {
  view: DashboardView;
  updateView: UpdateView;
}

/** The trend chart and breakdown panel side by side, used on Dashboard and Analytics. */
export function ChartsRow({ view, updateView }: ChartsRowProps) {
  const trends = useTrends(view);
  const breakdown = useBreakdown(view);

  return (
    // Top-aligned: the breakdown card stays as tall as its content instead of being
    // stretched to match the chart and left half empty.
    <Grid container spacing={2} alignItems="flex-start">
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
  );
}
