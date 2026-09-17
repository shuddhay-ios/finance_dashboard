import { describe, expect, it } from 'vitest';
import { listPeriodStarts, nextPeriod, periodKey, startOfPeriod } from './periods';

const at = (iso: string) => new Date(iso);

describe('startOfPeriod', () => {
  it('truncates to midnight UTC for days, even late in the evening', () => {
    expect(startOfPeriod(at('2024-01-15T23:59:59Z'), 'day')).toEqual(at('2024-01-15T00:00:00Z'));
  });

  it('goes back to Monday for weeks, including from a Sunday', () => {
    // 2024-01-14 is a Sunday; its week started Monday 2024-01-08.
    expect(startOfPeriod(at('2024-01-14T10:00:00Z'), 'week')).toEqual(at('2024-01-08T00:00:00Z'));
    expect(startOfPeriod(at('2024-01-08T00:00:00Z'), 'week')).toEqual(at('2024-01-08T00:00:00Z'));
  });

  it('crosses a year boundary for a week that started in December', () => {
    // 2025-01-01 is a Wednesday; its week started Monday 2024-12-30.
    expect(startOfPeriod(at('2025-01-01T12:00:00Z'), 'week')).toEqual(at('2024-12-30T00:00:00Z'));
  });

  it('goes to the 1st for months', () => {
    expect(startOfPeriod(at('2024-02-29T12:00:00Z'), 'month')).toEqual(at('2024-02-01T00:00:00Z'));
  });
});

describe('nextPeriod', () => {
  it('handles month lengths and leap years', () => {
    expect(nextPeriod(at('2024-01-31T00:00:00Z'), 'day')).toEqual(at('2024-02-01T00:00:00Z'));
    expect(nextPeriod(at('2024-02-28T00:00:00Z'), 'day')).toEqual(at('2024-02-29T00:00:00Z'));
    expect(nextPeriod(at('2024-12-01T00:00:00Z'), 'month')).toEqual(at('2025-01-01T00:00:00Z'));
  });
});

describe('periodKey', () => {
  it('formats days and weeks as a date, months as year-month', () => {
    expect(periodKey(at('2024-03-04T00:00:00Z'), 'week')).toBe('2024-03-04');
    expect(periodKey(at('2024-03-01T00:00:00Z'), 'month')).toBe('2024-03');
  });
});

describe('listPeriodStarts', () => {
  it('lists every month in range, including empty ones', () => {
    const starts = listPeriodStarts(at('2024-01-01Z'), at('2025-01-01Z'), 'month', 100);
    expect(starts.map((start) => periodKey(start, 'month'))).toEqual([
      '2024-01',
      '2024-02',
      '2024-03',
      '2024-04',
      '2024-05',
      '2024-06',
      '2024-07',
      '2024-08',
      '2024-09',
      '2024-10',
      '2024-11',
      '2024-12',
    ]);
  });

  it('includes the partial period containing the start date', () => {
    const starts = listPeriodStarts(at('2024-01-10T15:00:00Z'), at('2024-01-13Z'), 'day', 100);
    expect(starts.map((start) => periodKey(start, 'day'))).toEqual([
      '2024-01-10',
      '2024-01-11',
      '2024-01-12',
    ]);
  });

  it('stops at maxCount so a huge range cannot build a huge array', () => {
    expect(listPeriodStarts(at('1900-01-01Z'), at('2100-01-01Z'), 'day', 5)).toHaveLength(5);
  });
});
