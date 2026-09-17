import {
  DEFAULT_FILENAME_TEMPLATE,
  EXPORT_COLUMN_KEYS,
  type DateFormat,
  type Delimiter,
  type ExportColumnKey,
  type ExportPreset,
  type ExportTemplateResponse,
} from '@finance/shared';

/** Export what the dashboard is showing, or every transaction. */
export type ExportScope = 'filtered' | 'all';

/** Everything the user chooses in the export modal. */
export interface ExportSettings {
  columns: ExportColumnKey[];
  dateFormat: DateFormat;
  delimiter: Delimiter;
  includeHeaders: boolean;
  filenameTemplate: string;
  scope: ExportScope;
}

export const DEFAULT_EXPORT_SETTINGS: ExportSettings = {
  columns: ['date', 'user.name', 'category', 'status', 'amount'],
  dateFormat: 'YYYY-MM-DD',
  delimiter: ',',
  includeHeaders: true,
  filenameTemplate: DEFAULT_FILENAME_TEMPLATE,
  scope: 'filtered',
};

/** Columns not chosen yet, in their natural order. */
export function availableColumns(selected: ExportColumnKey[]): ExportColumnKey[] {
  return EXPORT_COLUMN_KEYS.filter((column) => !selected.includes(column));
}

export function addColumn(columns: ExportColumnKey[], column: ExportColumnKey): ExportColumnKey[] {
  return columns.includes(column) ? columns : [...columns, column];
}

export function removeColumn(
  columns: ExportColumnKey[],
  column: ExportColumnKey,
): ExportColumnKey[] {
  return columns.filter((existing) => existing !== column);
}

/** Moves `moved` to the position of `target`, the way a drag-and-drop list reorders. */
export function moveColumn(
  columns: ExportColumnKey[],
  moved: ExportColumnKey,
  target: ExportColumnKey,
): ExportColumnKey[] {
  const from = columns.indexOf(moved);
  const to = columns.indexOf(target);
  if (from === -1 || to === -1) {
    return columns;
  }
  const withoutMoved = columns.filter((column) => column !== moved);
  return [...withoutMoved.slice(0, to), moved, ...withoutMoved.slice(to)];
}

/** Presets only set columns; the user's format choices stay as they are. */
export function applyPreset(settings: ExportSettings, preset: ExportPreset): ExportSettings {
  return { ...settings, columns: [...preset.columns] };
}

/** A saved template restores columns and format. */
export function applyTemplate(
  settings: ExportSettings,
  template: ExportTemplateResponse,
): ExportSettings {
  return {
    ...settings,
    columns: [...template.columns],
    dateFormat: template.dateFormat,
    delimiter: template.delimiter,
    includeHeaders: template.includeHeaders,
  };
}

export function sameColumns(a: ExportColumnKey[], b: ExportColumnKey[]): boolean {
  return a.length === b.length && a.every((column, index) => column === b[index]);
}
