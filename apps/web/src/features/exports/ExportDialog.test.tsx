import type { TransactionResponse } from '@finance/shared';
import { ThemeProvider } from '@mui/material';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AlertChipStack } from '../../components/alert-chips/AlertChipStack';
import { useAlertChips } from '../../components/alert-chips/alert-chip-store';
import { startDownload } from '../../lib/download';
import { theme } from '../../theme/theme';
import { DEFAULT_VIEW, type DashboardView } from '../transactions/url-filters';
import { ExportDialog } from './ExportDialog';

vi.mock(import('../../lib/download'), async (importOriginal) => ({
  ...(await importOriginal()),
  startDownload: vi.fn(),
}));

const row: TransactionResponse = {
  id: 'a1',
  externalId: 2,
  date: '2024-02-21T11:14:38.000Z',
  amount: 1200.5,
  currency: 'USD',
  category: 'Expense',
  status: 'Paid',
  user: {
    id: 'u2',
    externalId: 'user_002',
    name: 'Rohan Mehta',
    email: 'rohan.mehta@example.com',
    avatarUrl: 'https://example.com/a.svg',
  },
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function urlOf(input: Parameters<typeof fetch>[0]): string {
  if (typeof input === 'string') {
    return input;
  }
  return input instanceof URL ? input.href : input.url;
}

describe('ExportDialog', () => {
  const fetchMock = vi.fn<typeof fetch>();
  let total = 52;

  beforeEach(() => {
    total = 52;
    useAlertChips.setState({ chips: [] });
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockImplementation((input, init) => {
      const url = urlOf(input);
      if (url.startsWith('/api/v1/transactions')) {
        return Promise.resolve(
          json({ data: total > 0 ? [row] : [], page: 1, limit: 5, total, totalPages: 1 }),
        );
      }
      if (url === '/api/v1/export-templates') {
        return Promise.resolve(json({ data: [] }));
      }
      if (url === '/api/v1/exports' && init?.method === 'POST') {
        return Promise.resolve(
          json(
            {
              downloadToken: 'tok123',
              expiresAt: '2026-09-17T10:00:00.000Z',
              estimatedRows: total,
              resolvedFilename: 'transactions_2024-01-01_to_2024-03-31.csv',
            },
            201,
          ),
        );
      }
      return Promise.reject(new Error(`Unexpected request ${url}`));
    });
  });

  afterEach(() => {
    fetchMock.mockReset();
    vi.unstubAllGlobals();
    vi.mocked(startDownload).mockReset();
  });

  function renderDialog(view: DashboardView = DEFAULT_VIEW) {
    const onClose = vi.fn();
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <ThemeProvider theme={theme}>
        <QueryClientProvider client={queryClient}>
          <ExportDialog open onClose={onClose} view={view} />
          <AlertChipStack />
        </QueryClientProvider>
      </ThemeProvider>,
    );
    return { onClose };
  }

  it('shows how many rows will be exported and a preview built like the file', async () => {
    renderDialog();

    expect(await screen.findByText('52 rows will be exported')).toBeInTheDocument();
    const preview = screen.getByRole('table', { name: 'Export preview' });
    expect(within(preview).getByText('User')).toBeInTheDocument();
    expect(within(preview).getByText('Rohan Mehta')).toBeInTheDocument();
    expect(within(preview).getByText('1200.50')).toBeInTheDocument();
  });

  it('updates the preview when a preset and date format change', async () => {
    const user = userEvent.setup();
    renderDialog();
    await screen.findByText('52 rows will be exported');

    await user.click(screen.getByRole('button', { name: 'Accounting' }));

    const preview = screen.getByRole('table', { name: 'Export preview' });
    expect(within(preview).getByText('Signed amount')).toBeInTheDocument();
    expect(within(preview).getByText('-1200.50')).toBeInTheDocument();
  });

  it('disables Export when every column is removed', async () => {
    const user = userEvent.setup();
    renderDialog();
    await screen.findByText('52 rows will be exported');

    for (const label of ['Date', 'User', 'Category', 'Status', 'Amount']) {
      await user.click(screen.getByRole('button', { name: `Remove ${label}` }));
    }

    expect(screen.getByText('Choose at least one column to export.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Export CSV' })).toBeDisabled();
  });

  it('blocks exporting when no rows match', async () => {
    total = 0;
    renderDialog({ ...DEFAULT_VIEW, search: 'nothing' });

    expect(await screen.findByText(/No transactions match these filters/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Export CSV' })).toBeDisabled();
  });

  it('sends the chosen columns and current filters, then downloads through the browser', async () => {
    const user = userEvent.setup();
    const { onClose } = renderDialog({
      ...DEFAULT_VIEW,
      dateFrom: '2024-01-01',
      dateTo: '2024-03-31',
      statuses: ['Paid'],
    });
    await screen.findByText('52 rows will be exported');

    await user.click(screen.getByRole('button', { name: 'Remove User' }));
    await user.click(screen.getByRole('button', { name: 'Export CSV' }));

    await waitFor(() =>
      expect(startDownload).toHaveBeenCalledWith('/api/v1/exports/tok123/download'),
    );
    const exportCall = fetchMock.mock.calls.find(([input]) => urlOf(input) === '/api/v1/exports');
    expect(JSON.parse(exportCall?.[1]?.body as string)).toEqual({
      columns: ['date', 'category', 'status', 'amount'],
      dateFormat: 'YYYY-MM-DD',
      delimiter: ',',
      includeHeaders: true,
      filenameTemplate: 'transactions_{dateFrom}_to_{dateTo}',
      filters: { dateFrom: '2024-01-01', dateTo: '2024-03-31', status: ['Paid'] },
    });
    expect(
      await screen.findByText('Downloading transactions_2024-01-01_to_2024-03-31.csv (52 rows)'),
    ).toBeInTheDocument();
    expect(onClose).toHaveBeenCalled();
  });
});
