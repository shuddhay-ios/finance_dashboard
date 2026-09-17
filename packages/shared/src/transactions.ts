import { z } from 'zod';
import { CURRENCIES, TRANSACTION_CATEGORIES, TRANSACTION_STATUSES } from './enums';
import { hasAtMostTwoDecimals } from './money';

export const DEFAULT_PAGE_SIZE = 25;
export const MAX_PAGE_SIZE = 100;

export const SORT_FIELDS = ['date', 'amount', 'category', 'status', 'user'] as const;
export type SortField = (typeof SORT_FIELDS)[number];

export const SORT_DIRECTIONS = ['asc', 'desc'] as const;
export type SortDirection = (typeof SORT_DIRECTIONS)[number];

// A query string sends one value as a string (?status=Paid) and a repeated key as an
// array (?status=Paid&status=Pending). Treat both as an array.
function toArray(value: unknown): unknown {
  if (value === undefined) {
    return undefined;
  }
  return Array.isArray(value) ? value : [value];
}

function multiSelect<T extends z.ZodType>(item: T) {
  return z.preprocess(toArray, z.array(item).optional());
}

// A whole day ("2024-03-31") or an exact moment ("2024-03-31T18:00:00Z").
const dateParam = z.union([z.iso.date(), z.iso.datetime({ offset: true })]);

// Amounts arrive in dollars, as the user typed them.
const amountParam = z.coerce
  .number()
  .nonnegative()
  .refine(hasAtMostTwoDecimals, { message: 'must have at most 2 decimal places' });

/** The filters shared by the table, every analytics endpoint and the CSV export. */
export const filterFields = {
  search: z.string().trim().max(100).optional(),
  dateFrom: dateParam.optional(),
  dateTo: dateParam.optional(),
  amountMin: amountParam.optional(),
  amountMax: amountParam.optional(),
  category: multiSelect(z.enum(TRANSACTION_CATEGORIES)),
  status: multiSelect(z.enum(TRANSACTION_STATUSES)),
  userId: multiSelect(z.string().min(1).max(50)),
};

interface RangeFields {
  dateFrom?: string;
  dateTo?: string;
  amountMin?: number;
  amountMax?: number;
}

/** Rejects a range whose start is after its end, naming the field to fix. */
export function withRangeChecks<T extends z.ZodType<RangeFields>>(schema: T): T {
  return schema
    .refine(
      (value) =>
        !value.dateFrom || !value.dateTo || Date.parse(value.dateFrom) <= Date.parse(value.dateTo),
      { path: ['dateFrom'], message: 'dateFrom must be on or before dateTo' },
    )
    .refine(
      (value) =>
        value.amountMin === undefined ||
        value.amountMax === undefined ||
        value.amountMin <= value.amountMax,
      { path: ['amountMin'], message: 'amountMin must be less than or equal to amountMax' },
    );
}

export const transactionFiltersSchema = withRangeChecks(z.object(filterFields));
export type TransactionFilterQuery = z.infer<typeof transactionFiltersSchema>;

export const transactionListQuerySchema = withRangeChecks(
  z.object({
    ...filterFields,
    page: z.coerce.number().int().min(1).default(1),
    // Asking for more than the maximum is capped, not rejected: it's a reasonable request
    // that simply gets the largest page we serve.
    limit: z.coerce
      .number()
      .int()
      .min(1)
      .transform((limit) => Math.min(limit, MAX_PAGE_SIZE))
      .default(DEFAULT_PAGE_SIZE),
    sortBy: z.enum(SORT_FIELDS).default('date'),
    sortDir: z.enum(SORT_DIRECTIONS).default('desc'),
  }),
);
export type TransactionListQuery = z.infer<typeof transactionListQuerySchema>;

export const transactionUserSchema = z.object({
  id: z.string(),
  externalId: z.string().nullable(),
  name: z.string(),
  email: z.string(),
  avatarUrl: z.string(),
});

export const transactionResponseSchema = z.object({
  id: z.string(),
  externalId: z.number().int(),
  date: z.iso.datetime(),
  // Dollars, converted from integer cents only here, at the edge of the API.
  amount: z.number(),
  currency: z.enum(CURRENCIES),
  category: z.enum(TRANSACTION_CATEGORIES),
  status: z.enum(TRANSACTION_STATUSES),
  user: transactionUserSchema,
});
export type TransactionResponse = z.infer<typeof transactionResponseSchema>;

export const transactionListResponseSchema = z.object({
  data: z.array(transactionResponseSchema),
  page: z.number().int(),
  limit: z.number().int(),
  total: z.number().int(),
  totalPages: z.number().int(),
});
export type TransactionListResponse = z.infer<typeof transactionListResponseSchema>;
