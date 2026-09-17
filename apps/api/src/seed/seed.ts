import mongoose from 'mongoose';
import { z } from 'zod';
import { envSchema, parseWithSchema } from '../config/env';
import { loadEnvFileIfPresent } from '../config/load-env-file';
import { TRANSACTION_MODEL, transactionSchema } from '../transactions/transaction.schema';
import { USER_MODEL, userSchema } from '../users/user.schema';
import rawTransactions from './data/transactions.json';
import { runSeed } from './run-seed';

const seedEnvSchema = envSchema.pick({ MONGODB_URI: true }).extend({
  DEMO_PASSWORD: z.string().min(8, 'must be at least 8 characters'),
});

async function main(): Promise<void> {
  loadEnvFileIfPresent();
  const env = parseWithSchema(seedEnvSchema, process.env);

  const connection = await mongoose
    .createConnection(env.MONGODB_URI, { serverSelectionTimeoutMS: 5_000 })
    .asPromise();
  try {
    const result = await runSeed(
      {
        UserModel: connection.model(USER_MODEL, userSchema),
        TransactionModel: connection.model(TRANSACTION_MODEL, transactionSchema),
      },
      rawTransactions,
      env.DEMO_PASSWORD,
    );
    console.log(`Seeded ${result.users} users and ${result.transactions} transactions`);
  } finally {
    await connection.close();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
