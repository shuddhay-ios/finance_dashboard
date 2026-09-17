import type { TransactionListResponse, UserListResponse } from '@finance/shared';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { apiRequest } from '../../lib/api-client';
import { type DashboardView, listParams } from './url-filters';

export function useTransactions(view: DashboardView) {
  const params = listParams(view);
  return useQuery({
    // The key includes every parameter, so each filter combination is cached separately
    // and a slow response for an old filter can never overwrite the current one.
    queryKey: ['transactions', params.toString()],
    queryFn: () => apiRequest<TransactionListResponse>('/transactions', { query: params }),
    // Keep the previous page on screen while the next loads: no blank flash, no layout jump.
    placeholderData: keepPreviousData,
  });
}

export function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: () => apiRequest<UserListResponse>('/users'),
    // The list of people doesn't change while the dashboard is open.
    staleTime: Infinity,
  });
}
