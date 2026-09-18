import {
  TRANSACTION_CATEGORIES,
  TRANSACTION_STATUSES,
  type TransactionCategory,
  type TransactionStatus,
} from '@finance/shared';
import SearchIcon from '@mui/icons-material/Search';
import {
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  FormControl,
  InputAdornment,
  InputLabel,
  ListItemText,
  MenuItem,
  OutlinedInput,
  Select,
  Stack,
  TextField,
} from '@mui/material';
import { useMemo, useState } from 'react';
import { useDebouncedInput } from '../../lib/use-debounced-input';
import {
  DATE_PRESETS,
  DATE_PRESET_LABELS,
  type DatePreset,
  detectPreset,
  presetRange,
} from './date-presets';
import { useUsers } from './queries';
import type { UpdateView } from './use-dashboard-view';
import { CLEARED_FILTERS, type DashboardView, activeFilters, isRefiningText } from './url-filters';

const SEARCH_DEBOUNCE_MS = 300;
const AMOUNT_DEBOUNCE_MS = 500;
const AMOUNT = /^\d*(\.\d{0,2})?$/;

interface FilterBarProps {
  view: DashboardView;
  updateView: UpdateView;
}

export function FilterBar({ view, updateView }: FilterBarProps) {
  const { data: users } = useUsers();
  const userNames = useMemo(
    () => new Map((users?.data ?? []).map((user) => [user.externalId ?? user.id, user.name])),
    [users],
  );
  const chips = activeFilters(view, userNames);

  return (
    <Stack spacing={1.5}>
      {/* A grid keeps every field the same width and stops a lone field on the last row
          from stretching across the whole bar. */}
      <Box
        sx={{
          display: 'grid',
          gap: 1.5,
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(2, 1fr)',
            md: 'repeat(3, 1fr)',
            lg: 'repeat(6, 1fr)',
          },
        }}
      >
        <SearchField
          value={view.search}
          onCommit={(search) =>
            updateView({ search }, { replace: isRefiningText(view.search, search) })
          }
        />
        <DateRangeFilter view={view} updateView={updateView} />
        <AmountField
          label="Min amount"
          value={view.amountMin}
          onCommit={(amountMin) =>
            updateView({ amountMin }, { replace: isRefiningText(view.amountMin, amountMin) })
          }
        />
        <AmountField
          label="Max amount"
          value={view.amountMax}
          onCommit={(amountMax) =>
            updateView({ amountMax }, { replace: isRefiningText(view.amountMax, amountMax) })
          }
        />
        <MultiSelectFilter<TransactionCategory>
          label="Category"
          options={TRANSACTION_CATEGORIES.map((value) => ({ value, label: value }))}
          selected={view.categories}
          onChange={(categories) => updateView({ categories })}
        />
        <MultiSelectFilter<TransactionStatus>
          label="Status"
          options={TRANSACTION_STATUSES.map((value) => ({ value, label: value }))}
          selected={view.statuses}
          onChange={(statuses) => updateView({ statuses })}
        />
        <MultiSelectFilter<string>
          label="User"
          options={[...userNames].map(([value, label]) => ({ value, label }))}
          selected={view.userIds}
          onChange={(userIds) => updateView({ userIds })}
        />
      </Box>

      {chips.length > 0 && (
        <Stack direction="row" flexWrap="wrap" useFlexGap spacing={1} alignItems="center">
          {chips.map((chip) => (
            <Chip
              key={chip.key}
              label={chip.label}
              size="small"
              onDelete={() => updateView(chip.removal)}
            />
          ))}
          <Button size="small" onClick={() => updateView(CLEARED_FILTERS)}>
            Clear all
          </Button>
        </Stack>
      )}
    </Stack>
  );
}

function SearchField({ value, onCommit }: { value: string; onCommit: (next: string) => void }) {
  const { text, setText, isPending } = useDebouncedInput(
    value,
    (next) => onCommit(next.trim()),
    SEARCH_DEBOUNCE_MS,
  );

  return (
    <TextField
      size="small"
      value={text}
      onChange={(event) => setText(event.target.value)}
      // Says exactly what is searchable: the data has no description field to search.
      placeholder="Search ID, user, status or amount"
      inputProps={{ 'aria-label': 'Search transactions' }}
      sx={{ gridColumn: { lg: 'span 2' } }}
      InputProps={{
        startAdornment: (
          <InputAdornment position="start">
            <SearchIcon fontSize="small" />
          </InputAdornment>
        ),
        endAdornment: isPending ? <CircularProgress size={14} aria-label="Searching" /> : null,
      }}
    />
  );
}

function DateRangeFilter({ view, updateView }: FilterBarProps) {
  const detected = detectPreset(view.dateFrom, view.dateTo, new Date());
  // "Custom" with no dates yet can't be detected from the URL, so remember the choice.
  const [customChosen, setCustomChosen] = useState(false);
  const preset: DatePreset = customChosen && detected === 'all' ? 'custom' : detected;

  const choosePreset = (next: DatePreset) => {
    setCustomChosen(next === 'custom');
    if (next === 'all') {
      updateView({ dateFrom: null, dateTo: null });
    } else if (next !== 'custom') {
      updateView(presetRange(next, new Date()));
    }
  };

  return (
    <>
      <FormControl size="small">
        <InputLabel id="date-preset-label">Date</InputLabel>
        <Select
          labelId="date-preset-label"
          label="Date"
          value={preset}
          onChange={(event) => choosePreset(event.target.value as DatePreset)}
        >
          {DATE_PRESETS.map((option) => (
            <MenuItem key={option} value={option}>
              {DATE_PRESET_LABELS[option]}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      {preset === 'custom' && (
        <>
          <TextField
            size="small"
            type="date"
            label="From"
            InputLabelProps={{ shrink: true }}
            value={view.dateFrom ?? ''}
            onChange={(event) => updateView({ dateFrom: event.target.value || null })}
          />
          <TextField
            size="small"
            type="date"
            label="To"
            InputLabelProps={{ shrink: true }}
            value={view.dateTo ?? ''}
            onChange={(event) => updateView({ dateTo: event.target.value || null })}
          />
        </>
      )}
    </>
  );
}

interface AmountFieldProps {
  label: string;
  value: string | null;
  onCommit: (next: string | null) => void;
}

function AmountField({ label, value, onCommit }: AmountFieldProps) {
  const { text, setText } = useDebouncedInput(
    value ?? '',
    (next) => onCommit(next === '' ? null : next),
    AMOUNT_DEBOUNCE_MS,
  );

  return (
    <TextField
      size="small"
      label={label}
      value={text}
      // Only digits and up to two decimals can be typed, so an invalid amount never commits.
      onChange={(event) => AMOUNT.test(event.target.value) && setText(event.target.value)}
      inputProps={{ inputMode: 'decimal' }}
      InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
    />
  );
}

interface MultiSelectFilterProps<T extends string> {
  label: string;
  options: { value: T; label: string }[];
  selected: T[];
  onChange: (selected: T[]) => void;
}

function MultiSelectFilter<T extends string>({
  label,
  options,
  selected,
  onChange,
}: MultiSelectFilterProps<T>) {
  const labelId = `${label.toLowerCase()}-filter-label`;
  const labelOf = (value: T) => options.find((option) => option.value === value)?.label ?? value;

  return (
    <FormControl size="small">
      <InputLabel id={labelId}>{label}</InputLabel>
      <Select<T[]>
        multiple
        labelId={labelId}
        value={selected}
        onChange={(event) => onChange(event.target.value as T[])}
        input={<OutlinedInput label={label} />}
        renderValue={(values) =>
          values.length === 1 && values[0] ? labelOf(values[0]) : `${values.length} selected`
        }
      >
        {options.map((option) => (
          <MenuItem key={option.value} value={option.value}>
            <Checkbox size="small" checked={selected.includes(option.value)} />
            <ListItemText primary={option.label} />
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}
