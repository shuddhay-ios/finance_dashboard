import { type ErrorCode, type RefreshResponse, errorEnvelopeSchema } from '@finance/shared';

const API_BASE = '/api/v1';

/** A failed API call. `code` is one of the API's stable codes, or NETWORK_ERROR. */
export class ApiError extends Error {
  constructor(
    readonly code: ErrorCode | 'NETWORK_ERROR',
    message: string,
    readonly status: number | null,
    readonly details: unknown,
    readonly requestId: string | null,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// The access token lives only in this module's memory, never in localStorage, where any
// script injected into the page could read it. A page refresh loses it; the httpOnly
// refresh cookie gets a new one.
let accessToken: string | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

let handleSessionExpired: () => void = () => undefined;

/** Called when a token has expired and refreshing it failed: the user must log in again. */
export function onSessionExpired(handler: () => void): void {
  handleSessionExpired = handler;
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  query?: URLSearchParams;
}

/**
 * Calls the API with the access token attached. If the token has expired, it refreshes it
 * once and retries, so the user never notices.
 */
export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  let response = await send(path, options);

  if (await isExpiredTokenResponse(response)) {
    if (await refreshAccessToken()) {
      response = await send(path, options);
    } else {
      handleSessionExpired();
    }
  }

  return readBody<T>(response);
}

let refreshInFlight: Promise<boolean> | null = null;

/**
 * Swaps the refresh cookie for a new access token. When several requests expire at the
 * same moment they share ONE refresh call: sending the same refresh token twice would look
 * like token theft to the server, which would end the session.
 */
export function refreshAccessToken(): Promise<boolean> {
  refreshInFlight ??= performRefresh().finally(() => {
    refreshInFlight = null;
  });
  return refreshInFlight;
}

async function performRefresh(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/auth/refresh`, { method: 'POST' });
    if (!response.ok) {
      accessToken = null;
      return false;
    }
    const body = (await response.json()) as RefreshResponse;
    accessToken = body.accessToken;
    return true;
  } catch {
    return false;
  }
}

async function send(
  path: string,
  { method = 'GET', body, query }: RequestOptions,
): Promise<Response> {
  const headers: Record<string, string> = {};
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }
  // For FormData (file uploads) the browser sets Content-Type itself, including the boundary.
  if (body !== undefined && !(body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const queryString = query?.toString();
  const url = queryString ? `${API_BASE}${path}?${queryString}` : `${API_BASE}${path}`;

  try {
    return await fetch(url, {
      method,
      headers,
      body: encodeBody(body),
    });
  } catch {
    throw new ApiError('NETWORK_ERROR', 'Could not reach the server', null, null, null);
  }
}

function encodeBody(body: unknown): BodyInit | undefined {
  if (body === undefined) {
    return undefined;
  }
  return body instanceof FormData ? body : JSON.stringify(body);
}

async function isExpiredTokenResponse(response: Response): Promise<boolean> {
  if (response.status !== 401) {
    return false;
  }
  // clone(): the body can only be read once, and readBody still needs it.
  const body: unknown = await response
    .clone()
    .json()
    .catch(() => null);
  const envelope = errorEnvelopeSchema.safeParse(body);
  return envelope.success && envelope.data.code === 'AUTH_TOKEN_EXPIRED';
}

async function readBody<T>(response: Response): Promise<T> {
  if (response.status === 204) {
    // 204 means "no content"; callers of such endpoints ask for Promise<void>.
    return undefined as T;
  }

  const body: unknown = await response.json().catch(() => null);
  if (response.ok) {
    return body as T;
  }

  const envelope = errorEnvelopeSchema.safeParse(body);
  if (envelope.success) {
    const { code, message, details, requestId } = envelope.data;
    throw new ApiError(code, message, response.status, details, requestId);
  }
  throw new ApiError(
    'INTERNAL_ERROR',
    `Unexpected response (${response.status})`,
    response.status,
    null,
    null,
  );
}

/** Wraps anything thrown into an ApiError, so error display has one type to handle. */
export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) {
    return error;
  }
  return new ApiError('INTERNAL_ERROR', 'Something went wrong', null, null, null);
}
