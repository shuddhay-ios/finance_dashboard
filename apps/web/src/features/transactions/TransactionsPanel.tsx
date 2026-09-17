import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import { Button, Paper, Stack, Typography } from '@mui/material';
import { useState } from 'react';
import { ExportDialog } from '../exports/ExportDialog';
import { useTransactions } from './queries';
import { TransactionTable } from './TransactionTable';
import type { UpdateView } from './use-dashboard-view';
import { CLEARED_FILTERS, type DashboardView } from './url-filters';

interface TransactionsPanelProps {
  view: DashboardView;
  updateView: UpdateView;
}

/** The transactions table with its Export button, used on the Dashboard and Transactions pages. */
export function TransactionsPanel({ view, updateView }: TransactionsPanelProps) {
  const transactions = useTransactions(view);
  const [isExportOpen, setIsExportOpen] = useState(false);

  return (
    <Paper sx={{ p: { xs: 2, md: 2.5 } }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h2">Transactions</Typography>
        <Button
          variant="contained"
          startIcon={<FileDownloadOutlinedIcon />}
          onClick={() => setIsExportOpen(true)}
        >
          Export
        </Button>
      </Stack>
      <TransactionTable
        data={transactions.data}
        isLoading={transactions.isPending}
        isShowingPreviousData={transactions.isPlaceholderData}
        view={view}
        updateView={updateView}
        onClearFilters={() => updateView(CLEARED_FILTERS)}
      />
      {/* Mounted only while open, so each export starts from fresh settings. */}
      {isExportOpen && <ExportDialog open onClose={() => setIsExportOpen(false)} view={view} />}
    </Paper>
  );
}
