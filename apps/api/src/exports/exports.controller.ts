import type { ExportTicketResponse } from '@finance/shared';
import { Body, Controller, Get, Logger, Param, Post, Res } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOperation,
  ApiProduces,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { type AuthenticatedUser, CurrentUser } from '../auth/current-user.decorator';
import { Public } from '../auth/public.decorator';
import { writeCsv } from './csv-writer';
import { ExportRequestDto, ExportTicketResponseDto } from './exports.dto';
import { ExportsService } from './exports.service';

@ApiTags('exports')
@Controller('exports')
export class ExportsController {
  // Nest's Logger forwards to pino once main.ts calls app.useLogger, so this is still JSON.
  private readonly logger = new Logger(ExportsController.name);

  constructor(private readonly exportsService: ExportsService) {}

  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Prepare a CSV export; returns a single-use link valid for 60 seconds' })
  @ApiCreatedResponse({ type: ExportTicketResponseDto })
  prepare(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: ExportRequestDto,
  ): Promise<ExportTicketResponse> {
    return this.exportsService.prepare(user.id, body);
  }

  // Public because the browser navigates here directly and can't send a bearer token.
  // The unguessable, single-use, 60-second token in the URL is the credential.
  @Public()
  @Get(':token/download')
  @ApiOperation({ summary: 'Download a prepared export (streamed CSV)' })
  @ApiProduces('text/csv')
  async download(@Param('token') token: string, @Res() response: Response): Promise<void> {
    const job = await this.exportsService.redeem(token);

    response.setHeader('Content-Type', 'text/csv; charset=utf-8');
    // "attachment" makes the browser save the file instead of showing it. The filename is
    // already reduced to safe characters, so it can't break out of the quotes.
    response.setHeader('Content-Disposition', `attachment; filename="${job.filename}"`);
    response.setHeader('Cache-Control', 'no-store');

    try {
      await writeCsv(this.exportsService.rows(job), job, response);
    } catch (error) {
      // Headers and part of the file are already sent, so no error envelope is possible.
      // Destroying the connection makes the browser report a failed download instead of
      // silently saving a truncated file.
      this.logger.error({ err: error, exportJobId: job._id.toString() }, 'CSV export failed');
      response.destroy();
    }
  }
}
