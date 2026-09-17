export const DATE_PRESETS = [
  'all',
  'thisMonth',
  'lastMonth',
  'thisQuarter',
  'year2024',
  'custom',
] as const;
export type DatePreset = (typeof DATE_PRESETS)[number];

export const DATE_PRESET_LABELS: Record<DatePreset, string> = {
  all: 'All time',
  thisMonth: 'This month',
  lastMonth: 'Last month',
  thisQuarter: 'This quarter',
  // The whole dataset is in 2024, so this is the preset that shows something useful.
  year2024: '2024',
  custom: 'Custom range',
};

export interface DateRange {
  dateFrom: string;
  dateTo: string;
}

/** "YYYY-MM-DD" in UTC. Day 0 means "the last day of the previous month". */
function utcDay(year: number, monthIndex: number, day: number): string {
  return new Date(Date.UTC(year, monthIndex, day)).toISOString().slice(0, 10);
}

/** The date range a preset stands for, relative to `today`. Both ends are inclusive. */
export function presetRange(preset: Exclude<DatePreset, 'all' | 'custom'>, today: Date): DateRange {
  const year = today.getUTCFullYear();
  const month = today.getUTCMonth();

  switch (preset) {
    case 'thisMonth':
      return { dateFrom: utcDay(year, month, 1), dateTo: utcDay(year, month + 1, 0) };
    case 'lastMonth':
      return { dateFrom: utcDay(year, month - 1, 1), dateTo: utcDay(year, month, 0) };
    case 'thisQuarter': {
      const quarterStart = Math.floor(month / 3) * 3;
      return {
        dateFrom: utcDay(year, quarterStart, 1),
        dateTo: utcDay(year, quarterStart + 3, 0),
      };
    }
    case 'year2024':
      return { dateFrom: '2024-01-01', dateTo: '2024-12-31' };
  }
}

const NAMED_PRESETS = ['thisMonth', 'lastMonth', 'thisQuarter', 'year2024'] as const;

/** Which preset the current dates match, so the dropdown shows the right choice. */
export function detectPreset(
  dateFrom: string | null,
  dateTo: string | null,
  today: Date,
): DatePreset {
  if (!dateFrom && !dateTo) {
    return 'all';
  }
  const match = NAMED_PRESETS.find((preset) => {
    const range = presetRange(preset, today);
    return range.dateFrom === dateFrom && range.dateTo === dateTo;
  });
  return match ?? 'custom';
}
