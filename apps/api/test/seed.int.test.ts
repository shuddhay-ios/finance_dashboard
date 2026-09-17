import { toMinorUnits } from '@finance/shared';
import argon2 from 'argon2';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose, { type Connection } from 'mongoose';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import rawTransactions from '../src/seed/data/transactions.json';
import { syncAllIndexes } from '../src/database/sync-indexes';
import { runSeed, type SeedModels } from '../src/seed/run-seed';
import { TRANSACTION_MODEL, transactionSchema } from '../src/transactions/transaction.schema';
import { USER_MODEL, userSchema } from '../src/users/user.schema';

const DEMO_PASSWORD = 'correct-horse-battery';

describe('runSeed', () => {
  let mongo: MongoMemoryServer;
  let connection: Connection;
  let models: SeedModels;

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    connection = await mongoose.createConnection(mongo.getUri()).asPromise();
    models = {
      UserModel: connection.model(USER_MODEL, userSchema),
      TransactionModel: connection.model(TRANSACTION_MODEL, transactionSchema),
    };
    await syncAllIndexes(connection);
    await runSeed(models, rawTransactions, DEMO_PASSWORD);
  });

  afterAll(async () => {
    await connection.close();
    await mongo.stop();
  });

  it('loads 4 users and 300 transactions', async () => {
    expect(await models.UserModel.countDocuments()).toBe(4);
    expect(await models.TransactionModel.countDocuments()).toBe(300);
  });

  it('is idempotent: a second run adds nothing and keeps passwords', async () => {
    const before = await models.UserModel.findOne({ externalId: 'user_001' }).select(
      '+passwordHash',
    );

    await runSeed(models, rawTransactions, 'a-different-password');

    const after = await models.UserModel.findOne({ externalId: 'user_001' }).select(
      '+passwordHash',
    );
    expect(await models.UserModel.countDocuments()).toBe(4);
    expect(await models.TransactionModel.countDocuments()).toBe(300);
    expect(after?.passwordHash).toBe(before?.passwordHash);
  });

  it('stores a verifiable argon2id hash, never the password itself', async () => {
    const user = await models.UserModel.findOne({ externalId: 'user_001' }).select('+passwordHash');

    expect(user?.passwordHash).toMatch(/^\$argon2id\$/);
    expect(await argon2.verify(user?.passwordHash ?? '', DEMO_PASSWORD)).toBe(true);
  });

  it('hides passwordHash from ordinary queries', async () => {
    const user = await models.UserModel.findOne({ externalId: 'user_001' }).lean();
    expect(user).not.toHaveProperty('passwordHash');
  });

  it('stores every amount as integer cents that add up exactly to the source file', async () => {
    const [totals] = await models.TransactionModel.aggregate<{ sum: number; nonIntegers: number }>([
      {
        $group: {
          _id: null,
          sum: { $sum: '$amountMinor' },
          nonIntegers: {
            $sum: { $cond: [{ $eq: ['$amountMinor', { $trunc: '$amountMinor' }] }, 0, 1] },
          },
        },
      },
    ]);
    const expectedSum = rawTransactions.reduce((sum, row) => sum + toMinorUnits(row.amount), 0);

    expect(totals?.nonIntegers).toBe(0);
    expect(totals?.sum).toBe(expectedSum);
  });

  it('creates the indexes the queries rely on', async () => {
    const indexes = await connection.collection('transactions').indexes();
    const keys = indexes.map((index) => JSON.stringify(index.key));

    expect(keys).toEqual(
      expect.arrayContaining([
        '{"externalId":1}',
        '{"date":-1,"_id":-1}',
        '{"category":1,"status":1,"date":-1}',
        '{"user":1,"date":-1}',
        '{"amountMinor":1,"_id":1}',
      ]),
    );
  });
});
