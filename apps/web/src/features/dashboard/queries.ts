import type { BreakdownResponse, SummaryResponse, TrendsResponse } from '@finance/shared';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { apiRequest } from '../../lib/api-client';
import { type DashboardView, filterParams } from '../transactions/url-filters';

// All three send the same filterParams as the table, so every panel describes the same rows.

export function useSummary(view: DashboardView) {
  const params = filterParams(view);
  return useQuery({
    queryKey: ['summary', params.toString()],
    queryFn: () => apiRequest<SummaryResponse>('/analytics/summary', { query: params }),
    placeholderData: keepPreviousData,
  });
}

export function useTrends(view: DashboardView) {
  const params = filterParams(view);
  params.set('granularity', view.granularity);
  return useQuery({
    queryKey: ['trends', params.toString()],
    queryFn: () => apiRequest<TrendsResponse>('/analytics/trends', { query: params }),
    placeholderData: keepPreviousData,
  });
}

export function useBreakdown(view: DashboardView) {
  const params = filterParams(view);
  params.set('dimension', view.dimension);
  return useQuery({
    queryKey: ['breakdown', params.toString()],
    queryFn: () => apiRequest<BreakdownResponse>('/analytics/breakdown', { query: params }),
    placeholderData: keepPreviousData,
  });
}
