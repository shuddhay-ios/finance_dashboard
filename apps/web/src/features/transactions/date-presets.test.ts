import { describe, expect, it } from 'vitest';
import { detectPreset, presetRange } from './date-presets';

const today = new Date('2026-02-17T10:00:00Z');

describe('presetRange', () => {
  it('covers the whole current month, including leap-year-free February', () => {
    expect(presetRange('thisMonth', today)).toEqual({
      dateFrom: '2026-02-01',
      dateTo: '2026-02-28',
    });
  });

  it('handles "last month" across a year boundary', () => {
    const january = new Date('2026-01-10T00:00:00Z');
    expect(presetRange('lastMonth', january)).toEqual({
      dateFrom: '2025-12-01',
      dateTo: '2025-12-31',
    });
  });

  it('covers the current quarter', () => {
    expect(presetRange('thisQuarter', today)).toEqual({
      dateFrom: '2026-01-01',
      dateTo: '2026-03-31',
    });
  });
});

describe('detectPreset', () => {
  it('recognises a preset from its dates', () => {
    expect(detectPreset(null, null, today)).toBe('all');
    expect(detectPreset('2024-01-01', '2024-12-31', today)).toBe('year2024');
  });

  it('calls anything else custom', () => {
    expect(detectPreset('2024-01-01', '2024-03-31', today)).toBe('custom');
    expect(detectPreset('2024-01-01', null, today)).toBe('custom');
  });
});
