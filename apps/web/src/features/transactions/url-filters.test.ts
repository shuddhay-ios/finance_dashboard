import { describe, expect, it } from 'vitest';
import {
  DEFAULT_VIEW,
  type DashboardView,
  activeFilters,
  isRefiningText,
  listParams,
  readView,
  writeView,
} from './url-filters';

describe('readView', () => {
  it('gives the defaults for an empty URL', () => {
    expect(readView(new URLSearchParams())).toEqual(DEFAULT_VIEW);
  });

  it('reads repeated keys as lists', () => {
    const view = readView(new URLSearchParams('status=Paid&status=Pending&userId=user_001'));
    expect(view.statuses).toEqual(['Paid', 'Pending']);
    expect(view.userIds).toEqual(['user_001']);
  });

  it('ignores invalid values from a hand-edited link instead of failing', () => {
    const view = readView(
      new URLSearchParams(
        'page=-3&pageSize=9999&sortBy=passwordHash&category=Refund&dateFrom=yesterday&amountMin=1.234',
      ),
    );

    expect(view).toMatchObject({
      page: 1,
      pageSize: 25,
      sortBy: 'date',
      categories: [],
      dateFrom: null,
      amountMin: null,
    });
  });
});

describe('writeView', () => {
  it('leaves defaults out of the URL', () => {
    expect(writeView(DEFAULT_VIEW).toString()).toBe('');
  });

  it('round-trips through the URL unchanged', () => {
    const view: DashboardView = {
      ...DEFAULT_VIEW,
      search: 'priya',
      dateFrom: '2024-01-01',
      dateTo: '2024-03-31',
      amountMin: '100',
      categories: ['Expense'],
      statuses: ['Paid', 'Pending'],
      page: 3,
      pageSize: 50,
      sortBy: 'amount',
      sortDir: 'asc',
      granularity: 'week',
      dimension: 'user',
    };

    expect(readView(writeView(view))).toEqual(view);
  });
});

describe('listParams', () => {
  it('uses the API parameter names', () => {
    const params = listParams({ ...DEFAULT_VIEW, pageSize: 10, statuses: ['Paid'] });
    expect(params.toString()).toBe('status=Paid&page=1&limit=10&sortBy=date&sortDir=desc');
  });
});

describe('activeFilters', () => {
  it('makes one removable chip per value, with user names', () => {
    const view = { ...DEFAULT_VIEW, statuses: ['Paid', 'Pending'] as const, userIds: ['user_001'] };
    const chips = activeFilters(
      { ...view, statuses: [...view.statuses] },
      new Map([['user_001', 'Priya Sharma']]),
    );

    expect(chips.map((chip) => chip.label)).toEqual(['Paid', 'Pending', 'Priya Sharma']);
    expect(chips[0]?.removal).toEqual({ statuses: ['Pending'] });
  });
});

describe('isRefiningText', () => {
  it('replaces history while an existing text filter is being edited', () => {
    expect(isRefiningText('p', 'priya')).toBe(true);
    expect(isRefiningText('100', '1000')).toBe(true);
  });

  it('adds a history entry when a text filter is started or cleared', () => {
    expect(isRefiningText('', 'p')).toBe(false);
    expect(isRefiningText(null, '100')).toBe(false);
    expect(isRefiningText('priya', '')).toBe(false);
  });
});
