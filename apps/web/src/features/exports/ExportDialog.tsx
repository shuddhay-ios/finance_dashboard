import {
  DATE_FORMATS,
  type DateFormat,
  type Delimiter,
  EXPORT_PRESETS,
  FILENAME_VARIABLES,
  resolveExportFilename,
} from '@finance/shared';
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import CloseIcon from '@mui/icons-material/Close';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Switch,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  useMediaQuery,
} from '@mui/material';
import { type ReactNode, useState } from 'react';
import { reportError, reportSuccess } from '../../components/alert-chips/report-error';
import { exportDownloadUrl, startDownload } from '../../lib/download';
import { tokens } from '../../theme/tokens';
import { type DashboardView, filterQuery } from '../transactions/url-filters';
import { ColumnPicker } from './ColumnPicker';
import {
  DEFAULT_EXPORT_SETTINGS,
  type ExportScope,
  type ExportSettings,
  applyPreset,
  applyTemplate,
  sameColumns,
} from './export-settings';
import { ExportPreview } from './ExportPreview';
import {
  PREVIEW_ROWS,
  useExportPreview,
  useExportTemplates,
  usePrepareExport,
  useSaveTemplate,
} from './queries';

const DELIMITER_LABELS: Record<Delimiter, string> = { ',': 'Comma', ';': 'Semicolon', '\t': 'Tab' };

interface ExportDialogProps {
  open: boolean;
  onClose: () => void;
  view: DashboardView;
}

export function ExportDialog({ open, onClose, view }: ExportDialogProps) {
  const isMobile = useMediaQuery(`(max-width:${tokens.layout.mobileMaxWidth}px)`);
  const [settings, setSettings] = useState<ExportSettings>(DEFAULT_EXPORT_SETTINGS);
  const update = (changes: Partial<ExportSettings>) =>
    setSettings((current) => ({ ...current, ...changes }));

  const dashboardFilters = filterQuery(view);
  const hasDashboardFilters = Object.keys(dashboardFilters).length > 0;
  // With no active filters "current filters" and "all" are the same thing, so show "all".
  const scope: ExportScope = hasDashboardFilters ? settings.scope : 'all';
  const filters = scope === 'filtered' ? dashboardFilters : {};

  const preview = useExportPreview(filters, open);
  const templates = useExportTemplates(open);
  const prepareExport = usePrepareExport();

  const rowCount = preview.data?.total;
  const filename = resolveExportFilename(settings.filenameTemplate, filters, new Date());
  const blockedReason =
    settings.columns.length === 0
      ? 'Choose at least one column to export.'
      : rowCount === 0
        ? 'No transactions match these filters, so there is nothing to export.'
        : null;

  const handleExport = () => {
    prepareExport.mutate(
      {
        columns: settings.columns,
        dateFormat: settings.dateFormat,
        delimiter: settings.delimiter,
        includeHeaders: settings.includeHeaders,
        filenameTemplate: settings.filenameTemplate,
        filters,
      },
      {
        onSuccess: (ticket) => {
          // Follow the single-use link straight away; it is only valid for 60 seconds.
          startDownload(exportDownloadUrl(ticket.downloadToken));
          reportSuccess(`Downloading ${ticket.resolvedFilename} (${ticket.estimatedRows} rows)`);
          onClose();
        },
        onError: (error) => reportError(error),
      },
    );
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="lg"
      fullScreen={isMobile}
      aria-labelledby="export-dialog-title"
    >
      <DialogTitle id="export-dialog-title" sx={{ pr: 7 }}>
        Export transactions
        <Typography variant="body2" color="text.secondary">
          Pick the columns and their order, check the preview, then download.
        </Typography>
        <IconButton
          aria-label="Close"
          onClick={onClose}
          sx={{ position: 'absolute', right: 12, top: 12 }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        <Grid container spacing={3}>
          <Grid item xs={12} md={5}>
            <Stack spacing={3}>
              <Section step={1} title="Which transactions">
                <ToggleButtonGroup
                  exclusive
                  fullWidth
                  size="small"
                  value={scope}
                  onChange={(_event, next: ExportScope | null) => next && update({ scope: next })}
                  aria-label="Which transactions to export"
                >
                  <ToggleButton value="filtered" disabled={!hasDashboardFilters}>
                    Current filters
                  </ToggleButton>
                  <ToggleButton value="all">All transactions</ToggleButton>
                </ToggleButtonGroup>
                {!hasDashboardFilters && (
                  <Typography variant="caption" component="p" sx={{ mt: 1 }}>
                    No filters are active on the dashboard, so every transaction is exported.
                  </Typography>
                )}
              </Section>

              <Section step={2} title="Columns">
                <Stack direction="row" flexWrap="wrap" useFlexGap spacing={1} sx={{ mb: 2 }}>
                  {EXPORT_PRESETS.map((preset) => (
                    <Chip
                      key={preset.id}
                      label={preset.name}
                      onClick={() => setSettings((current) => applyPreset(current, preset))}
                      color={sameColumns(preset.columns, settings.columns) ? 'primary' : 'default'}
                      variant={
                        sameColumns(preset.columns, settings.columns) ? 'filled' : 'outlined'
                      }
                    />
                  ))}
                  {templates.data?.data.map((template) => (
                    <Chip
                      key={template.id}
                      icon={<BookmarkBorderIcon />}
                      label={template.name}
                      variant="outlined"
                      onClick={() => setSettings((current) => applyTemplate(current, template))}
                    />
                  ))}
                </Stack>
                <ColumnPicker
                  columns={settings.columns}
                  onChange={(columns) => update({ columns })}
                />
                <SaveTemplate settings={settings} />
              </Section>
            </Stack>
          </Grid>

          <Grid item xs={12} md={7}>
            <Stack spacing={3}>
              <Section
                step={3}
                title="Preview"
                subtitle={
                  rowCount === undefined
                    ? undefined
                    : `First ${Math.min(PREVIEW_ROWS, rowCount)} of ${rowCount} rows, exactly as they will appear in the file`
                }
              >
                <ExportPreview
                  rows={preview.data?.data}
                  columns={settings.columns}
                  dateFormat={settings.dateFormat}
                  includeHeaders={settings.includeHeaders}
                  isLoading={preview.isPending}
                />
              </Section>

              {/* Most people never need these, so they start collapsed. The summary line
                  still shows the current choices, so nothing about the file is hidden. */}
              <Accordion
                disableGutters
                elevation={0}
                sx={{
                  bgcolor: tokens.color.surfaceRaised,
                  borderRadius: `${tokens.radius.sm}px`,
                  '&::before': { display: 'none' },
                }}
              >
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box>
                    <Typography variant="h3">Advanced options</Typography>
                    <Typography variant="caption">
                      {settings.dateFormat} · {DELIMITER_LABELS[settings.delimiter]} ·{' '}
                      {settings.includeHeaders ? 'Header row' : 'No header row'} · {filename}
                    </Typography>
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <Stack spacing={3}>
                    <AdvancedFormat settings={settings} update={update} />
                    <AdvancedFilename settings={settings} update={update} filename={filename} />
                  </Stack>
                </AccordionDetails>
              </Accordion>
            </Stack>
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, flexWrap: 'wrap', gap: 1 }}>
        <Box sx={{ flex: 1, minWidth: 200 }}>
          {blockedReason ? (
            <Alert severity="warning" sx={{ py: 0 }}>
              {blockedReason}
            </Alert>
          ) : (
            rowCount !== undefined && (
              <Chip
                label={`${rowCount} row${rowCount === 1 ? '' : 's'} will be exported`}
                sx={{ color: tokens.color.brand, bgcolor: tokens.color.brandSoft }}
              />
            )
          )}
        </Box>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button
          variant="contained"
          startIcon={prepareExport.isPending ? undefined : <FileDownloadOutlinedIcon />}
          onClick={handleExport}
          disabled={blockedReason !== null || rowCount === undefined || prepareExport.isPending}
        >
          {prepareExport.isPending ? <CircularProgress size={22} color="inherit" /> : 'Export CSV'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

interface SectionProps {
  step?: number;
  title: string;
  subtitle?: string;
  children: ReactNode;
}

function Section({ step, title, subtitle, children }: SectionProps) {
  return (
    <Box component="section">
      <Typography variant="h3" sx={{ mb: subtitle ? 0 : 1.5 }}>
        {step !== undefined && (
          <Box component="span" sx={{ color: tokens.color.brand, mr: 1 }}>
            {step}.
          </Box>
        )}
        {title}
      </Typography>
      {subtitle && (
        <Typography variant="caption" component="p" sx={{ mb: 1.5 }}>
          {subtitle}
        </Typography>
      )}
      {children}
    </Box>
  );
}

function SaveTemplate({ settings }: { settings: ExportSettings }) {
  const [name, setName] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const saveTemplate = useSaveTemplate();

  if (!isOpen) {
    return (
      <Button
        size="small"
        startIcon={<BookmarkBorderIcon />}
        onClick={() => setIsOpen(true)}
        disabled={settings.columns.length === 0}
        sx={{ mt: 1 }}
      >
        Save as template
      </Button>
    );
  }

  const save = () => {
    saveTemplate.mutate(
      {
        name: name.trim(),
        columns: settings.columns,
        dateFormat: settings.dateFormat,
        delimiter: settings.delimiter,
        includeHeaders: settings.includeHeaders,
      },
      {
        onSuccess: (template) => {
          reportSuccess(`Template "${template.name}" saved`);
          setName('');
          setIsOpen(false);
        },
        onError: (error) => reportError(error),
      },
    );
  };

  return (
    <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
      <TextField
        size="small"
        label="Template name"
        value={name}
        autoFocus
        onChange={(event) => setName(event.target.value)}
        onKeyDown={(event) => event.key === 'Enter' && name.trim() && save()}
        sx={{ flex: 1 }}
      />
      <Button variant="outlined" onClick={save} disabled={!name.trim() || saveTemplate.isPending}>
        Save
      </Button>
      <Button color="inherit" onClick={() => setIsOpen(false)}>
        Cancel
      </Button>
    </Stack>
  );
}

interface AdvancedProps {
  settings: ExportSettings;
  update: (changes: Partial<ExportSettings>) => void;
}

function AdvancedFormat({ settings, update }: AdvancedProps) {
  return (
    <Box>
      <Typography variant="body2" sx={{ fontWeight: 500, mb: 1.5 }}>
        Format
      </Typography>
      <Stack direction="row" flexWrap="wrap" useFlexGap spacing={2} alignItems="center">
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel id="date-format-label">Date format</InputLabel>
          <Select
            labelId="date-format-label"
            label="Date format"
            value={settings.dateFormat}
            onChange={(event) => update({ dateFormat: event.target.value as DateFormat })}
          >
            {DATE_FORMATS.map((format) => (
              <MenuItem key={format} value={format}>
                {format}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <ToggleButtonGroup
          exclusive
          size="small"
          value={settings.delimiter}
          onChange={(_event, delimiter: Delimiter | null) => delimiter && update({ delimiter })}
          aria-label="Separator"
        >
          {(Object.keys(DELIMITER_LABELS) as Delimiter[]).map((delimiter) => (
            <ToggleButton key={delimiter} value={delimiter}>
              {DELIMITER_LABELS[delimiter]}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
        <FormControlLabel
          control={
            <Switch
              checked={settings.includeHeaders}
              onChange={(event) => update({ includeHeaders: event.target.checked })}
            />
          }
          label="Header row"
        />
      </Stack>
    </Box>
  );
}

function AdvancedFilename({ settings, update, filename }: AdvancedProps & { filename: string }) {
  return (
    <Box>
      <TextField
        size="small"
        fullWidth
        label="File name template"
        value={settings.filenameTemplate}
        onChange={(event) => update({ filenameTemplate: event.target.value })}
        helperText={
          <>
            Saves as <strong>{filename}</strong>
          </>
        }
      />
      <Stack direction="row" flexWrap="wrap" useFlexGap spacing={0.75} sx={{ mt: 1 }}>
        {FILENAME_VARIABLES.map((variable) => (
          <Chip
            key={variable}
            size="small"
            variant="outlined"
            label={`{${variable}}`}
            onClick={() =>
              update({ filenameTemplate: `${settings.filenameTemplate}_{${variable}}` })
            }
          />
        ))}
      </Stack>
    </Box>
  );
}
