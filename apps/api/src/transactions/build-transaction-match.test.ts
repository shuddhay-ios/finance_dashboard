import { Types } from 'mongoose';
import { describe, expect, it } from 'vitest';
import { buildTransactionMatch, type ResolvedUserIds } from './build-transaction-match';
import { normalizeFilters, type TransactionFilters } from './transaction-filters';

const NO_USERS: ResolvedUserIds = { filterUserIds: null, searchUserIds: [] };

function filters(overrides: Partial<TransactionFilters> = {}): TransactionFilters {
  return { ...normalizeFilters({}), ...overrides };
}

describe('normalizeFilters', () => {
  it('turns a whole-day dateTo into an exclusive bound at the next midnight (UTC)', () => {
    const normalized = normalizeFilters({ dateFrom: '2024-01-01', dateTo: '2024-03-31' });

    expect(normalized.dateFrom?.toISOString()).toBe('2024-01-01T00:00:00.000Z');
    expect(normalized.dateToExclusive?.toISOString()).toBe('2024-04-01T00:00:00.000Z');
  });

  it('includes an exact dateTo timestamp by ending one millisecond after it', () => {
    const normalized = normalizeFilters({ dateTo: '2024-01-15T08:34:12Z' });
    expect(normalized.dateToExclusive?.toISOString()).toBe('2024-01-15T08:34:12.001Z');
  });

  it('converts amounts to cents and missing lists to empty arrays', () => {
    const normalized = normalizeFilters({ amountMin: 1200.5, amountMax: 5000 });

    expect(normalized.amountMinMinor).toBe(120050);
    expect(normalized.amountMaxMinor).toBe(500000);
    expect(normalized.categories).toEqual([]);
  });
});

describe('buildTransactionMatch', () => {
  it('matches everything when no filter is set', () => {
    expect(buildTransactionMatch(filters(), NO_USERS)).toEqual({});
  });

  it('combines different fields with AND, several values of one field with OR ($in)', () => {
    const match = buildTransactionMatch(
      filters({ categories: ['Revenue', 'Expense'], statuses: ['Paid'] }),
      NO_USERS,
    );

    expect(match).toEqual({
      $and: [{ category: { $in: ['Revenue', 'Expense'] } }, { status: { $in: ['Paid'] } }],
    });
  });

  it('uses an inclusive start and exclusive end for dates, inclusive bounds for amounts', () => {
    const from = new Date('2024-01-01T00:00:00Z');
    const to = new Date('2024-02-01T00:00:00Z');

    const match = buildTransactionMatch(
      filters({ dateFrom: from, dateToExclusive: to, amountMinMinor: 100, amountMaxMinor: 200 }),
      NO_USERS,
    );

    expect(match).toEqual({
      $and: [{ date: { $gte: from, $lt: to } }, { amountMinor: { $gte: 100, $lte: 200 } }],
    });
  });

  it('keeps an amount bound of 0 instead of treating it as "not set"', () => {
    const match = buildTransactionMatch(filters({ amountMinMinor: 0 }), NO_USERS);
    expect(match).toEqual({ $and: [{ amountMinor: { $gte: 0 } }] });
  });

  it('filters by the resolved user ids, and matches nothing if none resolved', () => {
    const userId = new Types.ObjectId();

    expect(buildTransactionMatch(filters(), { ...NO_USERS, filterUserIds: [userId] })).toEqual({
      $and: [{ user: { $in: [userId] } }],
    });
    expect(buildTransactionMatch(filters(), { ...NO_USERS, filterUserIds: [] })).toEqual({
      $and: [{ user: { $in: [] } }],
    });
  });

  it('searches text fields case-insensitively and includes users whose name matched', () => {
    const userId = new Types.ObjectId();

    const match = buildTransactionMatch(filters({ search: 'pai' }), {
      ...NO_USERS,
      searchUserIds: [userId],
    });

    expect(match).toEqual({
      $and: [{ $or: [{ category: /pai/i }, { status: /pai/i }, { user: { $in: [userId] } }] }],
    });
  });

  it('also matches a numeric search against the exact amount and the transaction id', () => {
    const match = buildTransactionMatch(filters({ search: '1500' }), NO_USERS);

    expect(match).toEqual({
      $and: [
        {
          $or: [
            { category: /1500/i },
            { status: /1500/i },
            { amountMinor: 150000 },
            { externalId: 1500 },
          ],
        },
      ],
    });
  });

  it('matches a decimal search against the amount only', () => {
    const match = buildTransactionMatch(filters({ search: '1200.50' }), NO_USERS);
    const [searchCondition] = match.$and ?? [];

    expect(searchCondition?.$or).toContainEqual({ amountMinor: 120050 });
    expect(searchCondition?.$or).not.toContainEqual({ externalId: expect.anything() as unknown });
  });

  it('escapes regex characters so a search is always literal', () => {
    const match = buildTransactionMatch(filters({ search: '.*(' }), NO_USERS);
    const [searchCondition] = match.$and ?? [];

    expect(searchCondition?.$or?.[0]).toEqual({ category: /\.\*\(/i });
  });
});
