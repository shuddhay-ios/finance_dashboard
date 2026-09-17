import {
  type BreakdownDimension,
  type BreakdownQuery,
  type BreakdownResponse,
  type BreakdownRow,
  type Granularity,
  type SummaryResponse,
  type TransactionFilterQuery,
  type TrendsQuery,
  type TrendsResponse,
  fromMinorUnits,
} from '@finance/shared';
import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model, PipelineStage, Types } from 'mongoose';
import { AppError } from '../common/errors/app-error';
import {
  type ResolvedUserIds,
  type TransactionMatch,
  buildTransactionMatch,
} from '../transactions/build-transaction-match';
import { TransactionFilterService } from '../transactions/transaction-filter.service';
import type { TransactionFilters } from '../transactions/transaction-filters';
import { TRANSACTION_MODEL, type Transaction } from '../transactions/transaction.schema';
import { UsersService } from '../users/users.service';
import { percentageShares, percentChange, previousWindow } from './figures';
import { listPeriodStarts, nextPeriod, periodKey } from './periods';

// Beyond this a chart is unreadable, and an unbounded range could build a huge response.
export const MAX_TREND_POINTS = 1000;

// Sums in integer cents. $cond picks the amount when the row belongs, otherwise 0.
const sumWhenCategory = (category: string) => ({
  $sum: { $cond: [{ $eq: ['$category', category] }, '$amountMinor', 0] },
});

interface Totals {
  revenueMinor: number;
  expenseMinor: number;
  pendingMinor: number;
  pendingCount: number;
  count: number;
}

const NO_TOTALS: Totals = {
  revenueMinor: 0,
  expenseMinor: 0,
  pendingMinor: 0,
  pendingCount: 0,
  count: 0,
};

interface PeriodTotals {
  _id: Date;
  revenueMinor: number;
  expenseMinor: number;
}

interface GroupTotals {
  _id: string | Types.ObjectId;
  revenueMinor: number;
  expenseMinor: number;
  count: number;
}

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectModel(TRANSACTION_MODEL) private readonly transactionModel: Model<Transaction>,
    private readonly filterService: TransactionFilterService,
    private readonly usersService: UsersService,
  ) {}

  async summary(query: TransactionFilterQuery): Promise<SummaryResponse> {
    const { filters, users } = await this.filterService.resolve(query);
    const [current, previous] = await Promise.all([
      this.totals(buildTransactionMatch(filters, users)),
      this.previousPeriodTotals(filters, users),
    ]);

    const netMinor = current.revenueMinor - current.expenseMinor;
    return {
      totalRevenue: fromMinorUnits(current.revenueMinor),
      totalExpense: fromMinorUnits(current.expenseMinor),
      net: fromMinorUnits(netMinor),
      pendingAmount: fromMinorUnits(current.pendingMinor),
      pendingCount: current.pendingCount,
      transactionCount: current.count,
      averageTransaction: fromMinorUnits(averageMinor(current)),
      deltas: previous
        ? {
            revenue: percentChange(current.revenueMinor, previous.revenueMinor),
            expense: percentChange(current.expenseMinor, previous.expenseMinor),
            net: percentChange(netMinor, previous.revenueMinor - previous.expenseMinor),
          }
        : { revenue: null, expense: null, net: null },
    };
  }

  async trends(query: TrendsQuery): Promise<TrendsResponse> {
    const { granularity } = query;
    const { filters, users } = await this.filterService.resolve(query);

    const buckets = await this.transactionModel
      .aggregate<PeriodTotals>([
        { $match: buildTransactionMatch(filters, users) },
        {
          $group: {
            _id: { $dateTrunc: dateTruncFor(granularity) },
            revenueMinor: sumWhenCategory('Revenue'),
            expenseMinor: sumWhenCategory('Expense'),
          },
        },
        { $sort: { _id: 1 } },
      ] as PipelineStage[])
      .exec();

    const totalsByPeriod = new Map(
      buckets.map((bucket) => [periodKey(bucket._id, granularity), bucket]),
    );
    const series = this.periodsToShow(filters, buckets, granularity).map((start) => {
      const period = periodKey(start, granularity);
      const bucket = totalsByPeriod.get(period);
      // A period with no transactions is a real zero, not a gap in the chart.
      const revenueMinor = bucket?.revenueMinor ?? 0;
      const expenseMinor = bucket?.expenseMinor ?? 0;
      return {
        period,
        revenue: fromMinorUnits(revenueMinor),
        expense: fromMinorUnits(expenseMinor),
        net: fromMinorUnits(revenueMinor - expenseMinor),
      };
    });

    return { granularity, series };
  }

  async breakdown(query: BreakdownQuery): Promise<BreakdownResponse> {
    const { dimension } = query;
    const { filters, users } = await this.filterService.resolve(query);

    const groups = await this.transactionModel
      .aggregate<GroupTotals>([
        { $match: buildTransactionMatch(filters, users) },
        {
          $group: {
            _id: groupKeyFor(dimension),
            revenueMinor: sumWhenCategory('Revenue'),
            expenseMinor: sumWhenCategory('Expense'),
            count: { $sum: 1 },
          },
        },
      ] as PipelineStage[])
      .exec();

    const describe = await this.groupDescriber(dimension, groups);
    const shares = percentageShares(groups.map((group) => group.revenueMinor + group.expenseMinor));
    const rows: BreakdownRow[] = groups.map((group, index) => ({
      ...describe(group._id),
      revenue: fromMinorUnits(group.revenueMinor),
      expense: fromMinorUnits(group.expenseMinor),
      net: fromMinorUnits(group.revenueMinor - group.expenseMinor),
      count: group.count,
      percentage: shares[index] ?? 0,
    }));

    return { dimension, data: sortRows(rows, dimension) };
  }

  private async totals(match: TransactionMatch): Promise<Totals> {
    const [totals] = await this.transactionModel
      .aggregate<Totals>([
        { $match: match },
        {
          $group: {
            _id: null,
            revenueMinor: sumWhenCategory('Revenue'),
            expenseMinor: sumWhenCategory('Expense'),
            pendingMinor: { $sum: { $cond: [{ $eq: ['$status', 'Pending'] }, '$amountMinor', 0] } },
            pendingCount: { $sum: { $cond: [{ $eq: ['$status', 'Pending'] }, 1, 0] } },
            count: { $sum: 1 },
          },
        },
      ])
      .exec();
    return totals ?? NO_TOTALS;
  }

  // "% vs previous period" only means something for a closed date range: Q1 compares with
  // the equally long window just before Q1. Without both dates there is nothing to compare.
  private async previousPeriodTotals(
    filters: TransactionFilters,
    users: ResolvedUserIds,
  ): Promise<Totals | null> {
    if (!filters.dateFrom || !filters.dateToExclusive) {
      return null;
    }
    const window = previousWindow({ from: filters.dateFrom, toExclusive: filters.dateToExclusive });
    const previousFilters = {
      ...filters,
      dateFrom: window.from,
      dateToExclusive: window.toExclusive,
    };
    return this.totals(buildTransactionMatch(previousFilters, users));
  }

  // Chart the filter's full date range when given (so a quiet March still shows up), otherwise
  // from the first to the last period that has data.
  private periodsToShow(
    filters: TransactionFilters,
    buckets: PeriodTotals[],
    granularity: Granularity,
  ): Date[] {
    const firstBucket = buckets[0]?._id;
    const lastBucket = buckets[buckets.length - 1]?._id;
    const from = filters.dateFrom ?? firstBucket;
    const until =
      filters.dateToExclusive ?? (lastBucket ? nextPeriod(lastBucket, granularity) : undefined);
    if (!from || !until) {
      return [];
    }

    const starts = listPeriodStarts(from, until, granularity, MAX_TREND_POINTS + 1);
    if (starts.length > MAX_TREND_POINTS) {
      throw new AppError(
        'VALIDATION_FAILED',
        `Too many ${granularity}s to chart; choose a shorter date range or a larger granularity`,
        HttpStatus.BAD_REQUEST,
        [{ field: 'granularity', message: `at most ${MAX_TREND_POINTS} points per chart` }],
      );
    }
    return starts;
  }

  /** Returns a function giving each group its key and human-readable label. */
  private async groupDescriber(
    dimension: BreakdownDimension,
    groups: GroupTotals[],
  ): Promise<(groupId: GroupTotals['_id']) => { key: string; label: string }> {
    if (dimension !== 'user') {
      return (groupId) => {
        const key = String(groupId);
        return { key, label: dimension === 'month' ? monthLabel(key) : key };
      };
    }

    const userIds = groups.map((group) => group._id as Types.ObjectId);
    const usersById = new Map(
      (await this.usersService.findByIds(userIds)).map((user) => [user._id.toString(), user]),
    );
    return (groupId) => {
      const user = usersById.get(String(groupId));
      return { key: user?.externalId ?? String(groupId), label: user?.name ?? 'Unknown user' };
    };
  }
}

function averageMinor(totals: Totals): number {
  if (totals.count === 0) {
    return 0;
  }
  // Rounded to a whole cent so the average is still an exact money amount.
  return Math.round((totals.revenueMinor + totals.expenseMinor) / totals.count);
}

function dateTruncFor(granularity: Granularity): Record<string, string> {
  const options: Record<string, string> = { date: '$date', unit: granularity, timezone: 'UTC' };
  if (granularity === 'week') {
    options.startOfWeek = 'monday';
  }
  return options;
}

function groupKeyFor(dimension: BreakdownDimension): string | object {
  switch (dimension) {
    case 'category':
      return '$category';
    case 'status':
      return '$status';
    case 'user':
      return '$user';
    case 'month':
      return { $dateToString: { format: '%Y-%m', date: '$date', timezone: 'UTC' } };
  }
}

/** "2024-03" becomes "Mar 2024". */
function monthLabel(key: string): string {
  return new Date(`${key}-01T00:00:00Z`).toLocaleString('en-US', {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

// Months read best in calendar order; everything else biggest first.
function sortRows(rows: BreakdownRow[], dimension: BreakdownDimension): BreakdownRow[] {
  if (dimension === 'month') {
    return [...rows].sort((a, b) => a.key.localeCompare(b.key));
  }
  const size = (row: BreakdownRow) => row.revenue + row.expense;
  return [...rows].sort((a, b) => size(b) - size(a) || a.key.localeCompare(b.key));
}
