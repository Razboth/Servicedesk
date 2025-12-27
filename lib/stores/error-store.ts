/**
 * Error Store
 *
 * Zustand store for managing error state across the application
 */

import { create } from 'zustand';
import { ApiError } from '@/lib/errors/types';

/**
 * Stored error with metadata
 */
export interface StoredError {
  id: string;
  error: ApiError;
  createdAt: Date;
  dismissed: boolean;
}

/**
 * Error store state and actions
 */
interface ErrorStore {
  // State
  errors: StoredError[];
  currentError: StoredError | null;
  isDetailsOpen: boolean;

  // Actions
  addError: (error: ApiError) => string;
  dismissError: (id: string) => void;
  clearAllErrors: () => void;
  showErrorDetails: (id: string) => void;
  hideErrorDetails: () => void;
  setDetailsOpen: (open: boolean) => void;
  getRecentErrors: (limit?: number) => StoredError[];
  getErrorById: (id: string) => StoredError | undefined;
}

/**
 * Maximum number of errors to keep in history
 */
const MAX_ERROR_HISTORY = 50;

/**
 * Error store using Zustand
 */
export const useErrorStore = create<ErrorStore>((set, get) => ({
  errors: [],
  currentError: null,
  isDetailsOpen: false,

  /**
   * Add a new error to the store
   * Returns the error ID for reference
   */
  addError: (error: ApiError) => {
    const id = error.requestId || `err_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    const storedError: StoredError = {
      id,
      error,
      createdAt: new Date(),
      dismissed: false,
    };

    set(state => ({
      errors: [storedError, ...state.errors].slice(0, MAX_ERROR_HISTORY),
    }));

    return id;
  },

  /**
   * Dismiss an error by ID
   */
  dismissError: (id: string) => {
    set(state => ({
      errors: state.errors.map(e =>
        e.id === id ? { ...e, dismissed: true } : e
      ),
      currentError: state.currentError?.id === id ? null : state.currentError,
      isDetailsOpen: state.currentError?.id === id ? false : state.isDetailsOpen,
    }));
  },

  /**
   * Clear all errors from the store
   */
  clearAllErrors: () => {
    set({
      errors: [],
      currentError: null,
      isDetailsOpen: false,
    });
  },

  /**
   * Show error details modal for a specific error
   */
  showErrorDetails: (id: string) => {
    const error = get().errors.find(e => e.id === id);
    if (error) {
      set({
        currentError: error,
        isDetailsOpen: true,
      });
    }
  },

  /**
   * Hide the error details modal
   */
  hideErrorDetails: () => {
    set({
      isDetailsOpen: false,
    });
  },

  /**
   * Set the details modal open state
   */
  setDetailsOpen: (open: boolean) => {
    set({
      isDetailsOpen: open,
      currentError: open ? get().currentError : null,
    });
  },

  /**
   * Get recent non-dismissed errors
   */
  getRecentErrors: (limit = 10) => {
    return get().errors.filter(e => !e.dismissed).slice(0, limit);
  },

  /**
   * Get an error by ID
   */
  getErrorById: (id: string) => {
    return get().errors.find(e => e.id === id);
  },
}));

/**
 * Hook to get the current error for display
 */
export function useCurrentError() {
  return useErrorStore(state => ({
    error: state.currentError,
    isOpen: state.isDetailsOpen,
    hide: state.hideErrorDetails,
    setOpen: state.setDetailsOpen,
  }));
}

/**
 * Hook to add errors
 */
export function useAddError() {
  return useErrorStore(state => state.addError);
}

/**
 * Hook to get recent errors
 */
export function useRecentErrors(limit = 10) {
  return useErrorStore(state => state.getRecentErrors(limit));
}
