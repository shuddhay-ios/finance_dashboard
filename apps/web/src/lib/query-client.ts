import { QueryCache, QueryClient } from '@tanstack/react-query';
import { reportError } from '../components/alert-chips/report-error';
import { toApiError } from './api-client';

// Codes that mean "the session is over". The session-expired handler already shows one
// chip and sends the user to login, so individual queries stay quiet about these.
const SESSION_CODES = new Set(['AUTH_TOKEN_EXPIRED', 'AUTH_TOKEN_INVALID', 'AUTH_REFRESH_REUSED']);

export const queryClient = new QueryClient({
  // Every failed query raises a chip, so nothing on the dashboard fails silently.
  queryCache: new QueryCache({
    onError: (error, query) => {
      if (SESSION_CODES.has(toApiError(error).code)) {
        return;
      }
      reportError(error, () => void query.fetch());
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      // Retrying a 400 or 401 gives the same answer. Only a network blip is worth one retry.
      retry: (failureCount, error) =>
        toApiError(error).code === 'NETWORK_ERROR' && failureCount < 1,
    },
  },
});
