import { type InferSchemaType, Schema } from 'mongoose';
import { USER_MODEL } from '../users/user.schema';

export const SESSION_MODEL = 'Session';

// Why a refresh token stopped working. "rotated" is the one that matters: seeing a
// rotated token again means someone is replaying an old, possibly stolen, token.
export const REVOKE_REASONS = ['rotated', 'logout', 'reuse_detected'] as const;
export type RevokeReason = (typeof REVOKE_REASONS)[number];

// One document per refresh token ever issued.
export const sessionSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: USER_MODEL, required: true },
    // Every token that descends from one login shares a familyId. Reuse detection
    // revokes the whole family, which logs out both the attacker and the real user.
    familyId: { type: String, required: true },
    // SHA-256 of the token. The raw token only ever exists in the user's cookie, so a
    // leaked sessions collection can't be replayed.
    tokenHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date, default: null },
    revokedReason: { type: String, enum: REVOKE_REASONS, default: null },
    userAgent: { type: String, default: null },
    ip: { type: String, default: null },
  },
  { timestamps: true, collection: 'sessions' },
);

// Every refresh request looks its token up by hash.
sessionSchema.index({ tokenHash: 1 }, { unique: true });
// Logout and reuse detection revoke a whole family at once.
sessionSchema.index({ familyId: 1 });
// TTL index: MongoDB deletes each session by itself once expiresAt has passed.
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export type Session = InferSchemaType<typeof sessionSchema>;
