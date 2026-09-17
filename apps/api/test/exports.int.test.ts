import type {
  ErrorEnvelope,
  ExportTemplateListResponse,
  ExportTicketResponse,
  LoginResponse,
} from '@finance/shared';
import { getModelToken } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { EXPORT_JOB_MODEL, type ExportJob } from '../src/exports/export-job.schema';
import { DATASET, type SeededApp, startSeededApp, stopSeededApp } from './helpers/seeded-app';

const BOM = '﻿';

describe('CSV export', () => {
  let seeded: SeededApp;

  beforeAll(async () => {
    seeded = await startSeededApp();
  });

  afterAll(async () => {
    await stopSeededApp(seeded);
  });

  async function prepare(body: object, status = 201, accessToken = seeded.accessToken) {
    const response = await request(seeded.server)
      .post('/api/v1/exports')
      .set('Authorization', `Bearer ${accessToken}`)
      .send(body)
      .expect(status);
    return response.body as ExportTicketResponse & ErrorEnvelope;
  }

  function download(token: string) {
    return request(seeded.server)
      .get(`/api/v1/exports/${token}/download`)
      .buffer(true)
      .parse((response, done) => {
        let text = '';
        response.setEncoding('utf8');
        response.on('data', (chunk: string) => (text += chunk));
        response.on('end', () => done(null, text));
      });
  }

  async function exportCsv(body: object): Promise<{ csv: string; lines: string[] }> {
    const ticket = await prepare(body);
    const response = await download(ticket.downloadToken).expect(200);
    const csv = response.body as string;
    // Split on CRLF; the file ends with one, so drop the final empty entry.
    return { csv, lines: csv.replace(BOM, '').split('\r\n').slice(0, -1) };
  }

  it('requires login to prepare an export', async () => {
    await request(seeded.server)
      .post('/api/v1/exports')
      .send({ columns: ['date'] })
      .expect(401);
  });

  it('streams every row as a real file download with the resolved filename', async () => {
    const ticket = await prepare({
      columns: ['externalId', 'date', 'amount'],
      filenameTemplate: 'all_{category}',
    });
    expect(ticket).toMatchObject({ estimatedRows: 300, resolvedFilename: 'all_all.csv' });

    const response = await download(ticket.downloadToken).expect(200);
    const csv = response.body as string;

    expect(response.headers['content-type']).toBe('text/csv; charset=utf-8');
    expect(response.headers['content-disposition']).toBe('attachment; filename="all_all.csv"');
    expect(csv.startsWith(BOM)).toBe(true);
    expect(csv.replace(BOM, '').split('\r\n').slice(0, -1)).toHaveLength(301);
  });

  it('writes only the chosen columns, in the chosen order', async () => {
    const { lines } = await exportCsv({
      columns: ['amount', 'user.name', 'externalId'],
      filters: { search: '1200.50' },
    });

    expect(lines[0]).toBe('Amount,User,Transaction ID');
    expect(lines).toContain('1200.50,Rohan Mehta,2');
  });

  it('can leave out headers, use another delimiter and date format', async () => {
    const { lines } = await exportCsv({
      columns: ['externalId', 'date'],
      includeHeaders: false,
      delimiter: ';',
      dateFormat: 'DD/MM/YYYY',
      filters: { search: '1200.50' },
    });

    expect(lines).toContain('2;21/02/2024');
    expect(lines[0]).not.toContain('Transaction ID');
  });

  it('exports exactly the rows the same filters show in the table', async () => {
    const filters = { status: ['Pending'], category: ['Expense'], userId: ['user_004'] };
    const expected = DATASET.filter(
      (row) => row.status === 'Pending' && row.category === 'Expense' && row.user_id === 'user_004',
    );

    const { lines } = await exportCsv({ columns: ['externalId'], filters });

    expect(lines).toHaveLength(expected.length + 1);
    expect(
      lines
        .slice(1)
        .map(Number)
        .sort((a, b) => a - b),
    ).toEqual(expected.map((row) => row.id).sort((a, b) => a - b));
  });

  it('writes amounts with two decimals and expenses negative in the signed column', async () => {
    const { lines } = await exportCsv({
      columns: ['externalId', 'amount', 'signedAmount'],
      filters: { search: '1200.50' },
    });
    expect(lines).toContain('2,1200.50,-1200.50');
  });

  it('refuses to export zero rows', async () => {
    const body = await prepare({ columns: ['date'], filters: { amountMin: 999999 } }, 400);
    expect(body.code).toBe('EXPORT_NO_ROWS');
  });

  it('refuses zero columns or an unknown column', async () => {
    expect((await prepare({ columns: [] }, 400)).code).toBe('VALIDATION_FAILED');
    expect((await prepare({ columns: ['passwordHash'] }, 400)).code).toBe('VALIDATION_FAILED');
  });

  it('makes a download link single-use', async () => {
    const ticket = await prepare({ columns: ['date'] });

    await download(ticket.downloadToken).expect(200);
    const second = await request(seeded.server)
      .get(`/api/v1/exports/${ticket.downloadToken}/download`)
      .expect(401);

    expect((second.body as ErrorEnvelope).code).toBe('EXPORT_TOKEN_INVALID');
  });

  it('rejects an expired link', async () => {
    const ticket = await prepare({ columns: ['date'] });
    const jobs = seeded.app.get<Model<ExportJob>>(getModelToken(EXPORT_JOB_MODEL));
    await jobs.updateMany({ usedAt: null }, { expiresAt: new Date(Date.now() - 1000) });

    const response = await request(seeded.server)
      .get(`/api/v1/exports/${ticket.downloadToken}/download`)
      .expect(401);

    expect((response.body as ErrorEnvelope).code).toBe('EXPORT_TOKEN_INVALID');
  });

  it('rejects a made-up or altered link', async () => {
    const ticket = await prepare({ columns: ['date'] });
    const altered = `${ticket.downloadToken.slice(0, -1)}${ticket.downloadToken.endsWith('A') ? 'B' : 'A'}`;

    await request(seeded.server).get('/api/v1/exports/not-a-real-token/download').expect(401);
    await request(seeded.server).get(`/api/v1/exports/${altered}/download`).expect(401);
  });

  describe('templates', () => {
    const template = {
      name: 'Month-end',
      columns: ['date', 'signedAmount'],
      dateFormat: 'DD/MM/YYYY',
      delimiter: ';',
      includeHeaders: true,
    };

    it('saves a template and lists it for its owner only', async () => {
      await request(seeded.server)
        .post('/api/v1/export-templates')
        .set('Authorization', `Bearer ${seeded.accessToken}`)
        .send(template)
        .expect(201);

      const mine = await request(seeded.server)
        .get('/api/v1/export-templates')
        .set('Authorization', `Bearer ${seeded.accessToken}`)
        .expect(200);
      expect((mine.body as ExportTemplateListResponse).data).toEqual([
        { id: expect.any(String) as unknown, ...template },
      ]);

      const otherLogin = await request(seeded.server)
        .post('/api/v1/auth/login')
        .send({ email: 'kabir.singh@example.com', password: 'Analyst@2024' })
        .expect(200);
      const theirs = await request(seeded.server)
        .get('/api/v1/export-templates')
        .set('Authorization', `Bearer ${(otherLogin.body as LoginResponse).accessToken}`)
        .expect(200);
      expect((theirs.body as ExportTemplateListResponse).data).toEqual([]);
    });

    it('refuses a second template with the same name', async () => {
      const response = await request(seeded.server)
        .post('/api/v1/export-templates')
        .set('Authorization', `Bearer ${seeded.accessToken}`)
        .send(template)
        .expect(400);

      expect((response.body as ErrorEnvelope).details).toEqual([
        { field: 'name', message: 'a template with this name already exists' },
      ]);
    });
  });
});
