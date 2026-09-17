import { create } from 'zustand';

export const MAX_VISIBLE_CHIPS = 3;
export const AUTO_DISMISS_MS = 6000;

export type ChipSeverity = 'error' | 'success' | 'info';

export interface AlertChip {
  id: number;
  severity: ChipSeverity;
  message: string;
  action?: { label: string; onClick: () => void };
}

interface AlertChipState {
  chips: AlertChip[];
  show: (chip: Omit<AlertChip, 'id'>) => void;
  dismiss: (id: number) => void;
}

let nextId = 1;

/** The alert chips currently on screen. Any code can call show(); AlertChipStack renders them. */
export const useAlertChips = create<AlertChipState>((set, get) => ({
  chips: [],

  show: (chip) => {
    // When the API is down, every query fails at once. One chip says it; three identical
    // chips would just be noise.
    if (get().chips.some((existing) => existing.message === chip.message)) {
      return;
    }
    const id = nextId;
    nextId += 1;
    set((state) => ({ chips: [...state.chips, { ...chip, id }].slice(-MAX_VISIBLE_CHIPS) }));
    setTimeout(() => get().dismiss(id), AUTO_DISMISS_MS);
  },

  dismiss: (id) => set((state) => ({ chips: state.chips.filter((chip) => chip.id !== id) })),
}));
