import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { type DashboardView, readView, writeView } from './url-filters';

// Changing any of these doesn't change which rows the table shows, so the page is kept.
const KEEPS_PAGE = new Set<keyof DashboardView>(['page', 'granularity', 'dimension']);

export interface UpdateOptions {
  /** Replace the current history entry instead of adding one (see isRefiningText). */
  replace?: boolean;
}

export type UpdateView = (changes: Partial<DashboardView>, options?: UpdateOptions) => void;

/** The current dashboard view, read from and written to the URL. */
export function useDashboardView() {
  const [searchParams, setSearchParams] = useSearchParams();
  const view = useMemo(() => readView(searchParams), [searchParams]);

  const updateView: UpdateView = useCallback(
    (changes, options = {}) => {
      setSearchParams((current) => {
        const next = { ...readView(current), ...changes };
        // A new filter, sort or page size means a different list: start from page 1.
        const changesRows = Object.keys(changes).some(
          (key) => !KEEPS_PAGE.has(key as keyof DashboardView),
        );
        if (changesRows) {
          next.page = 1;
        }
        return writeView(next);
      }, options);
    },
    [setSearchParams],
  );

  return { view, updateView };
}
