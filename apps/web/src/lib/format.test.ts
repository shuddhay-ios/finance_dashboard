import { describe, expect, it } from 'vitest';
import {
  formatCompactMoney,
  formatDate,
  formatMoney,
  formatPercentChange,
  formatPeriod,
  formatPeriodLong,
  formatSignedMoney,
} from './format';

describe('money formatting', () => {
  it('shows two decimals and thousands separators', () => {
    expect(formatMoney(1234.5)).toBe('$1,234.50');
    expect(formatMoney(0)).toBe('$0.00');
  });

  it('marks revenue with + and expenses with a minus sign', () => {
    expect(formatSignedMoney(80.09, 'Revenue')).toBe('+$80.09');
    expect(formatSignedMoney(7.03, 'Expense')).toBe('−$7.03');
  });

  it('abbreviates large numbers for chart axes', () => {
    expect(formatCompactMoney(12400)).toBe('$12.4K');
  });
});

describe('formatPercentChange', () => {
  it('always shows a sign and one decimal', () => {
    expect(formatPercentChange(12.4)).toBe('+12.4%');
    expect(formatPercentChange(-3)).toBe('−3.0%');
    expect(formatPercentChange(0)).toBe('0.0%');
  });
});

describe('dates', () => {
  it('formats in UTC, so a late-evening transaction keeps its stored date', () => {
    expect(formatDate('2024-03-31T23:30:00.000Z')).toBe('Sun, 31 Mar 2024');
  });

  it('labels chart periods by granularity', () => {
    expect(formatPeriod('2024-01', 'month')).toBe('Jan');
    expect(formatPeriod('2024-01-15', 'day')).toBe('15 Jan');
    expect(formatPeriodLong('2024-01', 'month')).toBe('January 2024');
    expect(formatPeriodLong('2024-01-15', 'week')).toBe('Week of 15 Jan 2024');
  });
});
