import type { Granularity } from '@finance/shared';

/**
 * The start of the day, week or month containing `date`, in UTC. This must agree with
 * $dateTrunc in the trends pipeline. Weeks start on Monday (ISO 8601).
 */
export function startOfPeriod(date: Date, granularity: Granularity): Date {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const day = date.getUTCDate();

  switch (granularity) {
    case 'day':
      return new Date(Date.UTC(year, month, day));
    case 'week': {
      // getUTCDay() is 0 for Sunday … 6 for Saturday; this gives Monday 0 … Sunday 6.
      const daysSinceMonday = (date.getUTCDay() + 6) % 7;
      return new Date(Date.UTC(year, month, day - daysSinceMonday));
    }
    case 'month':
      return new Date(Date.UTC(year, month, 1));
  }
}

/** The start of the period after the one starting at `start`. */
export function nextPeriod(start: Date, granularity: Granularity): Date {
  const year = start.getUTCFullYear();
  const month = start.getUTCMonth();
  const day = start.getUTCDate();

  switch (granularity) {
    case 'day':
      return new Date(Date.UTC(year, month, day + 1));
    case 'week':
      return new Date(Date.UTC(year, month, day + 7));
    case 'month':
      return new Date(Date.UTC(year, month + 1, 1));
  }
}

/** "2024-03-04" for a day or a week (its Monday), "2024-03" for a month. */
export function periodKey(start: Date, granularity: Granularity): string {
  const isoDate = start.toISOString().slice(0, 10);
  return granularity === 'month' ? isoDate.slice(0, 7) : isoDate;
}

/**
 * Every period start from the one containing `from` up to (not including) `until`, capped
 * at `maxCount`. Listing every period, not just those with data, is what makes an empty
 * month show up as zero instead of disappearing from the chart.
 */
export function listPeriodStarts(
  from: Date,
  until: Date,
  granularity: Granularity,
  maxCount: number,
): Date[] {
  const starts: Date[] = [];
  let start = startOfPeriod(from, granularity);
  while (start < until && starts.length < maxCount) {
    starts.push(start);
    start = nextPeriod(start, granularity);
  }
  return starts;
}
