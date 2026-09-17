import { transactionListQuerySchema, transactionListResponseSchema } from '@finance/shared';
import { createZodDto } from 'nestjs-zod';

export class TransactionListQueryDto extends createZodDto(transactionListQuerySchema) {}
export class TransactionListResponseDto extends createZodDto(transactionListResponseSchema) {}
