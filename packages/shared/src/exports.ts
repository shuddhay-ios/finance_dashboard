import { z } from 'zod';
import { toMinorUnits } from './money';
import {
  type TransactionFilterQuery,
  type TransactionResponse,
  transactionFiltersSchema,
} from './transactions';

// ---------------------------------------------------------------------------------------
// Columns, formats and presets
// ---------------------------------------------------------------------------------------

export const EXPORT_COLUMN_KEYS = [
  'externalId',
  'date',
  'user.name',
  'user.email',
  'user.externalId',
  'category',
  'status',
  'amount',
  'signedAmount',
  'currency',
] as const;
export type ExportColumnKey = (typeof EXPORT_COLUMN_KEYS)[number];

export const EXPORT_COLUMN_LABELS: Record<ExportColumnKey, string> = {
  externalId: 'Transaction ID',
  date: 'Date',
  'user.name': 'User',
  'user.email': 'User email',
  'user.externalId': 'User ID',
  category: 'Category',
  status: 'Status',
  amount: 'Amount',
  // Expenses negative, revenue positive: what accounting software expects in one column.
  signedAmount: 'Signed amount',
  currency: 'Currency',
};

export const DATE_FORMATS = ['YYYY-MM-DD', 'DD/MM/YYYY', 'MM/DD/YYYY', 'ISO-8601'] as const;
export type DateFormat = (typeof DATE_FORMATS)[number];

export const DELIMITERS = [',', ';', '\t'] as const;
export type Delimiter = (typeof DELIMITERS)[number];

export const DEFAULT_FILENAME_TEMPLATE = 'transactions_{dates}';

export interface ExportPreset {
  id: string;
  name: string;
  columns: ExportColumnKey[];
}

export const EXPORT_PRESETS: ExportPreset[] = [
  {
    id: 'accounting',
    name: 'Accounting',
    columns: ['date', 'externalId', 'category', 'signedAmount', 'currency', 'status'],
  },
  {
    id: 'audit',
    name: 'Audit trail',
    columns: [
      'externalId',
      'date',
      'user.externalId',
      'user.name',
      'user.email',
      'category',
      'status',
      'amount',
      'currency',
    ],
  },
  { id: 'summary', name: 'Summary', columns: ['date', 'category', 'amount'] },
];

// ---------------------------------------------------------------------------------------
// Request / response schemas
// ---------------------------------------------------------------------------------------

const exportFormatFields = {
  // The array order IS the column order in the file.
  columns: z
    .array(z.enum(EXPORT_COLUMN_KEYS))
    .min(1, 'choose at least one column')
    .refine((columns) => new Set(columns).size === columns.length, {
      message: 'each column can only be chosen once',
    }),
  dateFormat: z.enum(DATE_FORMATS).default('YYYY-MM-DD'),
  delimiter: z.enum(DELIMITERS).default(','),
  includeHeaders: z.boolean().default(true),
};

export const exportRequestSchema = z.object({
  ...exportFormatFields,
  filenameTemplate: z.string().trim().max(120).default(DEFAULT_FILENAME_TEMPLATE),
  // The same filters as the table. Send {} to export every transaction.
  filters: transactionFiltersSchema.default({}),
});
export type ExportRequest = z.infer<typeof exportRequestSchema>;

export const exportTicketResponseSchema = z.object({
  downloadToken: z.string(),
  expiresAt: z.iso.datetime(),
  estimatedRows: z.number().int(),
  resolvedFilename: z.string(),
});
export type ExportTicketResponse = z.infer<typeof exportTicketResponseSchema>;

export const exportTemplateRequestSchema = z.object({
  name: z.string().trim().min(1).max(60),
  ...exportFormatFields,
});
export type ExportTemplateRequest = z.infer<typeof exportTemplateRequestSchema>;

export const exportTemplateResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  columns: z.array(z.enum(EXPORT_COLUMN_KEYS)),
  dateFormat: z.enum(DATE_FORMATS),
  delimiter: z.enum(DELIMITERS),
  includeHeaders: z.boolean(),
});
export type ExportTemplateResponse = z.infer<typeof exportTemplateResponseSchema>;

export const exportTemplateListResponseSchema = z.object({
  data: z.array(exportTemplateResponseSchema),
});
export type ExportTemplateListResponse = z.infer<typeof exportTemplateListResponseSchema>;

// ---------------------------------------------------------------------------------------
// Formatting. Shared so the modal's live preview shows exactly what the file will contain.
// ---------------------------------------------------------------------------------------

/** 120050 → "1200.50", -120050 → "-1200.50". Integer maths only, so no float artifacts. */
export function formatAmountMinor(amountMinor: number): string {
  const sign = amountMinor < 0 ? '-' : '';
  const absolute = Math.abs(amountMinor);
  const dollars = Math.floor(absolute / 100);
  const cents = absolute % 100;
  return `${sign}${dollars}.${String(cents).padStart(2, '0')}`;
}

/** Formats in UTC, the timezone the data is stored in. */
export function formatExportDate(isoDate: string, format: DateFormat): string {
  const date = new Date(isoDate);
  if (format === 'ISO-8601') {
    return date.toISOString();
  }
  const year = String(date.getUTCFullYear());
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');

  switch (format) {
    case 'YYYY-MM-DD':
      return `${year}-${month}-${day}`;
    case 'DD/MM/YYYY':
      return `${day}/${month}/${year}`;
    case 'MM/DD/YYYY':
      return `${month}/${day}/${year}`;
  }
}

// Excel and Google Sheets treat a cell starting with one of these as a formula, so a user
// named "=HYPERLINK(...)" could run something on the accountant's machine (CSV injection).
const FORMULA_TRIGGERS = ['=', '+', '-', '@', '\t', '\r'];

/** Prefixes a leading formula character with ' so the cell is shown as plain text. */
export function neutralizeFormula(text: string): string {
  return FORMULA_TRIGGERS.some((trigger) => text.startsWith(trigger)) ? `'${text}` : text;
}

/** One cell. Text that came from the data is neutralized; numbers we format ourselves are not. */
export function exportCell(
  row: TransactionResponse,
  column: ExportColumnKey,
  dateFormat: DateFormat,
): string {
  switch (column) {
    case 'externalId':
      return String(row.externalId);
    case 'date':
      return formatExportDate(row.date, dateFormat);
    case 'user.name':
      return neutralizeFormula(row.user.name);
    case 'user.email':
      return neutralizeFormula(row.user.email);
    case 'user.externalId':
      return neutralizeFormula(row.user.externalId ?? '');
    case 'category':
      return neutralizeFormula(row.category);
    case 'status':
      return neutralizeFormula(row.status);
    case 'amount':
      return formatAmountMinor(toMinorUnits(row.amount));
    case 'signedAmount': {
      const amountMinor = toMinorUnits(row.amount);
      return formatAmountMinor(row.category === 'Expense' ? -amountMinor : amountMinor);
    }
    case 'currency':
      return row.currency;
  }
}

export function exportRecord(
  row: TransactionResponse,
  columns: ExportColumnKey[],
  dateFormat: DateFormat,
): string[] {
  return columns.map((column) => exportCell(row, column, dateFormat));
}

export function exportHeader(columns: ExportColumnKey[]): string[] {
  return columns.map((column) => EXPORT_COLUMN_LABELS[column]);
}

// ---------------------------------------------------------------------------------------
// Filename
// ---------------------------------------------------------------------------------------

const MAX_FILENAME_LENGTH = 100;

/**
 * Fills {dates} {dateFrom} {dateTo} {category} {status} {user} {today} and makes the result safe:
 * only letters, digits, dot, dash and underscore survive, so no path separators, quotes or
 * control characters can reach the file system or the Content-Disposition header.
 */
export function resolveExportFilename(
  template: string,
  filters: TransactionFilterQuery,
  today: Date,
): string {
  const values: Record<string, string> = {
    dates: describeDates(filters, today),
    dateFrom: filters.dateFrom?.slice(0, 10) ?? 'all',
    dateTo: filters.dateTo?.slice(0, 10) ?? 'all',
    category: filters.category?.join('-') ?? 'all',
    status: filters.status?.join('-') ?? 'all',
    user: filters.userId?.join('-') ?? 'all',
    today: today.toISOString().slice(0, 10),
  };

  const filled = template.replace(/\{(\w+)\}/g, (_placeholder, name: string) => values[name] ?? '');
  const safe = filled
    .replace(/\.csv$/i, '')
    .replace(/[^A-Za-z0-9._-]+/g, '_')
    .replace(/^[._-]+|[._-]+$/g, '')
    .slice(0, MAX_FILENAME_LENGTH);

  return `${safe || 'transactions'}.csv`;
}

/**
 * "2024-01-01_to_2024-03-31", "from_2024-01-01", "until_2024-03-31", or "all_as_of_<today>"
 * when there is no date filter, so a file name always says which period it covers.
 */
function describeDates(filters: TransactionFilterQuery, today: Date): string {
  const from = filters.dateFrom?.slice(0, 10);
  const to = filters.dateTo?.slice(0, 10);
  if (from && to) {
    return `${from}_to_${to}`;
  }
  if (from) {
    return `from_${from}`;
  }
  if (to) {
    return `until_${to}`;
  }
  return `all_as_of_${today.toISOString().slice(0, 10)}`;
}

/** The placeholders resolveExportFilename understands, for the modal's insert buttons. */
export const FILENAME_VARIABLES = [
  'dates',
  'dateFrom',
  'dateTo',
  'status',
  'category',
  'user',
  'today',
] as const;
