import type { LoginResponse, MeResponse } from '@finance/shared';
import { useAlertChips } from '../../components/alert-chips/alert-chip-store';
import {
  apiRequest,
  onSessionExpired,
  refreshAccessToken,
  setAccessToken,
} from '../../lib/api-client';
import { queryClient } from '../../lib/query-client';
import { useAuthStore } from './auth-store';

/**
 * Runs once on page load. The access token was only in memory, so a refresh lost it; the
 * httpOnly refresh cookie survives, so it is swapped for a new token to stay logged in.
 */
export async function restoreSession(): Promise<void> {
  if (!(await refreshAccessToken())) {
    useAuthStore.getState().setAnonymous();
    return;
  }
  try {
    const { user } = await apiRequest<MeResponse>('/auth/me');
    useAuthStore.getState().setAuthenticated(user);
  } catch {
    useAuthStore.getState().setAnonymous();
  }
}

export async function logIn(email: string, password: string): Promise<void> {
  const { accessToken, user } = await apiRequest<LoginResponse>('/auth/login', {
    method: 'POST',
    body: { email, password },
  });
  setAccessToken(accessToken);
  useAuthStore.getState().setAuthenticated(user);
}

export async function logOut(): Promise<void> {
  try {
    await apiRequest<void>('/auth/logout', { method: 'POST' });
  } finally {
    endLocalSession();
  }
}

/** Forgets everything about the session in this tab: token, cached data, user. */
function endLocalSession(): void {
  setAccessToken(null);
  queryClient.clear();
  useAuthStore.getState().setAnonymous();
}

onSessionExpired(() => {
  endLocalSession();
  useAlertChips.getState().show({
    severity: 'error',
    message: 'Session ended for security. Please log in again',
  });
});
