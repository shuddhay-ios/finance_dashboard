import { z } from 'zod';
import { filterFields, withRangeChecks } from './transactions';

export const GRANULARITIES = ['day', 'week', 'month'] as const;
export type Granularity = (typeof GRANULARITIES)[number];

export const BREAKDOWN_DIMENSIONS = ['category', 'status', 'user', 'month'] as const;
export type BreakdownDimension = (typeof BREAKDOWN_DIMENSIONS)[number];

export const trendsQuerySchema = withRangeChecks(
  z.object({ ...filterFields, granularity: z.enum(GRANULARITIES).default('month') }),
);
export type TrendsQuery = z.infer<typeof trendsQuerySchema>;

export const breakdownQuerySchema = withRangeChecks(
  z.object({ ...filterFields, dimension: z.enum(BREAKDOWN_DIMENSIONS).default('category') }),
);
export type BreakdownQuery = z.infer<typeof breakdownQuerySchema>;

// % change against the previous period of the same length; null when there is nothing
// to compare against (no closed date range, or the previous period was zero).
const deltaSchema = z.number().nullable();

export const summaryResponseSchema = z.object({
  totalRevenue: z.number(),
  totalExpense: z.number(),
  net: z.number(),
  pendingAmount: z.number(),
  pendingCount: z.number().int(),
  transactionCount: z.number().int(),
  averageTransaction: z.number(),
  deltas: z.object({ revenue: deltaSchema, expense: deltaSchema, net: deltaSchema }),
});
export type SummaryResponse = z.infer<typeof summaryResponseSchema>;

export const trendPointSchema = z.object({
  period: z.string(),
  revenue: z.number(),
  expense: z.number(),
  net: z.number(),
});
export type TrendPoint = z.infer<typeof trendPointSchema>;

export const trendsResponseSchema = z.object({
  granularity: z.enum(GRANULARITIES),
  series: z.array(trendPointSchema),
});
export type TrendsResponse = z.infer<typeof trendsResponseSchema>;

export const breakdownRowSchema = z.object({
  key: z.string(),
  label: z.string(),
  revenue: z.number(),
  expense: z.number(),
  net: z.number(),
  count: z.number().int(),
  // Share of all money moved (revenue + expense), in percent. Rows add up to exactly 100.
  percentage: z.number(),
});
export type BreakdownRow = z.infer<typeof breakdownRowSchema>;

export const breakdownResponseSchema = z.object({
  dimension: z.enum(BREAKDOWN_DIMENSIONS),
  data: z.array(breakdownRowSchema),
});
export type BreakdownResponse = z.infer<typeof breakdownResponseSchema>;
