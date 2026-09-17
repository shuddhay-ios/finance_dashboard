import type { FilterQuery, Types } from 'mongoose';
import { escapeRegex } from '../common/escape-regex';
import type { Transaction } from './transaction.schema';
import type { TransactionFilters } from './transaction-filters';

export type TransactionMatch = FilterQuery<Transaction>;

/** User ids looked up before matching, so this function never needs the database. */
export interface ResolvedUserIds {
  /** The userId filter translated to ObjectIds, or null when that filter isn't used. */
  filterUserIds: Types.ObjectId[] | null;
  /** Users whose name, email or externalId contains the search term. */
  searchUserIds: Types.ObjectId[];
}

// "1500" or "1200.50": digits with at most two decimals.
const NUMERIC_SEARCH = /^\d+(\.\d{1,2})?$/;

/**
 * The filter logic, written once. The transaction table, every analytics endpoint and the
 * CSV export all build their MongoDB filter here, so they can never disagree about which
 * rows match. It is pure (no database access, same input → same output), which makes it
 * easy to unit test.
 *
 * Different fields combine with AND; several values of one field combine with OR.
 */
export function buildTransactionMatch(
  filters: TransactionFilters,
  users: ResolvedUserIds,
): TransactionMatch {
  const conditions: TransactionMatch[] = [];

  const dateRange: { $gte?: Date; $lt?: Date } = {};
  if (filters.dateFrom) {
    dateRange.$gte = filters.dateFrom;
  }
  if (filters.dateToExclusive) {
    dateRange.$lt = filters.dateToExclusive;
  }
  if (filters.dateFrom || filters.dateToExclusive) {
    conditions.push({ date: dateRange });
  }

  const amountRange: { $gte?: number; $lte?: number } = {};
  if (filters.amountMinMinor !== null) {
    amountRange.$gte = filters.amountMinMinor;
  }
  if (filters.amountMaxMinor !== null) {
    amountRange.$lte = filters.amountMaxMinor;
  }
  if (filters.amountMinMinor !== null || filters.amountMaxMinor !== null) {
    conditions.push({ amountMinor: amountRange });
  }

  if (filters.categories.length > 0) {
    conditions.push({ category: { $in: filters.categories } });
  }
  if (filters.statuses.length > 0) {
    conditions.push({ status: { $in: filters.statuses } });
  }
  if (users.filterUserIds !== null) {
    conditions.push({ user: { $in: users.filterUserIds } });
  }

  if (filters.search) {
    conditions.push({ $or: searchConditions(filters.search, users.searchUserIds) });
  }

  return conditions.length > 0 ? { $and: conditions } : {};
}

/** A row matches the search if ANY of these is true. */
function searchConditions(term: string, matchingUserIds: Types.ObjectId[]): TransactionMatch[] {
  const containsTerm = new RegExp(escapeRegex(term), 'i');
  const conditions: TransactionMatch[] = [{ category: containsTerm }, { status: containsTerm }];

  if (matchingUserIds.length > 0) {
    conditions.push({ user: { $in: matchingUserIds } });
  }

  if (NUMERIC_SEARCH.test(term)) {
    // A number is matched exactly against the amount (in cents) and, if whole, the id.
    conditions.push({ amountMinor: Math.round(Number(term) * 100) });
    if (!term.includes('.')) {
      conditions.push({ externalId: Number(term) });
    }
  }

  return conditions;
}
