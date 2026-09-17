import type { TransactionFilterQuery } from '@finance/shared';
import { Injectable } from '@nestjs/common';
import type { Types } from 'mongoose';
import { UsersService } from '../users/users.service';
import type { ResolvedUserIds } from './build-transaction-match';
import { normalizeFilters, type TransactionFilters } from './transaction-filters';

export interface ResolvedFilters {
  filters: TransactionFilters;
  users: ResolvedUserIds;
}

/**
 * Prepares everything buildTransactionMatch needs. Transactions store a user's ObjectId,
 * but people filter by "user_001" and search by name, so those are looked up here first.
 * That keeps buildTransactionMatch itself pure.
 */
@Injectable()
export class TransactionFilterService {
  constructor(private readonly usersService: UsersService) {}

  async resolve(query: TransactionFilterQuery): Promise<ResolvedFilters> {
    const filters = normalizeFilters(query);
    const [filterUserIds, searchUserIds] = await Promise.all([
      this.resolveUserFilter(filters),
      this.resolveSearchUsers(filters),
    ]);
    return { filters, users: { filterUserIds, searchUserIds } };
  }

  private resolveUserFilter(filters: TransactionFilters): Promise<Types.ObjectId[] | null> {
    if (filters.userExternalIds.length === 0) {
      return Promise.resolve(null);
    }
    return this.usersService.findIdsByExternalIds(filters.userExternalIds);
  }

  private resolveSearchUsers(filters: TransactionFilters): Promise<Types.ObjectId[]> {
    if (!filters.search) {
      return Promise.resolve([]);
    }
    return this.usersService.findIdsMatching(filters.search);
  }
}
