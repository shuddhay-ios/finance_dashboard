import type { BreakdownResponse, SummaryResponse, TrendsResponse } from '@finance/shared';
import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  BreakdownQueryDto,
  BreakdownResponseDto,
  SummaryQueryDto,
  SummaryResponseDto,
  TrendsQueryDto,
  TrendsResponseDto,
} from './analytics.dto';
import { AnalyticsService } from './analytics.service';

// Every endpoint accepts the same filters as GET /transactions, so the cards and charts
// always describe exactly the rows in the table.
@ApiTags('analytics')
@ApiBearerAuth()
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('summary')
  @ApiOperation({ summary: 'Headline totals, with % change vs the previous equal-length period' })
  @ApiOkResponse({ type: SummaryResponseDto })
  summary(@Query() query: SummaryQueryDto): Promise<SummaryResponse> {
    return this.analyticsService.summary(query);
  }

  @Get('trends')
  @ApiOperation({ summary: 'Revenue and expense per day, week or month; empty periods are zero' })
  @ApiOkResponse({ type: TrendsResponseDto })
  trends(@Query() query: TrendsQueryDto): Promise<TrendsResponse> {
    return this.analyticsService.trends(query);
  }

  @Get('breakdown')
  @ApiOperation({ summary: 'Totals grouped by category, status, user or month' })
  @ApiOkResponse({ type: BreakdownResponseDto })
  breakdown(@Query() query: BreakdownQueryDto): Promise<BreakdownResponse> {
    return this.analyticsService.breakdown(query);
  }
}
