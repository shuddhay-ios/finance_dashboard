import { describe, expect, it } from 'vitest';
import { fromMinorUnits, toMinorUnits } from './money';

describe('toMinorUnits', () => {
  it('converts amounts from the dataset exactly', () => {
    expect(toMinorUnits(1500)).toBe(150000);
    expect(toMinorUnits(1200.5)).toBe(120050);
    expect(toMinorUnits(300.75)).toBe(30075);
  });

  it('absorbs float noise instead of truncating a cent', () => {
    // 0.29 * 100 is 28.999999999999996; a naive Math.floor would give 28.
    expect(toMinorUnits(0.29)).toBe(29);
    expect(toMinorUnits(19.99)).toBe(1999); // 19.99 * 100 === 1998.9999999999998
  });

  it('rejects amounts with more than two decimal places', () => {
    expect(() => toMinorUnits(12.345)).toThrow(RangeError);
    expect(() => toMinorUnits(1.005)).toThrow(RangeError);
  });

  it('rejects non-finite and unsafely large amounts', () => {
    expect(() => toMinorUnits(Number.NaN)).toThrow(RangeError);
    expect(() => toMinorUnits(Number.POSITIVE_INFINITY)).toThrow(RangeError);
    expect(() => toMinorUnits(Number.MAX_SAFE_INTEGER)).toThrow(RangeError);
  });
});

describe('fromMinorUnits', () => {
  it('converts back for display', () => {
    expect(fromMinorUnits(120050)).toBe(1200.5);
    expect(fromMinorUnits(0)).toBe(0);
  });

  it('rejects non-integers so a float can never sneak into storage maths', () => {
    expect(() => fromMinorUnits(120.5)).toThrow(RangeError);
  });
});
