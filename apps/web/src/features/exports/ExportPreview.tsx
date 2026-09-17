import {
  type DateFormat,
  type ExportColumnKey,
  type TransactionResponse,
  exportHeader,
  exportRecord,
} from '@finance/shared';
import {
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { tokens } from '../../theme/tokens';

interface ExportPreviewProps {
  rows: TransactionResponse[] | undefined;
  columns: ExportColumnKey[];
  dateFormat: DateFormat;
  includeHeaders: boolean;
  isLoading: boolean;
}

/**
 * The first rows of the file. Cells come from the same shared exportRecord function the
 * server uses to write the CSV, so the preview can't disagree with the download.
 */
export function ExportPreview({
  rows,
  columns,
  dateFormat,
  includeHeaders,
  isLoading,
}: ExportPreviewProps) {
  if (columns.length === 0) {
    return <Typography variant="caption">Choose at least one column to see a preview.</Typography>;
  }
  if (isLoading) {
    return <Skeleton variant="rounded" height={180} />;
  }
  if (!rows || rows.length === 0) {
    return <Typography variant="caption">No rows to preview.</Typography>;
  }

  return (
    <TableContainer
      sx={{ border: `1px solid ${tokens.color.border}`, borderRadius: `${tokens.radius.sm}px` }}
    >
      <Table size="small" aria-label="Export preview">
        {includeHeaders && (
          <TableHead>
            <TableRow>
              {exportHeader(columns).map((header, index) => (
                <TableCell key={columns[index]}>{header}</TableCell>
              ))}
            </TableRow>
          </TableHead>
        )}
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              {exportRecord(row, columns, dateFormat).map((cell, index) => (
                <TableCell
                  key={columns[index]}
                  sx={{ fontFamily: 'ui-monospace, Consolas, monospace', whiteSpace: 'nowrap' }}
                >
                  {cell}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
