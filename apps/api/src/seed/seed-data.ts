import {
  type TransactionCategory,
  type TransactionStatus,
  TRANSACTION_CATEGORIES,
  TRANSACTION_STATUSES,
  toMinorUnits,
} from '@finance/shared';
import type { Types } from 'mongoose';
import { defaultAvatarUrl } from '../users/default-avatar';
import { z } from 'zod';

// Validates the provided file before anything touches the database: bad data should stop
// the seed with a clear message, not end up half-imported.
// `user_profile` is left out on purpose, so zod strips it: it is the same random-face URL
// on all 300 rows and identifies nobody.
const rawTransactionSchema = z.object({
  id: z.number().int().positive(),
  date: z.iso.datetime(),
  amount: z.number().positive(),
  category: z.enum(TRANSACTION_CATEGORIES),
  status: z.enum(TRANSACTION_STATUSES),
  user_id: z.string().regex(/^user_\d{3}$/),
});

export const rawTransactionsSchema = z.array(rawTransactionSchema);
export type RawTransaction = z.infer<typeof rawTransactionSchema>;

// The dataset only has user ids. These names are invented so the UI has people to show.
// Emails use example.com, a domain reserved so it can never reach a real inbox.
const DEMO_PROFILES: Record<string, { name: string; email: string }> = {
  user_001: { name: 'Priya Sharma', email: 'priya.sharma@example.com' },
  user_002: { name: 'Rohan Mehta', email: 'rohan.mehta@example.com' },
  user_003: { name: 'Ananya Iyer', email: 'ananya.iyer@example.com' },
  user_004: { name: 'Kabir Singh', email: 'kabir.singh@example.com' },
};

export interface UserSeed {
  externalId: string;
  name: string;
  email: string;
  avatarUrl: string;
  role: 'analyst';
}

export interface TransactionSeed {
  externalId: number;
  date: Date;
  amountMinor: number;
  currency: 'USD';
  category: TransactionCategory;
  status: TransactionStatus;
  user: Types.ObjectId;
}

export function buildUserSeeds(transactions: RawTransaction[]): UserSeed[] {
  const externalIds = [...new Set(transactions.map((transaction) => transaction.user_id))].sort();

  return externalIds.map((externalId) => {
    const profile = DEMO_PROFILES[externalId];
    if (!profile) {
      throw new Error(`No demo profile for ${externalId}; add one to DEMO_PROFILES`);
    }
    return {
      externalId,
      name: profile.name,
      email: profile.email,
      avatarUrl: defaultAvatarUrl(externalId),
      role: 'analyst',
    };
  });
}

export function buildTransactionSeed(
  raw: RawTransaction,
  userIdByExternalId: Map<string, Types.ObjectId>,
): TransactionSeed {
  const userId = userIdByExternalId.get(raw.user_id);
  if (!userId) {
    throw new Error(`Transaction ${raw.id} references unknown user ${raw.user_id}`);
  }
  return {
    externalId: raw.id,
    date: new Date(raw.date),
    amountMinor: toMinorUnits(raw.amount),
    currency: 'USD',
    category: raw.category,
    status: raw.status,
    user: userId,
  };
}
