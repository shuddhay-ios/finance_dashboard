const HUNDREDTHS_IN_100_PERCENT = 10_000;

/**
 * Each value's share of the total, as a percentage with 2 decimals, guaranteed to add up to
 * exactly 100. Ordinary rounding can't promise that: three equal parts give
 * 33.33 + 33.33 + 33.33 = 99.99. This uses the largest remainder method: round every share
 * down, then give the leftover hundredths to the shares that lost the most by rounding.
 */
export function percentageShares(values: number[]): number[] {
  const total = values.reduce((sum, value) => sum + value, 0);
  if (total === 0) {
    return values.map(() => 0);
  }

  const exactHundredths = values.map((value) => (value / total) * HUNDREDTHS_IN_100_PERCENT);
  const roundedDown = exactHundredths.map((hundredths) => Math.floor(hundredths));
  const leftover = HUNDREDTHS_IN_100_PERCENT - roundedDown.reduce((sum, value) => sum + value, 0);

  const biggestLosses = exactHundredths
    .map((hundredths, index) => ({ index, lost: hundredths - Math.floor(hundredths) }))
    .sort((a, b) => b.lost - a.lost)
    .slice(0, leftover)
    .map((entry) => entry.index);
  const getsExtraHundredth = new Set(biggestLosses);

  return roundedDown.map(
    (hundredths, index) => (hundredths + (getsExtraHundredth.has(index) ? 1 : 0)) / 100,
  );
}

/**
 * Percentage change from `previous` to `current`, to 1 decimal. Null when previous is 0:
 * "up from nothing" has no meaningful percentage, and Infinity would break the UI.
 */
export function percentChange(current: number, previous: number): number | null {
  if (previous === 0) {
    return null;
  }
  return Math.round(((current - previous) / Math.abs(previous)) * 1000) / 10;
}

export interface DateWindow {
  from: Date;
  toExclusive: Date;
}

/** The window of the same length that ends exactly where this one starts. */
export function previousWindow(window: DateWindow): DateWindow {
  const lengthMs = window.toExclusive.getTime() - window.from.getTime();
  return { from: new Date(window.from.getTime() - lengthMs), toExclusive: window.from };
}
