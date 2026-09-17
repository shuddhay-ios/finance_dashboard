import type { SortField, TransactionListQuery } from '@finance/shared';
import type { PipelineStage } from 'mongoose';
import { USER_COLLECTION } from '../users/user.schema';
import type { TransactionMatch } from './build-transaction-match';

// Where each sortable column lives in a transaction document. "user" is missing on
// purpose: the name lives in another collection (see below).
const SORT_PATHS: Record<Exclude<SortField, 'user'>, string> = {
  date: 'date',
  amount: 'amountMinor',
  category: 'category',
  status: 'status',
};

const JOIN_USER: PipelineStage[] = [
  {
    $lookup: {
      from: USER_COLLECTION,
      localField: 'user',
      foreignField: '_id',
      as: 'user',
      // Only public fields are copied in, so passwordHash can't leak through this join.
      pipeline: [{ $project: { name: 1, email: 1, externalId: 1, avatarUrl: 1 } }],
    },
  },
  { $unwind: '$user' },
];

/**
 * One page of transactions. Sorting always adds _id as a tiebreaker, so rows with equal
 * values (31 amounts repeat) come back in the same order on every page.
 */
export function buildListPipeline(
  match: TransactionMatch,
  {
    page,
    limit,
    sortBy,
    sortDir,
  }: Pick<TransactionListQuery, 'page' | 'limit' | 'sortBy' | 'sortDir'>,
): PipelineStage[] {
  const direction = sortDir === 'asc' ? 1 : -1;
  const pageStages: PipelineStage[] = [{ $skip: (page - 1) * limit }, { $limit: limit }];

  if (sortBy === 'user') {
    // Sorting by name needs the name, so every matching row is joined before sorting.
    return [
      { $match: match },
      ...JOIN_USER,
      { $sort: { 'user.name': direction, _id: direction } },
      ...pageStages,
    ];
  }

  // Every other column is on the transaction itself and has an index, so MongoDB sorts and
  // cuts the page first, then joins users for just those rows (25, not all 300).
  return [
    { $match: match },
    { $sort: { [SORT_PATHS[sortBy]]: direction, _id: direction } },
    ...pageStages,
    ...JOIN_USER,
  ];
}
