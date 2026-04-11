import { create } from 'zustand';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface UiState {
  /** Global network/offline status */
  isOffline: boolean;

  /** Active toast notifications (max 1 shown at a time; queue handled by showToast) */
  toasts: Toast[];

  /** Which plan day is currently expanded in the week grid (null = none) */
  expandedDayIndex: number | null;

  /** ID of the planned meal currently being swapped (shows MealSwapper modal) */
  swappingMealId: string | null;

  /** Whether the regenerate-plan confirmation dialog is visible */
  regenerateDialogVisible: boolean;
}

interface UiActions {
  setOffline: (offline: boolean) => void;

  showToast: (message: string, type?: Toast['type']) => void;
  dismissToast: (id: string) => void;

  setExpandedDay: (index: number | null) => void;
  toggleExpandedDay: (index: number) => void;

  openMealSwapper: (plannedMealId: string) => void;
  closeMealSwapper: () => void;

  showRegenerateDialog: () => void;
  hideRegenerateDialog: () => void;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useUiStore = create<UiState & UiActions>()((set) => ({
  isOffline: false,
  toasts: [],
  expandedDayIndex: null,
  swappingMealId: null,
  regenerateDialogVisible: false,

  setOffline: (isOffline) => set({ isOffline }),

  showToast: (message, type = 'info') =>
    set((s) => {
      const id = `toast-${Date.now()}`;
      // Keep at most 3 toasts in queue
      const trimmed = s.toasts.slice(-2);
      return { toasts: [...trimmed, { id, message, type }] };
    }),

  dismissToast: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

  setExpandedDay: (expandedDayIndex) => set({ expandedDayIndex }),

  toggleExpandedDay: (index) =>
    set((s) => ({
      expandedDayIndex: s.expandedDayIndex === index ? null : index,
    })),

  openMealSwapper: (swappingMealId) => set({ swappingMealId }),
  closeMealSwapper: () => set({ swappingMealId: null }),

  showRegenerateDialog: () => set({ regenerateDialogVisible: true }),
  hideRegenerateDialog: () => set({ regenerateDialogVisible: false }),
}));

// ─── Selectors ────────────────────────────────────────────────────────────────

export function selectLatestToast(state: UiState): Toast | undefined {
  return state.toasts[state.toasts.length - 1];
}
