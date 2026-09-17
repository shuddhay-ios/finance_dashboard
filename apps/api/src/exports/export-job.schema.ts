import { DATE_FORMATS, DELIMITERS, EXPORT_COLUMN_KEYS } from '@finance/shared';
import { type InferSchemaType, Schema, type Types } from 'mongoose';
import { USER_MODEL } from '../users/user.schema';

export const EXPORT_JOB_MODEL = 'ExportJob';

/**
 * A prepared export waiting to be downloaded. POST /exports stores the configuration here
 * and hands back a download token; the download link carries only that token.
 */
export const exportJobSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: USER_MODEL, required: true },
    // SHA-256 of the download token; the token itself is never stored.
    tokenHash: { type: String, required: true },
    columns: { type: [{ type: String, enum: EXPORT_COLUMN_KEYS }], required: true },
    dateFormat: { type: String, enum: DATE_FORMATS, required: true },
    delimiter: { type: String, enum: DELIMITERS, required: true },
    includeHeaders: { type: Boolean, required: true },
    // The validated filter object, exactly as the table would send it.
    filters: { type: Schema.Types.Mixed, default: {} },
    filename: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    // Set when the file is downloaded. A token whose usedAt is set can't be used again.
    usedAt: { type: Date, default: null },
  },
  { timestamps: true, collection: 'export_jobs', minimize: false },
);

// The download looks its job up by token hash.
exportJobSchema.index({ tokenHash: 1 }, { unique: true });
// TTL index: MongoDB deletes jobs by itself once they've expired.
exportJobSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export type ExportJob = InferSchemaType<typeof exportJobSchema>;

/** A job as read back from the database, with the untyped filters marked as unknown. */
export type ExportJobRecord = Omit<ExportJob, 'filters'> & {
  _id: Types.ObjectId;
  filters: unknown;
};
