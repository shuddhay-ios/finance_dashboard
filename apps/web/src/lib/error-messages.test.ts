import { describe, expect, it } from 'vitest';
import { ApiError } from './api-client';
import { chipMessage } from './error-messages';

const error = (code: ApiError['code'], details: unknown = null, requestId: string | null = null) =>
  new ApiError(code, 'raw server message', 400, details, requestId);

describe('chipMessage', () => {
  it('uses friendly text instead of the raw server message', () => {
    expect(chipMessage(error('AUTH_INVALID_CREDENTIALS'))).toBe('Invalid email or password');
    expect(chipMessage(error('RATE_LIMITED'))).toBe('Too many attempts. Try again in a minute');
  });

  it('names the first invalid field for validation errors', () => {
    const details = [{ field: 'dateFrom', message: 'dateFrom must be on or before dateTo' }];
    expect(chipMessage(error('VALIDATION_FAILED', details))).toBe(
      'Check your filters — dateFrom: dateFrom must be on or before dateTo',
    );
  });

  it('includes the request id for unexpected errors, so it can be reported', () => {
    expect(chipMessage(error('INTERNAL_ERROR', null, 'req_123'))).toBe(
      'Something went wrong (ref: req_123)',
    );
  });
});
