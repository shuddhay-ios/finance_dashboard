import { AVATAR_CONTENT_TYPES } from '@finance/shared';
import { type InferSchemaType, Schema } from 'mongoose';
import { USER_MODEL } from './user.schema';

export const AVATAR_MODEL = 'UserAvatar';

/**
 * Uploaded profile photos. Stored in MongoDB rather than on disk because the hosting
 * platform's disk is wiped on every deploy. Kept apart from `users` so ordinary user
 * lookups never load image bytes.
 */
export const avatarSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: USER_MODEL, required: true },
    contentType: { type: String, enum: AVATAR_CONTENT_TYPES, required: true },
    data: { type: Buffer, required: true },
  },
  { timestamps: true, collection: 'user_avatars' },
);

// One photo per user; uploading again replaces it.
avatarSchema.index({ user: 1 }, { unique: true });

export type Avatar = InferSchemaType<typeof avatarSchema>;
