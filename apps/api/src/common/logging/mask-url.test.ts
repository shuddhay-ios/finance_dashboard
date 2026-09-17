import { describe, expect, it } from 'vitest';
import { maskUrlSecrets } from './mask-url';

describe('maskUrlSecrets', () => {
  it('hides the download token in an export URL', () => {
    expect(maskUrlSecrets('/api/v1/exports/AbC-123_xyz/download')).toBe(
      '/api/v1/exports/[redacted]/download',
    );
  });

  it('leaves other URLs untouched', () => {
    expect(maskUrlSecrets('/api/v1/transactions?search=exports')).toBe(
      '/api/v1/transactions?search=exports',
    );
  });
});
