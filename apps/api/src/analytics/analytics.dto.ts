import {
  breakdownQuerySchema,
  breakdownResponseSchema,
  summaryResponseSchema,
  transactionFiltersSchema,
  trendsQuerySchema,
  trendsResponseSchema,
} from '@finance/shared';
import { createZodDto } from 'nestjs-zod';

export class SummaryQueryDto extends createZodDto(transactionFiltersSchema) {}
export class TrendsQueryDto extends createZodDto(trendsQuerySchema) {}
export class BreakdownQueryDto extends createZodDto(breakdownQuerySchema) {}

export class SummaryResponseDto extends createZodDto(summaryResponseSchema) {}
export class TrendsResponseDto extends createZodDto(trendsResponseSchema) {}
export class BreakdownResponseDto extends createZodDto(breakdownResponseSchema) {}
