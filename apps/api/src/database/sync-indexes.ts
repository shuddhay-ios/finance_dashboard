import type { Connection, Schema } from 'mongoose';
import { SESSION_MODEL, sessionSchema } from '../auth/session.schema';
import { EXPORT_JOB_MODEL, exportJobSchema } from '../exports/export-job.schema';
import { EXPORT_TEMPLATE_MODEL, exportTemplateSchema } from '../exports/export-template.schema';
import { TRANSACTION_MODEL, transactionSchema } from '../transactions/transaction.schema';
import { AVATAR_MODEL, avatarSchema } from '../users/avatar.schema';
import { USER_MODEL, userSchema } from '../users/user.schema';

// Every collection the app uses. A new schema must be added here, or its indexes (unique
// rules, TTL clean-up) will silently not exist in production.
const MODELS: [name: string, schema: Schema][] = [
  [USER_MODEL, userSchema],
  [TRANSACTION_MODEL, transactionSchema],
  [SESSION_MODEL, sessionSchema],
  [EXPORT_JOB_MODEL, exportJobSchema],
  [EXPORT_TEMPLATE_MODEL, exportTemplateSchema],
  [AVATAR_MODEL, avatarSchema],
];

/**
 * Creates (and removes stale) indexes for every collection. The API starts with autoIndex
 * off, so this runs once per deploy as part of the seed step instead.
 */
export async function syncAllIndexes(connection: Connection): Promise<void> {
  for (const [name, schema] of MODELS) {
    const model = connection.models[name] ?? connection.model(name, schema);
    await model.syncIndexes();
  }
}
