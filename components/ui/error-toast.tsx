'use client';

/**
 * Enhanced Error Toast
 *
 * Rich toast notifications with error details and actions
 */

import * as React from 'react';
import { toast } from 'sonner';
import { AlertCircle, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ApiError } from '@/lib/errors/types';
import { useErrorStore } from '@/lib/stores/error-store';

/**
 * Show an enhanced error toast with optional "View Details" action
 */
export function showErrorToast(error: ApiError) {
  const hasDetails = !!(
    error.details ||
    error.fieldErrors?.length ||
    error.suggestion ||
    error.requestId
  );

  // Add to error store
  const errorId = useErrorStore.getState().addError(error);

  toast.error(
    <div className="flex flex-col gap-1 w-full">
      <div className="font-medium">{error.message}</div>

      {/* Show first few field errors inline */}
      {error.fieldErrors && error.fieldErrors.length > 0 && (
        <div className="mt-1 space-y-0.5">
          {error.fieldErrors.slice(0, 3).map((fieldError, idx) => (
            <div key={idx} className="text-sm text-red-200 flex items-start gap-1">
              <span className="shrink-0">•</span>
              <span>
                <span className="font-medium">{fieldError.field}:</span>{' '}
                {fieldError.message}
              </span>
            </div>
          ))}
          {error.fieldErrors.length > 3 && (
            <div className="text-sm text-red-300 italic">
              +{error.fieldErrors.length - 3} kesalahan lainnya
            </div>
          )}
        </div>
      )}

      {/* View Details button */}
      {hasDetails && (
        <Button
          size="sm"
          variant="ghost"
          className="mt-2 h-7 px-2 text-xs justify-start hover:bg-red-500/20 text-white w-fit"
          onClick={() => {
            useErrorStore.getState().showErrorDetails(errorId);
          }}
        >
          Lihat Detail
          <ChevronRight className="h-3 w-3 ml-1" />
        </Button>
      )}
    </div>,
    {
      duration: hasDetails ? 10000 : 5000,
      closeButton: true,
      className: 'error-toast',
    }
  );

  return errorId;
}

/**
 * Show a simple error toast for legacy compatibility
 */
export function showSimpleErrorToast(message: string, description?: string) {
  toast.error(message, {
    description,
    duration: 5000,
  });
}

/**
 * Show an error toast from an API response
 */
export async function showApiErrorToast(
  response: Response,
  fallbackMessage = 'Terjadi kesalahan'
): Promise<string | null> {
  try {
    const data = await response.json();

    // Check for new standardized format
    if (data.error && typeof data.error === 'object' && data.error.code) {
      return showErrorToast(data.error as ApiError);
    }

    // Handle legacy format { error: string }
    if (data.error && typeof data.error === 'string') {
      const legacyError: ApiError = {
        code: `HTTP_${response.status}`,
        message: data.error,
        details: data.details || data.message,
        timestamp: new Date().toISOString(),
      };
      return showErrorToast(legacyError);
    }

    // Handle { message: string } format
    if (data.message && typeof data.message === 'string') {
      const legacyError: ApiError = {
        code: `HTTP_${response.status}`,
        message: data.message,
        timestamp: new Date().toISOString(),
      };
      return showErrorToast(legacyError);
    }

    // Fallback
    showSimpleErrorToast(fallbackMessage);
    return null;
  } catch {
    // Couldn't parse response
    showSimpleErrorToast(fallbackMessage);
    return null;
  }
}

/**
 * Show a validation error toast with field errors
 */
export function showValidationErrorToast(
  fieldErrors: Array<{ field: string; message: string }>
) {
  const error: ApiError = {
    code: 'VAL_001',
    message: 'Validasi gagal',
    details: `${fieldErrors.length} kesalahan ditemukan`,
    fieldErrors,
    timestamp: new Date().toISOString(),
    suggestion: 'Perbaiki field yang ditandai dan coba lagi',
  };

  return showErrorToast(error);
}

/**
 * Hook for using error toast functions
 */
export function useErrorToast() {
  const { addError, showErrorDetails } = useErrorStore();

  const showError = React.useCallback((error: ApiError) => {
    return showErrorToast(error);
  }, []);

  const showApiError = React.useCallback(async (
    response: Response,
    fallbackMessage?: string
  ) => {
    return showApiErrorToast(response, fallbackMessage);
  }, []);

  const showValidation = React.useCallback((
    fieldErrors: Array<{ field: string; message: string }>
  ) => {
    return showValidationErrorToast(fieldErrors);
  }, []);

  const showSimple = React.useCallback((
    message: string,
    description?: string
  ) => {
    showSimpleErrorToast(message, description);
  }, []);

  return {
    showError,
    showApiError,
    showValidation,
    showSimple,
    addError,
    showErrorDetails,
  };
}
