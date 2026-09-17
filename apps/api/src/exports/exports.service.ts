import {
  type ExportRequest,
  type ExportTicketResponse,
  type TransactionResponse,
  resolveExportFilename,
  transactionFiltersSchema,
} from '@finance/shared';
import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model, PipelineStage } from 'mongoose';
import { AppError } from '../common/errors/app-error';
import { generateOpaqueToken, hashOpaqueToken } from '../common/opaque-token';
import { buildTransactionMatch } from '../transactions/build-transaction-match';
import { JOIN_USER } from '../transactions/list-pipeline';
import { TransactionFilterService } from '../transactions/transaction-filter.service';
import { TRANSACTION_MODEL, type Transaction } from '../transactions/transaction.schema';
import {
  type TransactionWithUser,
  toTransactionResponse,
} from '../transactions/transactions.service';
import { EXPORT_JOB_MODEL, type ExportJob, type ExportJobRecord } from './export-job.schema';

// Long enough for the browser to follow the link straight away, too short to be worth stealing.
export const DOWNLOAD_TOKEN_TTL_MS = 60_000;

/**
 * Two steps, because a browser can't attach an Authorization header when it simply
 * navigates to a URL:
 * 1. POST /exports (logged in) saves the configuration and returns a short-lived,
 *    single-use download token.
 * 2. The browser navigates to /exports/:token/download. The server streams the file and
 *    the browser saves it natively, with the filename from Content-Disposition.
 */
@Injectable()
export class ExportsService {
  constructor(
    @InjectModel(TRANSACTION_MODEL) private readonly transactionModel: Model<Transaction>,
    @InjectModel(EXPORT_JOB_MODEL) private readonly exportJobModel: Model<ExportJob>,
    private readonly filterService: TransactionFilterService,
  ) {}

  async prepare(userId: string, request: ExportRequest): Promise<ExportTicketResponse> {
    const { filters, users } = await this.filterService.resolve(request.filters);
    const estimatedRows = await this.transactionModel
      .countDocuments(buildTransactionMatch(filters, users))
      .exec();
    // Refuse up front rather than download a file with nothing in it.
    if (estimatedRows === 0) {
      throw new AppError(
        'EXPORT_NO_ROWS',
        'No transactions match these filters',
        HttpStatus.BAD_REQUEST,
      );
    }

    const downloadToken = generateOpaqueToken();
    const expiresAt = new Date(Date.now() + DOWNLOAD_TOKEN_TTL_MS);
    const filename = resolveExportFilename(request.filenameTemplate, request.filters, new Date());

    await this.exportJobModel.create({
      user: userId,
      tokenHash: hashOpaqueToken(downloadToken),
      columns: request.columns,
      dateFormat: request.dateFormat,
      delimiter: request.delimiter,
      includeHeaders: request.includeHeaders,
      filters: request.filters,
      filename,
      expiresAt,
    });

    return {
      downloadToken,
      expiresAt: expiresAt.toISOString(),
      estimatedRows,
      resolvedFilename: filename,
    };
  }

  /** Uses up a download token and returns its job. Throws if the token can't be used. */
  async redeem(downloadToken: string): Promise<ExportJobRecord> {
    // One atomic update: it only matches an unused, unexpired token and marks it used in the
    // same step, so two requests racing with the same link can't both get the file.
    const job = await this.exportJobModel
      .findOneAndUpdate(
        {
          tokenHash: hashOpaqueToken(downloadToken),
          usedAt: null,
          expiresAt: { $gt: new Date() },
        },
        { usedAt: new Date() },
        { new: true },
      )
      .lean<ExportJobRecord>()
      .exec();

    if (!job) {
      throw new AppError(
        'EXPORT_TOKEN_INVALID',
        'Download link is invalid, expired or already used',
        HttpStatus.UNAUTHORIZED,
      );
    }
    return job;
  }

  /** The job's rows, one at a time from a database cursor, never all in memory at once. */
  async *rows(job: ExportJobRecord): AsyncGenerator<TransactionResponse> {
    // Filters were validated when the job was created; parsing again gives them their types.
    const { filters, users } = await this.filterService.resolve(
      transactionFiltersSchema.parse(job.filters),
    );
    const pipeline: PipelineStage[] = [
      { $match: buildTransactionMatch(filters, users) },
      // Same default order as the table: newest first, _id breaking ties.
      { $sort: { date: -1, _id: -1 } },
      ...JOIN_USER,
    ];

    const cursor = this.transactionModel
      .aggregate<TransactionWithUser>(pipeline)
      .cursor<TransactionWithUser>();
    for await (const row of cursor) {
      yield toTransactionResponse(row);
    }
  }
}
