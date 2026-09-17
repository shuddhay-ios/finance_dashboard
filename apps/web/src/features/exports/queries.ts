import type {
  ExportRequest,
  ExportTemplateListResponse,
  ExportTemplateRequest,
  ExportTemplateResponse,
  ExportTicketResponse,
  TransactionFilterQuery,
  TransactionListResponse,
} from '@finance/shared';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../../lib/api-client';

export const PREVIEW_ROWS = 5;

function toQuery(filters: TransactionFilterQuery): URLSearchParams {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    for (const item of Array.isArray(value) ? value : [value]) {
      params.append(key, String(item));
    }
  }
  return params;
}

/**
 * The first rows of the export and the total row count, in one request. Sorted like the
 * export itself (newest first), so the preview really is the top of the file.
 */
export function useExportPreview(filters: TransactionFilterQuery, enabled: boolean) {
  const params = toQuery(filters);
  params.set('limit', String(PREVIEW_ROWS));
  params.set('sortBy', 'date');
  params.set('sortDir', 'desc');

  return useQuery({
    queryKey: ['export-preview', params.toString()],
    queryFn: () => apiRequest<TransactionListResponse>('/transactions', { query: params }),
    enabled,
    placeholderData: keepPreviousData,
  });
}

export function useExportTemplates(enabled: boolean) {
  return useQuery({
    queryKey: ['export-templates'],
    queryFn: () => apiRequest<ExportTemplateListResponse>('/export-templates'),
    enabled,
  });
}

export function useSaveTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (template: ExportTemplateRequest) =>
      apiRequest<ExportTemplateResponse>('/export-templates', { method: 'POST', body: template }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['export-templates'] }),
  });
}

export function usePrepareExport() {
  return useMutation({
    mutationFn: (request: ExportRequest) =>
      apiRequest<ExportTicketResponse>('/exports', { method: 'POST', body: request }),
  });
}
