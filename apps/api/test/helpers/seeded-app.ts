import type { LoginResponse } from '@finance/shared';
import { getConnectionToken, getModelToken } from '@nestjs/mongoose';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { MongoMemoryServer } from 'mongodb-memory-server';
import type { Server } from 'node:http';
import request from 'supertest';
import rawTransactions from '../../src/seed/data/transactions.json';
import { syncAllIndexes } from '../../src/database/sync-indexes';
import { runSeed } from '../../src/seed/run-seed';
import { TRANSACTION_MODEL } from '../../src/transactions/transaction.schema';
import { USER_MODEL } from '../../src/users/user.schema';
import { createTestApp, testEnv } from './test-app';

const DEMO_PASSWORD = 'Analyst@2024';

export interface SeededApp {
  app: NestExpressApplication;
  server: Server;
  mongo: MongoMemoryServer;
  accessToken: string;
}

/** A running app loaded with the real 300-transaction dataset and a logged-in user. */
export async function startSeededApp(): Promise<SeededApp> {
  const mongo = await MongoMemoryServer.create();
  const app = await createTestApp(testEnv(mongo.getUri()));
  await syncAllIndexes(app.get(getConnectionToken()));
  await runSeed(
    {
      UserModel: app.get(getModelToken(USER_MODEL)),
      TransactionModel: app.get(getModelToken(TRANSACTION_MODEL)),
    },
    rawTransactions,
    DEMO_PASSWORD,
  );

  const server = app.getHttpServer();
  const login = await request(server)
    .post('/api/v1/auth/login')
    .send({ email: 'priya.sharma@example.com', password: DEMO_PASSWORD })
    .expect(200);

  return { app, server, mongo, accessToken: (login.body as LoginResponse).accessToken };
}

export async function stopSeededApp({ app, mongo }: SeededApp): Promise<void> {
  await app.close();
  await mongo.stop();
}

/** Query string with repeated keys (?status=Paid&status=Pending), as a browser sends them. */
export function queryString(params: [string, string][]): string {
  return new URLSearchParams(params).toString();
}

/** The dataset as the tests' independent source of truth, with amounts in cents. */
export const DATASET = rawTransactions.map((row) => ({
  ...row,
  amountMinor: Math.round(row.amount * 100),
  time: Date.parse(row.date),
}));
