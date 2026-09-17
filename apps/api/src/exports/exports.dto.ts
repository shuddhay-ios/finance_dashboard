import {
  exportRequestSchema,
  exportTemplateListResponseSchema,
  exportTemplateRequestSchema,
  exportTemplateResponseSchema,
  exportTicketResponseSchema,
} from '@finance/shared';
import { createZodDto } from 'nestjs-zod';

export class ExportRequestDto extends createZodDto(exportRequestSchema) {}
export class ExportTicketResponseDto extends createZodDto(exportTicketResponseSchema) {}
export class ExportTemplateRequestDto extends createZodDto(exportTemplateRequestSchema) {}
export class ExportTemplateResponseDto extends createZodDto(exportTemplateResponseSchema) {}
export class ExportTemplateListResponseDto extends createZodDto(exportTemplateListResponseSchema) {}
