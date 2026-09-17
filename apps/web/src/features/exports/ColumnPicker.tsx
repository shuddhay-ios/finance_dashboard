import { EXPORT_COLUMN_LABELS, type ExportColumnKey } from '@finance/shared';
import {
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import {
  Box,
  Grid,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Typography,
} from '@mui/material';
import { tokens } from '../../theme/tokens';
import { addColumn, availableColumns, moveColumn, removeColumn } from './export-settings';

interface ColumnPickerProps {
  columns: ExportColumnKey[];
  onChange: (columns: ExportColumnKey[]) => void;
}

/** Two panes: click a column on the left to add it; drag on the right to set the order. */
export function ColumnPicker({ columns, onChange }: ColumnPickerProps) {
  const sensors = useSensors(
    // A few pixels of movement before a drag starts, so clicking "remove" never drags.
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    // Keyboard reordering: focus a handle, Space to pick up, arrows to move, Space to drop.
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (over && active.id !== over.id) {
      onChange(moveColumn(columns, active.id as ExportColumnKey, over.id as ExportColumnKey));
    }
  };

  const available = availableColumns(columns);

  return (
    <Grid container spacing={2}>
      <Grid item xs={12} sm={5}>
        <PaneTitle>Available</PaneTitle>
        <List dense disablePadding aria-label="Available columns">
          {available.length === 0 && <EmptyPane>All columns are selected</EmptyPane>}
          {available.map((column) => (
            <ListItemButton
              key={column}
              onClick={() => onChange(addColumn(columns, column))}
              aria-label={`Add ${EXPORT_COLUMN_LABELS[column]}`}
              sx={paneItemSx}
            >
              <ListItemText primary={EXPORT_COLUMN_LABELS[column]} />
              <AddIcon fontSize="small" sx={{ color: tokens.color.brand }} />
            </ListItemButton>
          ))}
        </List>
      </Grid>

      <Grid item xs={12} sm={7}>
        <PaneTitle>Selected · drag to reorder</PaneTitle>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={columns} strategy={verticalListSortingStrategy}>
            <List dense disablePadding aria-label="Selected columns, in file order">
              {columns.length === 0 && <EmptyPane>Add at least one column</EmptyPane>}
              {columns.map((column, index) => (
                <SortableColumn
                  key={column}
                  column={column}
                  position={index + 1}
                  onRemove={() => onChange(removeColumn(columns, column))}
                />
              ))}
            </List>
          </SortableContext>
        </DndContext>
      </Grid>
    </Grid>
  );
}

interface SortableColumnProps {
  column: ExportColumnKey;
  position: number;
  onRemove: () => void;
}

function SortableColumn({ column, position, onRemove }: SortableColumnProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: column,
  });
  const label = EXPORT_COLUMN_LABELS[column];

  return (
    <ListItem
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      sx={{
        ...paneItemSx,
        bgcolor: tokens.color.surfaceRaised,
        border: `1px solid ${isDragging ? tokens.color.brand : 'transparent'}`,
        zIndex: isDragging ? 1 : 'auto',
        pl: 0.5,
      }}
      secondaryAction={
        <IconButton edge="end" size="small" aria-label={`Remove ${label}`} onClick={onRemove}>
          <CloseIcon fontSize="small" />
        </IconButton>
      }
    >
      <IconButton
        size="small"
        aria-label={`Reorder ${label}`}
        sx={{ cursor: isDragging ? 'grabbing' : 'grab', touchAction: 'none' }}
        {...attributes}
        {...listeners}
      >
        <DragIndicatorIcon fontSize="small" />
      </IconButton>
      <ListItemText primary={`${position}. ${label}`} />
    </ListItem>
  );
}

const paneItemSx = { borderRadius: `${tokens.radius.sm}px`, mb: 0.75, minHeight: 40 };

function PaneTitle({ children }: { children: string }) {
  return (
    <Typography variant="caption" component="p" sx={{ mb: 1 }}>
      {children}
    </Typography>
  );
}

function EmptyPane({ children }: { children: string }) {
  return (
    <Box
      sx={{
        p: 2,
        borderRadius: `${tokens.radius.sm}px`,
        border: `1px dashed ${tokens.color.border}`,
        textAlign: 'center',
      }}
    >
      <Typography variant="caption">{children}</Typography>
    </Box>
  );
}
