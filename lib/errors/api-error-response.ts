/**
 * API Error Response Utilities
 *
 * Standardized error response creation for API routes
 */

import { NextResponse } from 'next/server';
import { ZodError, ZodIssue } from 'zod';
import {
  ApiError,
  ApiErrorResponse,
  ErrorCode,
  FieldError,
  getErrorMessage,
  getErrorStatusCode,
} from './types';

/**
 * Generate a short request ID for error tracking
 */
export function generateRequestId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `req_${timestamp}_${random}`;
}

/**
 * Format field name from snake_case or camelCase to Title Case
 */
export function formatFieldName(path: (string | number)[]): string {
  if (path.length === 0) return 'Field';

  const field = String(path[path.length - 1]);

  // Handle nested paths like fieldValues.customer_name
  const cleanField = field.replace(/^fieldValues\./, '');

  return cleanField
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .trim()
    .split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Convert Zod error message to user-friendly format
 */
function getZodErrorMessage(err: ZodIssue): string {
  const fieldName = formatFieldName(err.path);

  switch (err.code) {
    case 'too_small':
      if (err.type === 'string') {
        if ((err as any).minimum === 1) {
          return `${fieldName} wajib diisi`;
        }
        return `${fieldName} minimal ${(err as any).minimum} karakter`;
      }
      if (err.type === 'number') {
        return `${fieldName} minimal ${(err as any).minimum}`;
      }
      if (err.type === 'array') {
        return `${fieldName} minimal ${(err as any).minimum} item`;
      }
      return `${fieldName} terlalu kecil`;

    case 'too_big':
      if (err.type === 'string') {
        return `${fieldName} maksimal ${(err as any).maximum} karakter`;
      }
      if (err.type === 'number') {
        return `${fieldName} maksimal ${(err as any).maximum}`;
      }
      return `${fieldName} terlalu besar`;

    case 'invalid_type':
      if ((err as any).received === 'undefined' || (err as any).received === 'null') {
        return `${fieldName} wajib diisi`;
      }
      return `${fieldName} harus berupa ${(err as any).expected}`;

    case 'invalid_enum_value':
      return `${fieldName} harus salah satu dari: ${(err as any).options?.join(', ')}`;

    case 'invalid_string':
      if ((err as any).validation === 'email') {
        return `${fieldName} harus berupa email yang valid`;
      }
      if ((err as any).validation === 'url') {
        return `${fieldName} harus berupa URL yang valid`;
      }
      return `${fieldName} format tidak valid`;

    case 'invalid_date':
      return `${fieldName} harus berupa tanggal yang valid`;

    case 'custom':
      return err.message || `${fieldName} tidak valid`;

    default:
      return err.message || `${fieldName} tidak valid`;
  }
}

/**
 * Transform Zod validation error to standardized format
 */
export function transformZodError(zodError: ZodError, path?: string): ApiError {
  const fieldErrors: FieldError[] = zodError.errors.map(err => ({
    field: formatFieldName(err.path),
    message: getZodErrorMessage(err),
    code: err.code,
  }));

  const uniqueFields = [...new Set(fieldErrors.map(f => f.field))];
  const summary = fieldErrors.length === 1
    ? fieldErrors[0].message
    : `${fieldErrors.length} kesalahan validasi ditemukan`;

  const details = uniqueFields.length <= 3
    ? `Perbaiki field: ${uniqueFields.join(', ')}`
    : `Perbaiki ${uniqueFields.length} field yang ditandai`;

  return {
    code: ErrorCode.VALIDATION_FAILED,
    message: summary,
    details,
    fieldErrors,
    timestamp: new Date().toISOString(),
    requestId: generateRequestId(),
    path,
    suggestion: 'Periksa field yang ditandai dan masukkan nilai yang valid',
  };
}

/**
 * Create a standardized API error
 */
export function createApiError(
  code: ErrorCode,
  options?: {
    message?: string;
    details?: string;
    fieldErrors?: FieldError[];
    suggestion?: string;
    path?: string;
  }
): ApiError {
  return {
    code,
    message: options?.message || getErrorMessage(code),
    details: options?.details,
    fieldErrors: options?.fieldErrors,
    timestamp: new Date().toISOString(),
    requestId: generateRequestId(),
    path: options?.path,
    suggestion: options?.suggestion,
  };
}

/**
 * Create a NextResponse with standardized error format
 */
export function apiErrorResponse(
  error: ApiError,
  status?: number
): NextResponse<ApiErrorResponse> {
  const statusCode = status || getErrorStatusCode(error.code as ErrorCode) || 500;

  return NextResponse.json(
    { error },
    { status: statusCode }
  );
}

/**
 * Quick helper to create and return an error response
 */
export function createErrorResponse(
  code: ErrorCode,
  options?: {
    message?: string;
    details?: string;
    fieldErrors?: FieldError[];
    suggestion?: string;
    path?: string;
    status?: number;
  }
): NextResponse<ApiErrorResponse> {
  const error = createApiError(code, options);
  return apiErrorResponse(error, options?.status);
}

/**
 * Handle Zod validation errors and return appropriate response
 */
export function handleZodError(
  zodError: ZodError,
  path?: string
): NextResponse<ApiErrorResponse> {
  const error = transformZodError(zodError, path);
  return apiErrorResponse(error, 400);
}

/**
 * Handle unknown errors and return appropriate response
 */
export function handleUnknownError(
  error: unknown,
  options?: {
    path?: string;
    context?: Record<string, unknown>;
  }
): NextResponse<ApiErrorResponse> {
  // Log the actual error for debugging
  console.error('Unhandled error:', error);

  const message = error instanceof Error ? error.message : 'Unknown error';
  const details = process.env.NODE_ENV === 'development' && error instanceof Error
    ? error.stack
    : undefined;

  const apiError = createApiError(ErrorCode.INTERNAL_ERROR, {
    message: 'Terjadi kesalahan sistem',
    details: process.env.NODE_ENV === 'development' ? message : undefined,
    path: options?.path,
    suggestion: 'Silakan coba lagi. Jika masalah berlanjut, hubungi administrator',
  });

  return apiErrorResponse(apiError, 500);
}

/**
 * Wrapper for try-catch in API routes
 *
 * Usage:
 * ```ts
 * export async function POST(request: NextRequest) {
 *   return withErrorHandling(async () => {
 *     // Your logic here
 *     return NextResponse.json({ success: true });
 *   }, { path: '/api/tickets' });
 * }
 * ```
 */
export async function withErrorHandling<T>(
  handler: () => Promise<NextResponse<T>>,
  options?: {
    path?: string;
  }
): Promise<NextResponse<T | ApiErrorResponse>> {
  try {
    return await handler();
  } catch (error) {
    if (error instanceof ZodError) {
      return handleZodError(error, options?.path) as NextResponse<T | ApiErrorResponse>;
    }
    return handleUnknownError(error, options) as NextResponse<T | ApiErrorResponse>;
  }
}

// Re-export types for convenience
export { ErrorCode, type ApiError, type FieldError, type ApiErrorResponse } from './types';
