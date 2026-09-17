import { DATE_FORMATS, DELIMITERS, EXPORT_COLUMN_KEYS } from '@finance/shared';
import { type InferSchemaType, Schema, type Types } from 'mongoose';
import { USER_MODEL } from '../users/user.schema';

export const EXPORT_TEMPLATE_MODEL = 'ExportTemplate';

/** A column layout a user saved to reuse, next to the built-in presets. */
export const exportTemplateSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: USER_MODEL, required: true },
    name: { type: String, required: true, trim: true },
    columns: { type: [{ type: String, enum: EXPORT_COLUMN_KEYS }], required: true },
    dateFormat: { type: String, enum: DATE_FORMATS, required: true },
    delimiter: { type: String, enum: DELIMITERS, required: true },
    includeHeaders: { type: Boolean, required: true },
  },
  { timestamps: true, collection: 'export_templates' },
);

// Lists a user's templates, and stops one user saving two templates with the same name.
exportTemplateSchema.index({ user: 1, name: 1 }, { unique: true });

export type ExportTemplate = InferSchemaType<typeof exportTemplateSchema>;
export type ExportTemplateRecord = ExportTemplate & { _id: Types.ObjectId };
