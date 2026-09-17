import type {
  BreakdownResponse,
  ErrorEnvelope,
  SummaryResponse,
  TransactionListResponse,
  TrendsResponse,
} from '@finance/shared';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  DATASET,
  type SeededApp,
  queryString,
  startSeededApp,
  stopSeededApp,
} from './helpers/seeded-app';

type Row = (typeof DATASET)[number];

const cents = (rows: Row[]) => rows.reduce((sum, row) => sum + row.amountMinor, 0);
const revenueOf = (rows: Row[]) => cents(rows.filter((row) => row.category === 'Revenue')) / 100;
const expenseOf = (rows: Row[]) => cents(rows.filter((row) => row.category === 'Expense')) / 100;

describe('analytics', () => {
  let seeded: SeededApp;

  beforeAll(async () => {
    seeded = await startSeededApp();
  });

  afterAll(async () => {
    await stopSeededApp(seeded);
  });

  async function get<T>(path: string, params: [string, string][] = [], status = 200): Promise<T> {
    const response = await request(seeded.server)
      .get(`/api/v1/analytics/${path}?${queryString(params)}`)
      .set('Authorization', `Bearer ${seeded.accessToken}`)
      .expect(status);
    return response.body as T;
  }

  it('requires login', async () => {
    await request(seeded.server).get('/api/v1/analytics/summary').expect(401);
  });

  describe('summary', () => {
    it('matches a manual sum of all 300 rows', async () => {
      const summary = await get<SummaryResponse>('summary');
      const pending = DATASET.filter((row) => row.status === 'Pending');

      expect(summary).toMatchObject({
        totalRevenue: revenueOf(DATASET),
        totalExpense: expenseOf(DATASET),
        net:
          (cents(DATASET.filter((r) => r.category === 'Revenue')) -
            cents(DATASET.filter((r) => r.category === 'Expense'))) /
          100,
        pendingAmount: cents(pending) / 100,
        pendingCount: pending.length,
        transactionCount: 300,
        deltas: { revenue: null, expense: null, net: null },
      });
    });

    it('respects filters', async () => {
      const summary = await get<SummaryResponse>('summary', [['userId', 'user_003']]);
      const rows = DATASET.filter((row) => row.user_id === 'user_003');

      expect(summary.transactionCount).toBe(rows.length);
      expect(summary.totalRevenue).toBe(revenueOf(rows));
    });

    it('compares with the equal-length window just before the date range', async () => {
      const summary = await get<SummaryResponse>('summary', [
        ['dateFrom', '2024-03-01'],
        ['dateTo', '2024-03-31'],
      ]);
      // March is 31 days, so the previous window is the 31 days before 1 March.
      const inRange = (row: Row, from: string, to: string) =>
        row.time >= Date.parse(from) && row.time < Date.parse(to);
      const march = DATASET.filter((row) => inRange(row, '2024-03-01Z', '2024-04-01Z'));
      const before = DATASET.filter((row) => inRange(row, '2024-01-30Z', '2024-03-01Z'));
      const change = (now: number, then: number) =>
        Math.round(((now - then) / Math.abs(then)) * 1000) / 10;

      expect(summary.deltas.revenue).toBe(change(revenueOf(march), revenueOf(before)));
      expect(summary.deltas.expense).toBe(change(expenseOf(march), expenseOf(before)));
    });

    it('returns null deltas, never Infinity, when the previous period is empty', async () => {
      const summary = await get<SummaryResponse>('summary', [
        ['dateFrom', '2024-01-01'],
        ['dateTo', '2024-12-31'],
      ]);
      expect(summary.deltas).toEqual({ revenue: null, expense: null, net: null });
    });

    it('agrees with the table for the same filters', async () => {
      const filters: [string, string][] = [
        ['status', 'Pending'],
        ['search', 'user_002'],
      ];
      const summary = await get<SummaryResponse>('summary', filters);

      let tableRevenue = 0;
      for (let page = 1; page <= 3; page += 1) {
        const response = await request(seeded.server)
          .get(
            `/api/v1/transactions?${queryString([...filters, ['limit', '100'], ['page', String(page)]])}`,
          )
          .set('Authorization', `Bearer ${seeded.accessToken}`);
        const body = response.body as TransactionListResponse;
        tableRevenue += body.data
          .filter((row) => row.category === 'Revenue')
          .reduce((sum, row) => sum + Math.round(row.amount * 100), 0);
      }

      expect(summary.totalRevenue).toBe(tableRevenue / 100);
    });
  });

  describe('trends', () => {
    it('shows all 12 months of 2024', async () => {
      const trends = await get<TrendsResponse>('trends');

      expect(trends.granularity).toBe('month');
      expect(trends.series.map((point) => point.period)).toHaveLength(12);
      expect(trends.series[0]?.period).toBe('2024-01');
      expect(trends.series[11]?.period).toBe('2024-12');
    });

    it('fills days without transactions with zeros', async () => {
      const trends = await get<TrendsResponse>('trends', [
        ['granularity', 'day'],
        ['dateFrom', '2024-01-01'],
        ['dateTo', '2024-01-31'],
      ]);
      const january = DATASET.filter((row) => row.date.startsWith('2024-01'));
      const daysWithData = new Set(january.map((row) => row.date.slice(0, 10))).size;
      const emptyDays = trends.series.filter((point) => point.revenue === 0 && point.expense === 0);

      expect(trends.series).toHaveLength(31);
      expect(trends.series[0]?.period).toBe('2024-01-01');
      expect(emptyDays.length).toBeGreaterThanOrEqual(31 - daysWithData);
      const totalRevenue = trends.series.reduce(
        (sum, point) => sum + Math.round(point.revenue * 100),
        0,
      );
      expect(totalRevenue / 100).toBe(revenueOf(january));
    });

    it('groups weeks from Monday', async () => {
      const trends = await get<TrendsResponse>('trends', [['granularity', 'week']]);
      const weekdays = trends.series.map((point) =>
        new Date(`${point.period}T00:00:00Z`).getUTCDay(),
      );

      expect(new Set(weekdays)).toEqual(new Set([1]));
    });

    it('refuses a range with too many points to chart', async () => {
      const body = await get<ErrorEnvelope>(
        'trends',
        [
          ['granularity', 'day'],
          ['dateFrom', '2000-01-01'],
          ['dateTo', '2024-12-31'],
        ],
        400,
      );
      expect(body.code).toBe('VALIDATION_FAILED');
    });
  });

  describe('breakdown', () => {
    it.each(['category', 'status', 'user', 'month'])(
      'by %s: counts cover every row and percentages add up to 100',
      async (dimension) => {
        const breakdown = await get<BreakdownResponse>('breakdown', [['dimension', dimension]]);
        const percentTotal = breakdown.data.reduce((sum, row) => sum + row.percentage * 100, 0);

        expect(breakdown.dimension).toBe(dimension);
        expect(breakdown.data.reduce((sum, row) => sum + row.count, 0)).toBe(300);
        expect(Math.round(percentTotal)).toBe(10000);
      },
    );

    it('labels users by name and months readably, in calendar order', async () => {
      const byUser = await get<BreakdownResponse>('breakdown', [['dimension', 'user']]);
      expect(byUser.data.map((row) => row.key).sort()).toEqual([
        'user_001',
        'user_002',
        'user_003',
        'user_004',
      ]);
      expect(byUser.data.map((row) => row.label)).toContain('Priya Sharma');

      const byMonth = await get<BreakdownResponse>('breakdown', [['dimension', 'month']]);
      expect(byMonth.data[0]).toMatchObject({ key: '2024-01', label: 'Jan 2024' });
      expect(byMonth.data).toHaveLength(12);
    });

    it('returns an empty list, not an error, when nothing matches', async () => {
      const breakdown = await get<BreakdownResponse>('breakdown', [['amountMin', '999999']]);
      expect(breakdown.data).toEqual([]);
    });
  });
});
