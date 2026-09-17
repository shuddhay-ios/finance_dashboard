import { describe, expect, it } from 'vitest';
import { escapeRegex } from './escape-regex';

describe('escapeRegex', () => {
  it('makes every special character literal', () => {
    const special = '.*+?^${}()|[]\\';
    expect(new RegExp(escapeRegex(special)).test(special)).toBe(true);
  });

  it('leaves normal text unchanged', () => {
    expect(escapeRegex('Priya Sharma')).toBe('Priya Sharma');
  });
});
