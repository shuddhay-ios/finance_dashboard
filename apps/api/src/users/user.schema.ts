import { type InferSchemaType, Schema } from 'mongoose';
import { USER_ROLES } from '@finance/shared';

export const USER_MODEL = 'User';

export const userSchema = new Schema(
  {
    // "user_001" from the dataset. Optional because a login-only account may own no transactions.
    externalId: { type: String, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    // select: false means queries leave this out unless they ask for '+passwordHash'.
    // Only the login check should ever need it.
    passwordHash: { type: String, required: true, select: false },
    name: { type: String, required: true, trim: true },
    avatarUrl: { type: String, required: true },
    role: { type: String, enum: USER_ROLES, required: true, default: 'analyst' },
  },
  { timestamps: true, collection: 'users' },
);

// Login looks users up by email; unique also stops two accounts sharing one address.
userSchema.index({ email: 1 }, { unique: true });
// The seed upserts by externalId. Sparse so many users *without* one don't collide on null.
userSchema.index({ externalId: 1 }, { unique: true, sparse: true });

export type User = InferSchemaType<typeof userSchema>;
