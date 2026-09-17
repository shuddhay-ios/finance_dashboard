import { describe, expect, it } from 'vitest';
import { percentageShares, percentChange, previousWindow } from './figures';

const sum = (values: number[]) => Math.round(values.reduce((a, b) => a + b, 0) * 100) / 100;

describe('percentageShares', () => {
  it('adds up to exactly 100 where plain rounding would give 99.99', () => {
    const shares = percentageShares([1, 1, 1]);

    expect(shares).toEqual([33.34, 33.33, 33.33]);
    expect(sum(shares)).toBe(100);
  });

  it('keeps exact shares exact', () => {
    expect(percentageShares([150, 50])).toEqual([75, 25]);
  });

  it('adds up to 100 for many uneven values', () => {
    const shares = percentageShares([1234567, 890123, 45678, 9012, 345, 67, 8, 1, 1, 1, 1, 1]);
    expect(sum(shares)).toBe(100);
  });

  it('returns zeros instead of dividing by zero', () => {
    expect(percentageShares([0, 0])).toEqual([0, 0]);
    expect(percentageShares([])).toEqual([]);
  });
});

describe('percentChange', () => {
  it('computes growth and decline to one decimal', () => {
    expect(percentChange(150, 100)).toBe(50);
    expect(percentChange(90, 120)).toBe(-25);
    expect(percentChange(1, 3)).toBe(-66.7);
  });

  it('measures change from a negative previous value by its size', () => {
    // Net went from -100 to +50: an improvement of 150, i.e. +150%.
    expect(percentChange(50, -100)).toBe(150);
  });

  it('returns null when the previous value is zero', () => {
    expect(percentChange(500, 0)).toBeNull();
  });
});

describe('previousWindow', () => {
  it('returns the equal-length window immediately before', () => {
    const march = { from: new Date('2024-03-01Z'), toExclusive: new Date('2024-04-01Z') };

    expect(previousWindow(march)).toEqual({
      from: new Date('2024-01-30Z'),
      toExclusive: new Date('2024-03-01Z'),
    });
  });
});
