import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AUTO_DISMISS_MS, useAlertChips } from './alert-chip-store';

const messages = () => useAlertChips.getState().chips.map((chip) => chip.message);

describe('alert chips', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useAlertChips.setState({ chips: [] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('keeps at most 3 chips, dropping the oldest', () => {
    for (const message of ['one', 'two', 'three', 'four']) {
      useAlertChips.getState().show({ severity: 'error', message });
    }
    expect(messages()).toEqual(['two', 'three', 'four']);
  });

  it('shows the same message only once', () => {
    useAlertChips.getState().show({ severity: 'error', message: 'offline' });
    useAlertChips.getState().show({ severity: 'error', message: 'offline' });
    expect(messages()).toEqual(['offline']);
  });

  it('dismisses a chip automatically after 6 seconds', () => {
    useAlertChips.getState().show({ severity: 'success', message: 'saved' });

    vi.advanceTimersByTime(AUTO_DISMISS_MS - 1);
    expect(messages()).toEqual(['saved']);

    vi.advanceTimersByTime(1);
    expect(messages()).toEqual([]);
  });

  it('can be dismissed by hand', () => {
    useAlertChips.getState().show({ severity: 'info', message: 'hello' });
    const [chip] = useAlertChips.getState().chips;

    useAlertChips.getState().dismiss(chip?.id ?? -1);

    expect(messages()).toEqual([]);
  });
});
