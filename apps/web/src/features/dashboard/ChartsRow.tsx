import { Box } from '@mui/material';
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
    // A plain CSS grid, like the rest of the page: MUI's Grid adds negative margins, which
    // left this row a few pixels right of the filter bar and the table below it.
    // Side by side from 900px (md) wide, stacked below that, and top-aligned so the
    // breakdown card stays as tall as its content.
    <Box
      sx={{
        display: 'grid',
        gap: 2,
        alignItems: 'start',
        gridTemplateColumns: { xs: '1fr', md: '2fr 1fr' },
      }}
    >
      <TrendChart
        trends={trends.data}
        isLoading={trends.isPending}
        granularity={view.granularity}
        onGranularityChange={(granularity) => updateView({ granularity })}
      />
      <BreakdownChart
        breakdown={breakdown.data}
        isLoading={breakdown.isPending}
        dimension={view.dimension}
        onDimensionChange={(dimension) => updateView({ dimension })}
      />
    </Box>
  );
}
