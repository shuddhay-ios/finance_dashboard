import {
  BREAKDOWN_DIMENSIONS,
  type BreakdownDimension,
  GRANULARITIES,
  type Granularity,
  SORT_DIRECTIONS,
  SORT_FIELDS,
  type SortDirection,
  type SortField,
  TRANSACTION_CATEGORIES,
  TRANSACTION_STATUSES,
  type TransactionCategory,
  type TransactionStatus,
  type TransactionFilterQuery,
} from '@finance/shared';

export const PAGE_SIZES = [10, 25, 50] as const;
export type PageSize = (typeof PAGE_SIZES)[number];

/**
 * Everything that decides what the dashboard shows. It lives in the URL query string, so
 * a view can be shared as a link, survives a page refresh, and Back undoes a filter change.
 */
export interface DashboardView {
  search: string;
  dateFrom: string | null;
  dateTo: string | null;
  amountMin: string | null;
  amountMax: string | null;
  categories: TransactionCategory[];
  statuses: TransactionStatus[];
  userIds: string[];
  page: number;
  pageSize: PageSize;
  sortBy: SortField;
  sortDir: SortDirection;
  granularity: Granularity;
  dimension: BreakdownDimension;
}

export const DEFAULT_VIEW: DashboardView = {
  search: '',
  dateFrom: null,
  dateTo: null,
  amountMin: null,
  amountMax: null,
  categories: [],
  statuses: [],
  userIds: [],
  page: 1,
  pageSize: 25,
  sortBy: 'date',
  sortDir: 'desc',
  granularity: 'month',
  dimension: 'category',
};

/** The filter part of a view reset to "show everything". */
export const CLEARED_FILTERS: Partial<DashboardView> = {
  search: '',
  dateFrom: null,
  dateTo: null,
  amountMin: null,
  amountMax: null,
  categories: [],
  statuses: [],
  userIds: [],
};

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const AMOUNT = /^\d+(\.\d{1,2})?$/;

function oneOf<T extends string>(value: string | null, options: readonly T[], fallback: T): T {
  return options.find((option) => option === value) ?? fallback;
}

function allOf<T extends string>(values: string[], options: readonly T[]): T[] {
  return options.filter((option) => values.includes(option));
}

function matching(value: string | null, pattern: RegExp): string | null {
  return value !== null && pattern.test(value) ? value : null;
}

function pageNumber(value: string | null): number {
  const page = Number(value);
  return Number.isInteger(page) && page >= 1 ? page : 1;
}

function pageSize(value: string | null): PageSize {
  return PAGE_SIZES.find((size) => String(size) === value) ?? DEFAULT_VIEW.pageSize;
}

/**
 * Reads the view from the URL. Anything invalid, like a hand-edited link, quietly falls
 * back to its default instead of breaking the page.
 */
export function readView(params: URLSearchParams): DashboardView {
  return {
    search: params.get('search') ?? '',
    dateFrom: matching(params.get('dateFrom'), DAY),
    dateTo: matching(params.get('dateTo'), DAY),
    amountMin: matching(params.get('amountMin'), AMOUNT),
    amountMax: matching(params.get('amountMax'), AMOUNT),
    categories: allOf(params.getAll('category'), TRANSACTION_CATEGORIES),
    statuses: allOf(params.getAll('status'), TRANSACTION_STATUSES),
    userIds: params.getAll('userId'),
    page: pageNumber(params.get('page')),
    pageSize: pageSize(params.get('pageSize')),
    sortBy: oneOf(params.get('sortBy'), SORT_FIELDS, DEFAULT_VIEW.sortBy),
    sortDir: oneOf(params.get('sortDir'), SORT_DIRECTIONS, DEFAULT_VIEW.sortDir),
    granularity: oneOf(params.get('granularity'), GRANULARITIES, DEFAULT_VIEW.granularity),
    dimension: oneOf(params.get('dimension'), BREAKDOWN_DIMENSIONS, DEFAULT_VIEW.dimension),
  };
}

/** Writes only what differs from the defaults, so shared links stay short and readable. */
export function writeView(view: DashboardView): URLSearchParams {
  const params = filterParams(view);
  if (view.page !== DEFAULT_VIEW.page) {
    params.set('page', String(view.page));
  }
  if (view.pageSize !== DEFAULT_VIEW.pageSize) {
    params.set('pageSize', String(view.pageSize));
  }
  if (view.sortBy !== DEFAULT_VIEW.sortBy) {
    params.set('sortBy', view.sortBy);
  }
  if (view.sortDir !== DEFAULT_VIEW.sortDir) {
    params.set('sortDir', view.sortDir);
  }
  if (view.granularity !== DEFAULT_VIEW.granularity) {
    params.set('granularity', view.granularity);
  }
  if (view.dimension !== DEFAULT_VIEW.dimension) {
    params.set('dimension', view.dimension);
  }
  return params;
}

/**
 * The filters as API query parameters. The table, cards, charts and export all send exactly
 * these, so they always describe the same rows.
 */
export function filterParams(view: DashboardView): URLSearchParams {
  const params = new URLSearchParams();
  if (view.search) {
    params.set('search', view.search);
  }
  if (view.dateFrom) {
    params.set('dateFrom', view.dateFrom);
  }
  if (view.dateTo) {
    params.set('dateTo', view.dateTo);
  }
  if (view.amountMin) {
    params.set('amountMin', view.amountMin);
  }
  if (view.amountMax) {
    params.set('amountMax', view.amountMax);
  }
  view.categories.forEach((category) => params.append('category', category));
  view.statuses.forEach((status) => params.append('status', status));
  view.userIds.forEach((userId) => params.append('userId', userId));
  return params;
}

/** The same filters as a JSON object, for request bodies (the CSV export). */
export function filterQuery(view: DashboardView): TransactionFilterQuery {
  const query: TransactionFilterQuery = {};
  if (view.search) {
    query.search = view.search;
  }
  if (view.dateFrom) {
    query.dateFrom = view.dateFrom;
  }
  if (view.dateTo) {
    query.dateTo = view.dateTo;
  }
  if (view.amountMin) {
    query.amountMin = Number(view.amountMin);
  }
  if (view.amountMax) {
    query.amountMax = Number(view.amountMax);
  }
  if (view.categories.length > 0) {
    query.category = view.categories;
  }
  if (view.statuses.length > 0) {
    query.status = view.statuses;
  }
  if (view.userIds.length > 0) {
    query.userId = view.userIds;
  }
  return query;
}

/** Filters plus paging and sorting, for GET /transactions. */
export function listParams(view: DashboardView): URLSearchParams {
  const params = filterParams(view);
  params.set('page', String(view.page));
  params.set('limit', String(view.pageSize));
  params.set('sortBy', view.sortBy);
  params.set('sortDir', view.sortDir);
  return params;
}

export interface ActiveFilter {
  key: string;
  label: string;
  /** The change that removes just this filter. */
  removal: Partial<DashboardView>;
}

/** One removable chip per active filter value. */
export function activeFilters(view: DashboardView, userNames: Map<string, string>): ActiveFilter[] {
  const chips: ActiveFilter[] = [];

  if (view.search) {
    chips.push({ key: 'search', label: `Search: "${view.search}"`, removal: { search: '' } });
  }
  if (view.dateFrom || view.dateTo) {
    chips.push({
      key: 'date',
      label: `Date: ${view.dateFrom ?? 'start'} → ${view.dateTo ?? 'today'}`,
      removal: { dateFrom: null, dateTo: null },
    });
  }
  if (view.amountMin || view.amountMax) {
    chips.push({
      key: 'amount',
      label: `Amount: ${view.amountMin ? `$${view.amountMin}` : 'any'} – ${view.amountMax ? `$${view.amountMax}` : 'any'}`,
      removal: { amountMin: null, amountMax: null },
    });
  }
  for (const category of view.categories) {
    chips.push({
      key: `category:${category}`,
      label: category,
      removal: { categories: view.categories.filter((value) => value !== category) },
    });
  }
  for (const status of view.statuses) {
    chips.push({
      key: `status:${status}`,
      label: status,
      removal: { statuses: view.statuses.filter((value) => value !== status) },
    });
  }
  for (const userId of view.userIds) {
    chips.push({
      key: `user:${userId}`,
      label: userNames.get(userId) ?? userId,
      removal: { userIds: view.userIds.filter((value) => value !== userId) },
    });
  }

  return chips;
}

/**
 * Typing "priya" commits "p", then "priya" as the typing pauses. Those refinements should
 * replace the current history entry, or Back would step through every half-typed word.
 * Starting or clearing a text filter does add an entry, so Back can undo it.
 */
export function isRefiningText(previous: string | null, next: string | null): boolean {
  return Boolean(previous) && Boolean(next);
}
