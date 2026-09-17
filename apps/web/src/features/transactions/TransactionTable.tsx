import type {
  SortField,
  TransactionListResponse,
  TransactionResponse,
  TransactionStatus,
} from '@finance/shared';
import {
  Avatar,
  Box,
  Chip,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TableSortLabel,
  Typography,
  useMediaQuery,
} from '@mui/material';
import { EmptyState } from '../../components/EmptyState';
import { formatDate, formatSignedMoney } from '../../lib/format';
import { tokens } from '../../theme/tokens';
import type { UpdateView } from './use-dashboard-view';
import { type DashboardView, PAGE_SIZES, type PageSize } from './url-filters';

interface Column {
  field: SortField;
  label: string;
  align?: 'right';
}

const COLUMNS: Column[] = [
  { field: 'user', label: 'User' },
  { field: 'date', label: 'Date' },
  { field: 'category', label: 'Category' },
  { field: 'status', label: 'Status' },
  { field: 'amount', label: 'Amount', align: 'right' },
];

interface TransactionTableProps {
  data: TransactionListResponse | undefined;
  isLoading: boolean;
  isShowingPreviousData: boolean;
  view: DashboardView;
  updateView: UpdateView;
  onClearFilters: () => void;
}

export function TransactionTable({
  data,
  isLoading,
  isShowingPreviousData,
  view,
  updateView,
  onClearFilters,
}: TransactionTableProps) {
  const isMobile = useMediaQuery(`(max-width:${tokens.layout.mobileMaxWidth}px)`);

  // Clicking the sorted column flips its direction; a new column starts ascending.
  const sortBy = (field: SortField) => {
    if (view.sortBy === field) {
      updateView({ sortDir: view.sortDir === 'asc' ? 'desc' : 'asc' });
    } else {
      updateView({ sortBy: field, sortDir: 'asc' });
    }
  };

  if (!isLoading && !data) {
    return <EmptyState title="Couldn't load transactions" message="Try again in a moment." />;
  }
  if (data?.total === 0) {
    return (
      <EmptyState
        title="No transactions match these filters"
        message="Try widening the date range or removing a filter."
        actionLabel="Clear filters"
        onAction={onClearFilters}
      />
    );
  }

  return (
    <Box sx={{ opacity: isShowingPreviousData ? 0.6 : 1, transition: 'opacity 150ms' }}>
      {isMobile ? (
        <MobileList rows={data?.data} isLoading={isLoading} view={view} updateView={updateView} />
      ) : (
        <TableContainer>
          <Table size="small" aria-label="Transactions">
            <TableHead>
              <TableRow>
                {COLUMNS.map((column) => {
                  const isSorted = view.sortBy === column.field;
                  return (
                    // sortDirection sets aria-sort, so screen readers announce the sort.
                    <TableCell
                      key={column.field}
                      align={column.align}
                      sortDirection={isSorted ? view.sortDir : false}
                    >
                      <TableSortLabel
                        active={isSorted}
                        direction={isSorted ? view.sortDir : 'asc'}
                        onClick={() => sortBy(column.field)}
                      >
                        {column.label}
                      </TableSortLabel>
                    </TableCell>
                  );
                })}
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading || !data
                ? Array.from({ length: view.pageSize }, (_, index) => <SkeletonRow key={index} />)
                : data.data.map((row) => <TransactionRow key={row.id} row={row} />)}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <TablePagination
        component="div"
        count={data?.total ?? 0}
        page={data ? view.page - 1 : 0}
        rowsPerPage={view.pageSize}
        rowsPerPageOptions={[...PAGE_SIZES]}
        onPageChange={(_event, page) => updateView({ page: page + 1 })}
        onRowsPerPageChange={(event) =>
          updateView({ pageSize: Number(event.target.value) as PageSize })
        }
        labelRowsPerPage="Rows"
        labelDisplayedRows={({ from, to, count }) => `Showing ${from}–${to} of ${count}`}
      />
    </Box>
  );
}

function TransactionRow({ row }: { row: TransactionResponse }) {
  return (
    <TableRow hover>
      <TableCell>
        <UserCell row={row} />
      </TableCell>
      <TableCell>{formatDate(row.date)}</TableCell>
      <TableCell>{row.category}</TableCell>
      <TableCell>
        <StatusChip status={row.status} />
      </TableCell>
      <TableCell align="right">
        <Amount row={row} />
      </TableCell>
    </TableRow>
  );
}

function SkeletonRow() {
  return (
    <TableRow>
      {COLUMNS.map((column) => (
        <TableCell key={column.field}>
          <Skeleton />
        </TableCell>
      ))}
    </TableRow>
  );
}

function UserCell({ row }: { row: TransactionResponse }) {
  return (
    <Stack direction="row" alignItems="center" spacing={1.5}>
      <Avatar src={row.user.avatarUrl} alt="" sx={{ width: 32, height: 32 }} />
      <Box>
        <Typography variant="body2">{row.user.name}</Typography>
        <Typography variant="caption">#{row.externalId}</Typography>
      </Box>
    </Stack>
  );
}

export function StatusChip({ status }: { status: TransactionStatus }) {
  const isPaid = status === 'Paid';
  return (
    <Chip
      label={status}
      size="small"
      sx={{
        color: isPaid ? tokens.color.brand : tokens.color.warning,
        backgroundColor: isPaid ? tokens.color.brandSoft : tokens.color.warningSoft,
      }}
    />
  );
}

function Amount({ row }: { row: TransactionResponse }) {
  // Expenses are shown in yellow as well as with a minus sign, so they stand out without
  // relying on colour alone.
  return (
    <Typography
      variant="body2"
      sx={{
        fontWeight: 600,
        fontVariantNumeric: 'tabular-nums',
        color: row.category === 'Revenue' ? tokens.color.brand : tokens.color.warning,
      }}
    >
      {formatSignedMoney(row.amount, row.category)}
    </Typography>
  );
}

interface MobileListProps {
  rows: TransactionResponse[] | undefined;
  isLoading: boolean;
  view: DashboardView;
  updateView: UpdateView;
}

/** Under 768px a five-column table doesn't fit, so each transaction becomes a card. */
function MobileList({ rows, isLoading, view, updateView }: MobileListProps) {
  return (
    <Stack spacing={1.5}>
      <FormControl size="small">
        <InputLabel id="mobile-sort-label">Sort by</InputLabel>
        <Select
          labelId="mobile-sort-label"
          label="Sort by"
          value={`${view.sortBy}:${view.sortDir}`}
          onChange={(event) => {
            const [sortBy, sortDir] = event.target.value.split(':') as [SortField, 'asc' | 'desc'];
            updateView({ sortBy, sortDir });
          }}
        >
          {COLUMNS.flatMap((column) => [
            <MenuItem key={`${column.field}:asc`} value={`${column.field}:asc`}>
              {column.label} ↑
            </MenuItem>,
            <MenuItem key={`${column.field}:desc`} value={`${column.field}:desc`}>
              {column.label} ↓
            </MenuItem>,
          ])}
        </Select>
      </FormControl>

      {isLoading || !rows
        ? Array.from({ length: 5 }, (_, index) => (
            <Skeleton key={index} variant="rounded" height={88} />
          ))
        : rows.map((row) => (
            <Paper key={row.id} variant="outlined" sx={{ p: 1.5, bgcolor: 'transparent' }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <UserCell row={row} />
                <Amount row={row} />
              </Stack>
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
                sx={{ mt: 1 }}
              >
                <Typography variant="caption">
                  {formatDate(row.date)} · {row.category}
                </Typography>
                <StatusChip status={row.status} />
              </Stack>
            </Paper>
          ))}
    </Stack>
  );
}
