import { toApiError } from '../../lib/api-client';
import { chipMessage } from '../../lib/error-messages';
import { useAlertChips } from './alert-chip-store';

/** Shows a failed API call as a red chip. Network failures get a Retry button. */
export function reportError(error: unknown, retry?: () => void): void {
  const apiError = toApiError(error);
  const canRetry = apiError.code === 'NETWORK_ERROR' && retry !== undefined;

  useAlertChips.getState().show({
    severity: 'error',
    message: chipMessage(apiError),
    action: canRetry ? { label: 'Retry', onClick: retry } : undefined,
  });
}

export function reportSuccess(message: string): void {
  useAlertChips.getState().show({ severity: 'success', message });
}
