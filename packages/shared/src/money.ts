// Money is stored and summed as whole cents ("minor units"), never as decimals.
// Binary floating point can't represent most decimal fractions exactly:
// 0.29 * 100 === 28.999999999999996 in JavaScript. Integers have no such error.

const MINOR_UNITS_PER_MAJOR = 100;

// Tolerance for the float noise in `amount * 100`. Real sub-cent input
// (e.g. 12.345) is off by 0.5 cents, far outside this window, so it is still rejected.
const FLOAT_NOISE_TOLERANCE = 1e-6;

/** 1200.5 → 120050. Throws if the amount has more than 2 decimal places. */
export function toMinorUnits(amount: number): number {
  if (!Number.isFinite(amount)) {
    throw new RangeError(`Amount must be a finite number, got ${amount}`);
  }
  const scaled = amount * MINOR_UNITS_PER_MAJOR;
  const rounded = Math.round(scaled);
  if (Math.abs(scaled - rounded) > FLOAT_NOISE_TOLERANCE) {
    throw new RangeError(`Amount ${amount} has more than 2 decimal places`);
  }
  if (!Number.isSafeInteger(rounded)) {
    throw new RangeError(`Amount ${amount} is too large to store exactly`);
  }
  return rounded;
}

/** 120050 → 1200.5. Only for the display/response edge — never do maths on the result. */
export function fromMinorUnits(amountMinor: number): number {
  if (!Number.isSafeInteger(amountMinor)) {
    throw new RangeError(`Minor units must be a safe integer, got ${amountMinor}`);
  }
  return amountMinor / MINOR_UNITS_PER_MAJOR;
}
