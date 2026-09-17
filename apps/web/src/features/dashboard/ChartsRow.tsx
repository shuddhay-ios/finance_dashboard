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
  );
}
