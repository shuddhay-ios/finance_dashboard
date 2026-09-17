import type { ExportTemplateRequest, ExportTemplateResponse } from '@finance/shared';
import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { mongo, type Model } from 'mongoose';
import { AppError } from '../common/errors/app-error';
import {
  EXPORT_TEMPLATE_MODEL,
  type ExportTemplate,
  type ExportTemplateRecord,
} from './export-template.schema';

const DUPLICATE_KEY_ERROR = 11000;

@Injectable()
export class ExportTemplatesService {
  constructor(
    @InjectModel(EXPORT_TEMPLATE_MODEL) private readonly templateModel: Model<ExportTemplate>,
  ) {}

  async list(userId: string): Promise<ExportTemplateResponse[]> {
    const templates = await this.templateModel
      .find({ user: userId })
      .sort({ name: 1 })
      .lean<ExportTemplateRecord[]>()
      .exec();
    return templates.map(toTemplateResponse);
  }

  async create(userId: string, request: ExportTemplateRequest): Promise<ExportTemplateResponse> {
    try {
      const created = await this.templateModel.create({ ...request, user: userId });
      return toTemplateResponse(created.toObject<ExportTemplateRecord>());
    } catch (error) {
      // The unique index on (user, name) is the real guard; this turns its error into a
      // message the user can act on, instead of a 500.
      if (error instanceof mongo.MongoServerError && error.code === DUPLICATE_KEY_ERROR) {
        throw new AppError(
          'VALIDATION_FAILED',
          'A template with this name already exists',
          HttpStatus.BAD_REQUEST,
          [{ field: 'name', message: 'a template with this name already exists' }],
        );
      }
      throw error;
    }
  }
}

function toTemplateResponse(template: ExportTemplateRecord): ExportTemplateResponse {
  return {
    id: template._id.toString(),
    name: template.name,
    columns: template.columns,
    dateFormat: template.dateFormat,
    delimiter: template.delimiter,
    includeHeaders: template.includeHeaders,
  };
}
