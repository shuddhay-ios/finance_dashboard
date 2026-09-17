import type { TransactionListResponse } from '@finance/shared';
import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { TransactionListQueryDto, TransactionListResponseDto } from './transactions.dto';
import { TransactionsService } from './transactions.service';

@ApiTags('transactions')
@ApiBearerAuth()
@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Get()
  @ApiOperation({ summary: 'Filter, search, sort and paginate transactions' })
  @ApiOkResponse({ type: TransactionListResponseDto })
  list(@Query() query: TransactionListQueryDto): Promise<TransactionListResponse> {
    return this.transactionsService.list(query);
  }
}
