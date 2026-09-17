import type { TransactionListResponse } from '@finance/shared';
import { ThemeProvider } from '@mui/material';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { theme } from '../../theme/theme';
import { TransactionTable } from './TransactionTable';
import { DEFAULT_VIEW } from './url-filters';

const page: TransactionListResponse = {
  data: [
    {
      id: 'a1',
      externalId: 2,
      date: '2024-02-21T11:14:38.000Z',
      amount: 1200.5,
      currency: 'USD',
      category: 'Expense',
      status: 'Pending',
      user: {
        id: 'u2',
        externalId: 'user_002',
        name: 'Rohan Mehta',
        email: 'rohan.mehta@example.com',
        avatarUrl: 'https://example.com/a.svg',
      },
    },
  ],
  page: 1,
  limit: 25,
  total: 1,
  totalPages: 1,
};

function renderTable(data: TransactionListResponse) {
  const updateView = vi.fn();
  const onClearFilters = vi.fn();
  render(
    <ThemeProvider theme={theme}>
      <TransactionTable
        data={data}
        isLoading={false}
        isShowingPreviousData={false}
        view={DEFAULT_VIEW}
        updateView={updateView}
        onClearFilters={onClearFilters}
      />
    </ThemeProvider>,
  );
  return { updateView, onClearFilters };
}

describe('TransactionTable', () => {
  it('shows a row with a signed amount, status chip and range label', () => {
    renderTable(page);

    expect(screen.getByText('Rohan Mehta')).toBeInTheDocument();
    expect(screen.getByText('−$1,200.50')).toBeInTheDocument();
    expect(screen.getByText('Pending')).toBeInTheDocument();
    expect(screen.getByText('Showing 1–1 of 1')).toBeInTheDocument();
  });

  it('marks the sorted column for screen readers and sorts a new column ascending', async () => {
    const user = userEvent.setup();
    const { updateView } = renderTable(page);

    expect(screen.getByRole('columnheader', { name: /Date/ })).toHaveAttribute(
      'aria-sort',
      'descending',
    );

    await user.click(screen.getByRole('button', { name: 'Amount' }));
    expect(updateView).toHaveBeenCalledWith({ sortBy: 'amount', sortDir: 'asc' });
  });

  it('shows an empty state with a way to clear filters instead of a blank table', async () => {
    const user = userEvent.setup();
    const { onClearFilters } = renderTable({ ...page, data: [], total: 0, totalPages: 0 });

    expect(screen.getByText('No transactions match these filters')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(onClearFilters).toHaveBeenCalled();
  });
});
