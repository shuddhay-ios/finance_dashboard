import type { TransactionResponse } from '@finance/shared';
import { PassThrough } from 'node:stream';
import { describe, expect, it } from 'vitest';
import { type CsvLayout, writeCsv } from './csv-writer';

const BOM = '﻿';

function transaction(overrides: Partial<TransactionResponse['user']> = {}): TransactionResponse {
  return {
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
      ...overrides,
    },
  };
}

async function* asAsync<T>(items: T[]): AsyncGenerator<T> {
  for (const item of items) {
    yield await Promise.resolve(item);
  }
}

async function render(rows: TransactionResponse[], layout: Partial<CsvLayout> = {}) {
  const output = new PassThrough();
  const chunks: Buffer[] = [];
  output.on('data', (chunk: Buffer) => chunks.push(chunk));

  await writeCsv(
    asAsync(rows),
    {
      columns: ['externalId', 'user.name', 'amount'],
      dateFormat: 'YYYY-MM-DD',
      delimiter: ',',
      includeHeaders: true,
      ...layout,
    },
    output,
  );
  return Buffer.concat(chunks).toString('utf8');
}

describe('writeCsv', () => {
  it('starts with a UTF-8 BOM, writes a header and uses CRLF line endings', async () => {
    const csv = await render([transaction()]);
    expect(csv).toBe(`${BOM}Transaction ID,User,Amount\r\n2,Rohan Mehta,1200.50\r\n`);
  });

  it('can leave out the header row', async () => {
    const csv = await render([transaction()], { includeHeaders: false });
    expect(csv).toBe(`${BOM}2,Rohan Mehta,1200.50\r\n`);
  });

  it('uses the chosen delimiter everywhere', async () => {
    expect(await render([transaction()], { delimiter: ';' })).toContain('2;Rohan Mehta;1200.50');
    expect(await render([transaction()], { delimiter: '\t' })).toContain('2\tRohan Mehta\t1200.50');
  });

  it('quotes a value containing the delimiter', async () => {
    const csv = await render([transaction({ name: 'Mehta, Rohan' })]);
    expect(csv).toContain('2,"Mehta, Rohan",1200.50');
  });

  it('doubles quotes inside a value', async () => {
    const csv = await render([transaction({ name: 'Rohan "Ro" Mehta' })]);
    expect(csv).toContain('2,"Rohan ""Ro"" Mehta",1200.50');
  });

  it('quotes a value containing a line break, keeping the row intact', async () => {
    const csv = await render([transaction({ name: 'Rohan\nMehta' })]);
    expect(csv).toContain('2,"Rohan\nMehta",1200.50\r\n');
  });

  it('neutralizes formulas and keeps non-ASCII text intact', async () => {
    const csv = await render([transaction({ name: '=1+1' }), transaction({ name: 'Zoë Ünal' })]);

    expect(csv).toContain("2,'=1+1,1200.50");
    expect(csv).toContain('2,Zoë Ünal,1200.50');
  });
});
