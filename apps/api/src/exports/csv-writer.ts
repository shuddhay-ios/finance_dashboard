import {
  type DateFormat,
  type Delimiter,
  type ExportColumnKey,
  type TransactionResponse,
  exportHeader,
  exportRecord,
} from '@finance/shared';
import { type Options, stringify } from 'csv-stringify';
import type { Writable } from 'node:stream';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

export interface CsvLayout {
  columns: ExportColumnKey[];
  dateFormat: DateFormat;
  delimiter: Delimiter;
  includeHeaders: boolean;
}

/** RFC 4180 settings, plus what Excel needs to open the file correctly. */
export function csvOptions(delimiter: Delimiter): Options {
  return {
    delimiter,
    // RFC 4180 line endings.
    record_delimiter: 'windows',
    // A byte-order mark tells Excel the file is UTF-8, so names like "Zoë" aren't garbled.
    bom: true,
    // The library quotes values containing the delimiter, a quote, or \r\n. A lone \n or \r
    // would otherwise go unquoted and split one row into two, so force quotes for those too.
    quoted_match: /[\r\n]/,
  };
}

/** The header row (if wanted), then one record per transaction, in the chosen column order. */
export async function* csvRecords(
  rows: AsyncIterable<TransactionResponse>,
  layout: CsvLayout,
): AsyncGenerator<string[]> {
  if (layout.includeHeaders) {
    yield exportHeader(layout.columns);
  }
  for await (const row of rows) {
    yield exportRecord(row, layout.columns, layout.dateFormat);
  }
}

/**
 * Streams rows into `destination` as CSV. Rows are pulled one at a time from the database
 * cursor and written straight out, so memory use stays flat however many rows there are.
 */
export function writeCsv(
  rows: AsyncIterable<TransactionResponse>,
  layout: CsvLayout,
  destination: Writable,
): Promise<void> {
  return pipeline(
    Readable.from(csvRecords(rows, layout)),
    stringify(csvOptions(layout.delimiter)),
    destination,
  );
}
