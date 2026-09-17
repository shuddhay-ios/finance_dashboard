import { type InferSchemaType, Schema } from 'mongoose';
import { CURRENCIES, TRANSACTION_CATEGORIES, TRANSACTION_STATUSES } from '@finance/shared';
import { USER_MODEL } from '../users/user.schema';

export const TRANSACTION_MODEL = 'Transaction';

export const transactionSchema = new Schema(
  {
    // The dataset's own id (1-300). MongoDB generates _id; keeping this separately lets
    // the seed find a row again, and lets users search by the id they know.
    externalId: { type: Number, required: true },
    date: { type: Date, required: true },
    // Money in cents as an integer: 1200.50 is stored as 120050. Always a positive size;
    // `category` alone says whether money came in or went out, so direction has one source of truth.
    amountMinor: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        // isSafeInteger, not isInteger: past 2^53 a JS number can't hold every integer exactly.
        validator: Number.isSafeInteger,
        message: 'amountMinor must be a whole number of minor units',
      },
    },
    currency: { type: String, enum: CURRENCIES, required: true, default: 'USD' },
    category: { type: String, enum: TRANSACTION_CATEGORIES, required: true },
    status: { type: String, enum: TRANSACTION_STATUSES, required: true },
    user: { type: Schema.Types.ObjectId, ref: USER_MODEL, required: true },
  },
  { timestamps: true, collection: 'transactions' },
);

// The seed upserts on this, so running it twice updates rows instead of duplicating them.
transactionSchema.index({ externalId: 1 }, { unique: true });
// Default list order (newest first) and date-range filters. _id breaks ties so every page
// sorts identically and no row appears on two pages.
transactionSchema.index({ date: -1, _id: -1 });
// The most common combined filter: category + status, still newest first.
transactionSchema.index({ category: 1, status: 1, date: -1 });
// Filtering by user, and the "by user" breakdown chart.
transactionSchema.index({ user: 1, date: -1 });
// Amount-range filter and sorting by amount. 31 amounts repeat in the dataset, hence _id.
transactionSchema.index({ amountMinor: 1, _id: 1 });

export type Transaction = InferSchemaType<typeof transactionSchema>;
