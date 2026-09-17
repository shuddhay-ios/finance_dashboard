import {
  type TransactionCategory,
  type TransactionFilterQuery,
  type TransactionStatus,
  toMinorUnits,
} from '@finance/shared';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/** Validated query filters, converted to what the database stores: Dates, cents, arrays. */
export interface TransactionFilters {
  search: string | null;
  dateFrom: Date | null;
  // Stored as an exclusive bound so every comparison is "date < this". "dateTo=2024-03-31"
  // means "until the end of March 31", which is exactly "before 2024-04-01T00:00Z".
  dateToExclusive: Date | null;
  amountMinMinor: number | null;
  amountMaxMinor: number | null;
  categories: TransactionCategory[];
  statuses: TransactionStatus[];
  userExternalIds: string[];
}

export function normalizeFilters(query: TransactionFilterQuery): TransactionFilters {
  return {
    search: query.search ? query.search : null,
    dateFrom: query.dateFrom ? new Date(query.dateFrom) : null,
    dateToExclusive: query.dateTo ? toExclusiveEnd(query.dateTo) : null,
    amountMinMinor: query.amountMin === undefined ? null : toMinorUnits(query.amountMin),
    amountMaxMinor: query.amountMax === undefined ? null : toMinorUnits(query.amountMax),
    categories: query.category ?? [],
    statuses: query.status ?? [],
    userExternalIds: query.userId ?? [],
  };
}

// Dates without a time are read as UTC, the timezone the data is stored in.
function toExclusiveEnd(dateTo: string): Date {
  const start = new Date(dateTo);
  // A bare date includes that whole day. An exact timestamp includes that instant, so the
  // exclusive end is one millisecond later.
  const offset = DATE_ONLY.test(dateTo) ? MS_PER_DAY : 1;
  return new Date(start.getTime() + offset);
}
