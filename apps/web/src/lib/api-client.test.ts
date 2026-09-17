import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, apiRequest, onSessionExpired, setAccessToken } from './api-client';

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function urlOf(input: Parameters<typeof fetch>[0]): string {
  if (typeof input === 'string') {
    return input;
  }
  return input instanceof URL ? input.href : input.url;
}

const expired = () =>
  json(401, { code: 'AUTH_TOKEN_EXPIRED', message: 'expired', details: null, requestId: 'r1' });

describe('apiRequest', () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    setAccessToken('old-token');
  });

  afterEach(() => {
    fetchMock.mockReset();
    vi.unstubAllGlobals();
  });

  it('sends the access token as a bearer header', async () => {
    fetchMock.mockResolvedValueOnce(json(200, { ok: true }));

    await apiRequest('/auth/me');

    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe('/api/v1/auth/me');
    expect(init?.headers).toEqual({ Authorization: 'Bearer old-token' });
  });

  it('refreshes an expired token once and retries with the new one', async () => {
    fetchMock
      .mockResolvedValueOnce(expired())
      .mockResolvedValueOnce(json(200, { accessToken: 'new-token' }))
      .mockResolvedValueOnce(json(200, { value: 42 }));

    const result = await apiRequest<{ value: number }>('/transactions');

    expect(result).toEqual({ value: 42 });
    const retry = fetchMock.mock.calls[2]?.[1];
    expect(retry?.headers).toEqual({ Authorization: 'Bearer new-token' });
  });

  it('shares one refresh call between requests that expire together', async () => {
    fetchMock.mockImplementation((input) => {
      const url = urlOf(input);
      if (url.endsWith('/auth/refresh')) {
        return Promise.resolve(json(200, { accessToken: 'new-token' }));
      }
      return Promise.resolve(fetchMock.mock.calls.length <= 2 ? expired() : json(200, {}));
    });

    await Promise.all([apiRequest('/analytics/summary'), apiRequest('/analytics/trends')]);

    const refreshCalls = fetchMock.mock.calls.filter(([input]) =>
      urlOf(input).endsWith('/auth/refresh'),
    );
    expect(refreshCalls).toHaveLength(1);
  });

  it('reports an expired session when the refresh fails', async () => {
    const expiredHandler = vi.fn();
    onSessionExpired(expiredHandler);
    fetchMock
      .mockResolvedValueOnce(expired())
      .mockResolvedValueOnce(
        json(401, { code: 'AUTH_TOKEN_INVALID', message: 'x', details: null, requestId: null }),
      );

    await expect(apiRequest('/transactions')).rejects.toMatchObject({ code: 'AUTH_TOKEN_EXPIRED' });
    expect(expiredHandler).toHaveBeenCalledOnce();
  });

  it('turns an error envelope into an ApiError with its code', async () => {
    fetchMock.mockResolvedValueOnce(
      json(429, { code: 'RATE_LIMITED', message: 'slow down', details: null, requestId: 'r9' }),
    );

    const error = await apiRequest('/auth/login').catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ code: 'RATE_LIMITED', status: 429, requestId: 'r9' });
  });

  it('reports a network failure as NETWORK_ERROR', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));

    await expect(apiRequest('/transactions')).rejects.toMatchObject({ code: 'NETWORK_ERROR' });
  });
});
