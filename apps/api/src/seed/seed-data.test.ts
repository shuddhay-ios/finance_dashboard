import { Types } from 'mongoose';
import { describe, expect, it } from 'vitest';
import {
  type RawTransaction,
  buildTransactionSeed,
  buildUserSeeds,
  rawTransactionsSchema,
} from './seed-data';

function rawTransaction(overrides: Partial<RawTransaction> = {}): RawTransaction {
  return {
    id: 2,
    date: '2024-02-21T11:14:38Z',
    amount: 1200.5,
    category: 'Expense',
    status: 'Paid',
    user_id: 'user_002',
    ...overrides,
  };
}

describe('rawTransactionsSchema', () => {
  it('drops the meaningless user_profile field', () => {
    const [parsed] = rawTransactionsSchema.parse([
      { ...rawTransaction(), user_profile: 'https://thispersondoesnotexist.com/' },
    ]);
    expect(parsed).not.toHaveProperty('user_profile');
  });

  it('rejects a category outside the known set', () => {
    const result = rawTransactionsSchema.safeParse([{ ...rawTransaction(), category: 'Refund' }]);
    expect(result.success).toBe(false);
  });
});

describe('buildUserSeeds', () => {
  it('creates one user per distinct user_id, in a stable order', () => {
    const users = buildUserSeeds([
      rawTransaction({ user_id: 'user_002' }),
      rawTransaction({ user_id: 'user_001' }),
      rawTransaction({ user_id: 'user_002' }),
    ]);

    expect(users.map((user) => user.externalId)).toEqual(['user_001', 'user_002']);
    expect(users[0]?.avatarUrl).toBe('https://api.dicebear.com/9.x/notionists/svg?seed=user_001');
  });

  it('fails loudly for a user it has no profile for', () => {
    expect(() => buildUserSeeds([rawTransaction({ user_id: 'user_999' })])).toThrow(/user_999/);
  });
});

describe('buildTransactionSeed', () => {
  it('stores the amount as integer cents and links the user', () => {
    const userId = new Types.ObjectId();

    const seed = buildTransactionSeed(rawTransaction(), new Map([['user_002', userId]]));

    expect(seed.amountMinor).toBe(120050);
    expect(seed.user).toBe(userId);
    expect(seed.date.toISOString()).toBe('2024-02-21T11:14:38.000Z');
  });

  it('refuses a transaction whose user was not seeded', () => {
    expect(() => buildTransactionSeed(rawTransaction(), new Map())).toThrow(/unknown user/);
  });
});
