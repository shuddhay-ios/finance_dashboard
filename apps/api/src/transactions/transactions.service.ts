import {
  type Currency,
  type TransactionCategory,
  type TransactionListQuery,
  type TransactionListResponse,
  type TransactionResponse,
  type TransactionStatus,
  fromMinorUnits,
} from '@finance/shared';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model, Types } from 'mongoose';
import { buildTransactionMatch } from './build-transaction-match';
import { buildListPipeline } from './list-pipeline';
import { TransactionFilterService } from './transaction-filter.service';
import { TRANSACTION_MODEL, type Transaction } from './transaction.schema';

/** A transaction row as the list pipeline returns it, with its user joined in. */
export interface TransactionWithUser {
  _id: Types.ObjectId;
  externalId: number;
  date: Date;
  amountMinor: number;
  currency: Currency;
  category: TransactionCategory;
  status: TransactionStatus;
  user: {
    _id: Types.ObjectId;
    externalId?: string | null;
    name: string;
    email: string;
    avatarUrl: string;
  };
}

@Injectable()
export class TransactionsService {
  constructor(
    @InjectModel(TRANSACTION_MODEL) private readonly transactionModel: Model<Transaction>,
    private readonly filterService: TransactionFilterService,
  ) {}

  async list(query: TransactionListQuery): Promise<TransactionListResponse> {
    const { filters, users } = await this.filterService.resolve(query);
    const match = buildTransactionMatch(filters, users);

    // The page and the total are independent, so both queries run at the same time.
    const [rows, total] = await Promise.all([
      this.transactionModel.aggregate<TransactionWithUser>(buildListPipeline(match, query)).exec(),
      this.transactionModel.countDocuments(match).exec(),
    ]);

    return {
      data: rows.map(toTransactionResponse),
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    };
  }
}

export function toTransactionResponse(row: TransactionWithUser): TransactionResponse {
  return {
    id: row._id.toString(),
    externalId: row.externalId,
    date: row.date.toISOString(),
    amount: fromMinorUnits(row.amountMinor),
    currency: row.currency,
    category: row.category,
    status: row.status,
    user: {
      id: row.user._id.toString(),
      externalId: row.user.externalId ?? null,
      name: row.user.name,
      email: row.user.email,
      avatarUrl: row.user.avatarUrl,
    },
  };
}
