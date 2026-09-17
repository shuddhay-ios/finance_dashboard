import type { ErrorEnvelope, TransactionListResponse } from '@finance/shared';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  DATASET,
  type SeededApp,
  queryString,
  startSeededApp,
  stopSeededApp,
} from './helpers/seeded-app';

describe('GET /transactions', () => {
  let seeded: SeededApp;

  beforeAll(async () => {
    seeded = await startSeededApp();
  });

  afterAll(async () => {
    await stopSeededApp(seeded);
  });

  async function list(params: [string, string][] = [], status = 200) {
    const response = await request(seeded.server)
      .get(`/api/v1/transactions?${queryString(params)}`)
      .set('Authorization', `Bearer ${seeded.accessToken}`)
      .expect(status);
    return response.body as TransactionListResponse & ErrorEnvelope;
  }

  it('requires login', async () => {
    await request(seeded.server).get('/api/v1/transactions').expect(401);
  });

  it('defaults to 25 rows, newest first, out of 300', async () => {
    const body = await list();
    const dates = body.data.map((row) => row.date);

    expect(body).toMatchObject({ page: 1, limit: 25, total: 300, totalPages: 12 });
    expect(body.data).toHaveLength(25);
    expect(dates).toEqual([...dates].sort().reverse());
  });

  it('returns an empty page past the end, with the correct total', async () => {
    const body = await list([['page', '13']]);
    expect(body.data).toEqual([]);
    expect(body.total).toBe(300);
  });

  it('caps a huge limit at 100 and rejects invalid ones', async () => {
    expect((await list([['limit', '9999']])).limit).toBe(100);
    for (const bad of ['0', '-5', 'abc']) {
      expect((await list([['limit', bad]], 400)).code).toBe('VALIDATION_FAILED');
    }
  });

  it('rejects sorting by a field that is not allowed', async () => {
    expect((await list([['sortBy', 'passwordHash']], 400)).code).toBe('VALIDATION_FAILED');
  });

  it('sorts across the whole dataset, not just the visible page', async () => {
    const body = await list([
      ['sortBy', 'amount'],
      ['sortDir', 'asc'],
    ]);
    const smallest = Math.min(...DATASET.map((row) => row.amount));

    expect(body.data[0]?.amount).toBe(smallest);
  });

  it('never repeats or skips a row across pages, even with tied amounts', async () => {
    const seen: string[] = [];
    for (let page = 1; page <= 43; page += 1) {
      const body = await list([
        ['sortBy', 'amount'],
        ['limit', '7'],
        ['page', String(page)],
      ]);
      seen.push(...body.data.map((row) => row.id));
    }

    expect(seen).toHaveLength(300);
    expect(new Set(seen).size).toBe(300);
  });

  it('sorts by user name', async () => {
    const body = await list([
      ['sortBy', 'user'],
      ['sortDir', 'asc'],
      ['limit', '100'],
    ]);
    const names = body.data.map((row) => row.user.name);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
  });

  it('includes both ends of a date range', async () => {
    // Transaction 1 is at 2024-01-15T08:34:12Z; a range of just that day must include it.
    const body = await list([
      ['dateFrom', '2024-01-15'],
      ['dateTo', '2024-01-15'],
    ]);
    const expected = DATASET.filter((row) => row.date.startsWith('2024-01-15'));

    expect(body.total).toBe(expected.length);
    expect(body.data.map((row) => row.externalId)).toContain(1);
  });

  it('rejects a date range that ends before it starts', async () => {
    const body = await list(
      [
        ['dateFrom', '2024-03-01'],
        ['dateTo', '2024-01-01'],
      ],
      400,
    );
    expect(body.details).toEqual([expect.objectContaining({ field: 'dateFrom' })]);
  });

  it('includes both ends of an amount range, down to the cent', async () => {
    const body = await list([
      ['amountMin', '1200.5'],
      ['amountMax', '1200.5'],
    ]);
    expect(body.data.map((row) => row.externalId)).toContain(2);
    expect(body.data.every((row) => row.amount === 1200.5)).toBe(true);
  });

  it('treats several values of one filter as OR, different filters as AND', async () => {
    const both = await list([
      ['category', 'Revenue'],
      ['category', 'Expense'],
    ]);
    expect(both.total).toBe(300);

    const combined = await list([
      ['category', 'Revenue'],
      ['status', 'Paid'],
      ['userId', 'user_001'],
    ]);
    const expected = DATASET.filter(
      (row) => row.category === 'Revenue' && row.status === 'Paid' && row.user_id === 'user_001',
    );
    expect(combined.total).toBe(expected.length);
  });

  it('searches by user id, exact amount and status, ignoring case', async () => {
    const byUser = await list([['search', 'user_001']]);
    expect(byUser.total).toBe(DATASET.filter((row) => row.user_id === 'user_001').length);

    const byAmount = await list([['search', '1500']]);
    expect(byAmount.total).toBe(DATASET.filter((row) => row.amount === 1500).length);
    expect(byAmount.data.every((row) => row.amount === 1500)).toBe(true);

    const byStatus = await list([['search', 'PAID']]);
    expect(byStatus.total).toBe(DATASET.filter((row) => row.status === 'Paid').length);
  });

  it('treats regex characters in a search as plain text', async () => {
    expect((await list([['search', '.*']])).total).toBe(0);
    expect((await list([['search', '(']])).total).toBe(0);
  });

  it('combines search with filters using AND', async () => {
    const body = await list([
      ['search', 'Paid'],
      ['category', 'Expense'],
    ]);
    const expected = DATASET.filter((row) => row.status === 'Paid' && row.category === 'Expense');
    expect(body.total).toBe(expected.length);
  });

  it('returns an empty result, not an error, when nothing matches', async () => {
    const body = await list([['amountMin', '999999']]);
    expect(body).toMatchObject({ data: [], total: 0, totalPages: 0 });
  });

  it('returns dollars and a safe user, never a password hash', async () => {
    const body = await list([
      ['search', '2'],
      ['amountMin', '1200.5'],
      ['amountMax', '1200.5'],
    ]);
    const row = body.data.find((item) => item.externalId === 2);

    expect(row?.amount).toBe(1200.5);
    expect(row?.user).toEqual({
      id: expect.any(String) as unknown,
      externalId: 'user_002',
      name: 'Rohan Mehta',
      email: 'rohan.mehta@example.com',
      avatarUrl: expect.stringContaining('dicebear') as unknown,
    });
    expect(JSON.stringify(body)).not.toMatch(/passwordHash|argon2/);
  });
});
