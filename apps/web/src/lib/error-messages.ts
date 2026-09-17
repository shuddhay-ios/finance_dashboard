import type { ApiError } from './api-client';

interface FieldProblem {
  field: string;
  message: string;
}

function isFieldProblemList(details: unknown): details is FieldProblem[] {
  return (
    Array.isArray(details) &&
    details.every(
      (item) => typeof item === 'object' && item !== null && 'field' in item && 'message' in item,
    )
  );
}

/**
 * The text shown in an alert chip. It is chosen by the API's stable error code, never taken
 * from a raw server message, so users don't see internals and wording can change here
 * without touching the backend.
 */
export function chipMessage(error: ApiError): string {
  switch (error.code) {
    case 'AUTH_INVALID_CREDENTIALS':
      return 'Invalid email or password';
    case 'AUTH_TOKEN_EXPIRED':
      return 'Session expired — signing you back in';
    case 'AUTH_TOKEN_INVALID':
    case 'AUTH_REFRESH_REUSED':
      return 'Session ended for security. Please log in again';
    case 'VALIDATION_FAILED': {
      const [first] = isFieldProblemList(error.details) ? error.details : [];
      return first ? `Check your filters — ${first.field}: ${first.message}` : 'Check your filters';
    }
    case 'RATE_LIMITED':
      return 'Too many attempts. Try again in a minute';
    case 'EXPORT_NO_ROWS':
      return 'No transactions match these filters';
    case 'EXPORT_TOKEN_INVALID':
      return 'Download link expired. Please export again';
    case 'NOT_FOUND':
      return 'That item no longer exists';
    case 'SERVICE_UNAVAILABLE':
      return 'The service is temporarily unavailable. Try again shortly';
    case 'NETWORK_ERROR':
      return "Can't reach the server. Check your connection";
    case 'REQUEST_FAILED':
      return 'The request could not be completed';
    case 'INTERNAL_ERROR':
      return `Something went wrong (ref: ${error.requestId ?? 'unknown'})`;
  }
}
