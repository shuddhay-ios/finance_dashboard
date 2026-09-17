import type { ExportTemplateListResponse, ExportTemplateResponse } from '@finance/shared';
import { Body, Controller, Get, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { type AuthenticatedUser, CurrentUser } from '../auth/current-user.decorator';
import { ExportTemplatesService } from './export-templates.service';
import {
  ExportTemplateListResponseDto,
  ExportTemplateRequestDto,
  ExportTemplateResponseDto,
} from './exports.dto';

@ApiTags('exports')
@ApiBearerAuth()
@Controller('export-templates')
export class ExportTemplatesController {
  constructor(private readonly templatesService: ExportTemplatesService) {}

  @Get()
  @ApiOperation({ summary: "The logged-in user's saved export templates" })
  @ApiOkResponse({ type: ExportTemplateListResponseDto })
  async list(@CurrentUser() user: AuthenticatedUser): Promise<ExportTemplateListResponse> {
    return { data: await this.templatesService.list(user.id) };
  }

  @Post()
  @ApiOperation({ summary: 'Save a column layout as a template' })
  @ApiCreatedResponse({ type: ExportTemplateResponseDto })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: ExportTemplateRequestDto,
  ): Promise<ExportTemplateResponse> {
    return this.templatesService.create(user.id, body);
  }
}
