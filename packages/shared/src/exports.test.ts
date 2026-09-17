import { describe, expect, it } from 'vitest';
import {
  exportHeader,
  exportRecord,
  exportRequestSchema,
  formatAmountMinor,
  formatExportDate,
  neutralizeFormula,
  resolveExportFilename,
} from './exports';
import type { TransactionResponse } from './transactions';

const row: TransactionResponse = {
  id: 'abc',
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

describe('formatAmountMinor', () => {
  it('always shows two decimals, no thousands separators', () => {
    expect(formatAmountMinor(120050)).toBe('1200.50');
    expect(formatAmountMinor(150000)).toBe('1500.00');
    expect(formatAmountMinor(5)).toBe('0.05');
    expect(formatAmountMinor(-120050)).toBe('-1200.50');
  });
});

describe('formatExportDate', () => {
  it('supports every offered format, in UTC', () => {
    expect(formatExportDate(row.date, 'YYYY-MM-DD')).toBe('2024-02-21');
    expect(formatExportDate(row.date, 'DD/MM/YYYY')).toBe('21/02/2024');
    expect(formatExportDate(row.date, 'MM/DD/YYYY')).toBe('02/21/2024');
    expect(formatExportDate(row.date, 'ISO-8601')).toBe('2024-02-21T11:14:38.000Z');
  });
});

describe('neutralizeFormula', () => {
  it.each(['=SUM(A1)', '+1', '-1', '@cmd', '\tx', '\rx'])('neutralizes %j', (text) => {
    expect(neutralizeFormula(text)).toBe(`'${text}`);
  });

  it('leaves ordinary text alone', () => {
    expect(neutralizeFormula('Rohan Mehta')).toBe('Rohan Mehta');
  });
});

describe('exportRecord and exportHeader', () => {
  it('follows the chosen column order exactly', () => {
    const columns = ['amount', 'user.name', 'date'] as const;

    expect(exportHeader([...columns])).toEqual(['Amount', 'User', 'Date']);
    expect(exportRecord(row, [...columns], 'DD/MM/YYYY')).toEqual([
      '1200.50',
      'Rohan Mehta',
      '21/02/2024',
    ]);
  });

  it('makes expenses negative in the signed amount column', () => {
    expect(exportRecord(row, ['signedAmount'], 'YYYY-MM-DD')).toEqual(['-1200.50']);
    expect(exportRecord({ ...row, category: 'Revenue' }, ['signedAmount'], 'YYYY-MM-DD')).toEqual([
      '1200.50',
    ]);
  });

  it('neutralizes a formula hidden in data', () => {
    const hostile = { ...row, user: { ...row.user, name: '=HYPERLINK("http://evil")' } };
    expect(exportRecord(hostile, ['user.name'], 'YYYY-MM-DD')).toEqual([
      '\'=HYPERLINK("http://evil")',
    ]);
  });
});

describe('exportRequestSchema', () => {
  it('rejects no columns and duplicate columns', () => {
    expect(exportRequestSchema.safeParse({ columns: [] }).success).toBe(false);
    expect(exportRequestSchema.safeParse({ columns: ['date', 'date'] }).success).toBe(false);
  });

  it('fills sensible defaults', () => {
    expect(exportRequestSchema.parse({ columns: ['date'] })).toEqual({
      columns: ['date'],
      dateFormat: 'YYYY-MM-DD',
      delimiter: ',',
      includeHeaders: true,
      filenameTemplate: 'transactions_{dates}',
      filters: {},
    });
  });
});

describe('resolveExportFilename', () => {
  const today = new Date('2026-09-17T10:00:00Z');

  it('fills placeholders from the filters', () => {
    const name = resolveExportFilename(
      'transactions_{dateFrom}_to_{dateTo}_{status}',
      { dateFrom: '2024-01-01', dateTo: '2024-03-31', status: ['Paid'] },
      today,
    );
    expect(name).toBe('transactions_2024-01-01_to_2024-03-31_Paid.csv');
  });

  it('describes the period with {dates}, whatever dates are set', () => {
    const name = (filters: { dateFrom?: string; dateTo?: string }) =>
      resolveExportFilename('transactions_{dates}', filters, today);

    expect(name({ dateFrom: '2024-01-01', dateTo: '2024-03-31' })).toBe(
      'transactions_2024-01-01_to_2024-03-31.csv',
    );
    expect(name({ dateFrom: '2024-01-01' })).toBe('transactions_from_2024-01-01.csv');
    expect(name({ dateTo: '2024-03-31' })).toBe('transactions_until_2024-03-31.csv');
    expect(name({})).toBe('transactions_all_as_of_2026-09-17.csv');
  });

  it('uses "all" for unset filters and supports {today}', () => {
    expect(resolveExportFilename('{category}_{today}', {}, today)).toBe('all_2026-09-17.csv');
  });

  it('removes characters that are unsafe in a filename or header', () => {
    expect(resolveExportFilename('../../etc/"pass wd"\r\n.csv', {}, today)).toBe('etc_pass_wd.csv');
  });

  it('falls back to a default when nothing usable is left', () => {
    expect(resolveExportFilename('///', {}, today)).toBe('transactions.csv');
  });
});
