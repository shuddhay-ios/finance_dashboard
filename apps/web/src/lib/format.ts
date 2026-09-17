import type { Granularity } from '@finance/shared';

// All dates are stored and grouped in UTC, so they are shown in UTC too; otherwise a
// transaction late on 31 March could appear under April in one place and March in another.
const TIME_ZONE = 'UTC';

const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
const compactMoney = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  notation: 'compact',
  maximumFractionDigits: 1,
});

/** 1234.5 → "$1,234.50" */
export function formatMoney(amount: number): string {
  return money.format(amount);
}

/** Revenue "+$80.09", expense "−$7.03" (a real minus sign, like the design). */
export function formatSignedMoney(amount: number, category: 'Revenue' | 'Expense'): string {
  return `${category === 'Revenue' ? '+' : '−'}${money.format(amount)}`;
}

/** 12400 → "$12.4K", for chart axes. */
export function formatCompactMoney(amount: number): string {
  return compactMoney.format(amount);
}

/** 12.4 → "+12.4%", -3 → "−3.0%" */
export function formatPercentChange(change: number): string {
  const sign = change > 0 ? '+' : change < 0 ? '−' : '';
  return `${sign}${Math.abs(change).toFixed(1)}%`;
}

/** "2024-01-15T08:34:12.000Z" → "Mon, 15 Jan 2024" */
export function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: TIME_ZONE,
  });
}

/** Chart labels: "Jan" for a month, "15 Jan" for a day or week. */
export function formatPeriod(period: string, granularity: Granularity): string {
  if (granularity === 'month') {
    return new Date(`${period}-01T00:00:00Z`).toLocaleDateString('en-GB', {
      month: 'short',
      timeZone: TIME_ZONE,
    });
  }
  return new Date(`${period}T00:00:00Z`).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    timeZone: TIME_ZONE,
  });
}

/** Tooltip title: "January 2024", or "Week of 15 Jan 2024", or "Mon, 15 Jan 2024". */
export function formatPeriodLong(period: string, granularity: Granularity): string {
  if (granularity === 'month') {
    return new Date(`${period}-01T00:00:00Z`).toLocaleDateString('en-GB', {
      month: 'long',
      year: 'numeric',
      timeZone: TIME_ZONE,
    });
  }
  const day = formatDate(`${period}T00:00:00Z`);
  return granularity === 'week' ? `Week of ${day.slice(5)}` : day;
}
