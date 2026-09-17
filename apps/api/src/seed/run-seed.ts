import type { Model } from 'mongoose';
import { hashPassword } from '../auth/password';
import type { Transaction } from '../transactions/transaction.schema';
import type { User } from '../users/user.schema';
import { buildTransactionSeed, buildUserSeeds, rawTransactionsSchema } from './seed-data';

export interface SeedModels {
  UserModel: Model<User>;
  TransactionModel: Model<Transaction>;
}

export interface SeedResult {
  users: number;
  transactions: number;
}

/**
 * Loads the dataset. Safe to run any number of times: every write is an upsert keyed on
 * externalId, so a second run updates the same documents instead of adding copies.
 */
export async function runSeed(
  { UserModel, TransactionModel }: SeedModels,
  rawData: unknown,
  demoPassword: string,
): Promise<SeedResult> {
  const rawTransactions = rawTransactionsSchema.parse(rawData);

  // The app starts with autoIndex off, so this is where indexes get created.
  await UserModel.syncIndexes();
  await TransactionModel.syncIndexes();

  const userSeeds = buildUserSeeds(rawTransactions);
  const passwordHash = await hashPassword(demoPassword);
  await UserModel.bulkWrite(
    userSeeds.map((user) => ({
      updateOne: {
        filter: { externalId: user.externalId },
        // $setOnInsert only applies when the user is new, so re-seeding never quietly
        // changes an existing user's password. Profile fields are refreshed with $set.
        update: { $set: user, $setOnInsert: { passwordHash } },
        upsert: true,
      },
    })),
  );

  const savedUsers = await UserModel.find(
    { externalId: { $in: userSeeds.map((user) => user.externalId) } },
    { _id: 1, externalId: 1 },
  ).lean();
  const userIdByExternalId = new Map(
    savedUsers.map((user) => [user.externalId ?? '', user._id] as const),
  );

  const transactionSeeds = rawTransactions.map((raw) => {
    const seed = buildTransactionSeed(raw, userIdByExternalId);
    // bulkWrite skips schema validators, so validate explicitly: the integer-cents rule
    // is too important to rely on the conversion code alone.
    const validationError = new TransactionModel(seed).validateSync();
    if (validationError) {
      throw validationError;
    }
    return seed;
  });

  await TransactionModel.bulkWrite(
    transactionSeeds.map((transaction) => ({
      updateOne: {
        filter: { externalId: transaction.externalId },
        update: { $set: transaction },
        upsert: true,
      },
    })),
  );

  return { users: userSeeds.length, transactions: transactionSeeds.length };
}
