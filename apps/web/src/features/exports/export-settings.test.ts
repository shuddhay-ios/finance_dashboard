import { EXPORT_PRESETS } from '@finance/shared';
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_EXPORT_SETTINGS,
  addColumn,
  applyPreset,
  applyTemplate,
  availableColumns,
  moveColumn,
  removeColumn,
} from './export-settings';

describe('column helpers', () => {
  it('lists only columns not chosen yet', () => {
    expect(availableColumns(['date', 'amount'])).not.toContain('date');
    expect(availableColumns(['date', 'amount'])).toContain('externalId');
  });

  it('adds to the end, never twice, and removes', () => {
    expect(addColumn(['date'], 'amount')).toEqual(['date', 'amount']);
    expect(addColumn(['date'], 'date')).toEqual(['date']);
    expect(removeColumn(['date', 'amount'], 'date')).toEqual(['amount']);
  });

  it('moves a column down or up to where it was dropped', () => {
    const columns = ['date', 'user.name', 'category', 'amount'] as const;

    expect(moveColumn([...columns], 'date', 'category')).toEqual([
      'user.name',
      'category',
      'date',
      'amount',
    ]);
    expect(moveColumn([...columns], 'amount', 'user.name')).toEqual([
      'date',
      'amount',
      'user.name',
      'category',
    ]);
  });

  it('ignores a move involving an unknown column', () => {
    expect(moveColumn(['date'], 'amount', 'date')).toEqual(['date']);
  });
});

describe('presets and templates', () => {
  it('a preset changes only the columns', () => {
    const custom = { ...DEFAULT_EXPORT_SETTINGS, delimiter: ';' as const };
    const summary = EXPORT_PRESETS.find((preset) => preset.id === 'summary');

    const next = summary ? applyPreset(custom, summary) : custom;

    expect(next.columns).toEqual(['date', 'category', 'amount']);
    expect(next.delimiter).toBe(';');
  });

  it('a template restores columns and format', () => {
    const next = applyTemplate(DEFAULT_EXPORT_SETTINGS, {
      id: 't1',
      name: 'Month-end',
      columns: ['date', 'signedAmount'],
      dateFormat: 'DD/MM/YYYY',
      delimiter: '\t',
      includeHeaders: false,
    });

    expect(next).toMatchObject({
      columns: ['date', 'signedAmount'],
      dateFormat: 'DD/MM/YYYY',
      delimiter: '\t',
      includeHeaders: false,
    });
  });
});
