'use client';

/**
 * Form Error Summary
 *
 * Displays a summary of all form validation errors at the top of a form
 * with clickable links to jump to each field.
 */

import * as React from 'react';
import { AlertCircle, X } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { FieldErrors, FieldValues } from 'react-hook-form';

interface FormErrorSummaryProps<T extends FieldValues> {
  errors: FieldErrors<T>;
  className?: string;
  onDismiss?: () => void;
  fieldLabels?: Partial<Record<keyof T, string>>;
  title?: string;
}

/**
 * Get nested error from FieldErrors object
 */
function getNestedErrors(
  errors: Record<string, any>,
  prefix = ''
): Array<{ path: string; message: string }> {
  const result: Array<{ path: string; message: string }> = [];

  for (const key of Object.keys(errors)) {
    const error = errors[key];
    const path = prefix ? `${prefix}.${key}` : key;

    if (error?.message) {
      result.push({ path, message: String(error.message) });
    } else if (typeof error === 'object' && error !== null) {
      result.push(...getNestedErrors(error, path));
    }
  }

  return result;
}

/**
 * Format field path to display name
 */
function formatFieldPath(path: string, fieldLabels?: Record<string, string>): string {
  // Check if we have a custom label
  if (fieldLabels && fieldLabels[path]) {
    return fieldLabels[path];
  }

  // Extract the last part of the path
  const parts = path.split('.');
  const lastPart = parts[parts.length - 1];

  // Handle array indices
  const withoutIndex = lastPart.replace(/\[\d+\]/g, '');

  // Convert camelCase or snake_case to Title Case
  return withoutIndex
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .trim()
    .split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Scroll to a form field
 */
function scrollToField(fieldPath: string) {
  // Try different ID patterns
  const selectors = [
    `#${fieldPath}-form-item`,
    `#${fieldPath}`,
    `[name="${fieldPath}"]`,
    `[data-field="${fieldPath}"]`,
  ];

  for (const selector of selectors) {
    try {
      const element = document.querySelector(selector);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });

        // Try to focus the input
        const input = element.querySelector('input, textarea, select');
        if (input instanceof HTMLElement) {
          setTimeout(() => input.focus(), 300);
        }
        return;
      }
    } catch {
      // Selector might be invalid, continue
    }
  }
}

/**
 * Form Error Summary Component
 */
export function FormErrorSummary<T extends FieldValues>({
  errors,
  className,
  onDismiss,
  fieldLabels = {},
  title,
}: FormErrorSummaryProps<T>) {
  const errorList = React.useMemo(() => {
    return getNestedErrors(errors as Record<string, any>);
  }, [errors]);

  if (errorList.length === 0) {
    return null;
  }

  const displayTitle = title ||
    (errorList.length === 1
      ? 'Terdapat 1 kesalahan pada form'
      : `Terdapat ${errorList.length} kesalahan pada form`);

  return (
    <Alert
      variant="destructive"
      className={cn(
        'relative animate-in slide-in-from-top-2 duration-300',
        className
      )}
    >
      {onDismiss && (
        <Button
          size="icon"
          variant="ghost"
          className="absolute right-2 top-2 h-6 w-6 hover:bg-destructive/20"
          onClick={onDismiss}
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Tutup</span>
        </Button>
      )}

      <AlertCircle className="h-4 w-4" />

      <AlertTitle className="mb-2 pr-8">{displayTitle}</AlertTitle>

      <AlertDescription>
        <ul className="list-disc list-inside space-y-1 text-sm">
          {errorList.map(({ path, message }) => {
            const fieldLabel = formatFieldPath(path, fieldLabels as Record<string, string>);
            return (
              <li key={path}>
                <button
                  type="button"
                  onClick={() => scrollToField(path)}
                  className="hover:underline focus:underline focus:outline-none font-medium"
                >
                  {fieldLabel}
                </button>
                : {message}
              </li>
            );
          })}
        </ul>
      </AlertDescription>
    </Alert>
  );
}

/**
 * Simple error list without form integration
 */
interface SimpleErrorListProps {
  errors: Array<{ field: string; message: string }>;
  className?: string;
  onDismiss?: () => void;
  title?: string;
}

export function SimpleErrorList({
  errors,
  className,
  onDismiss,
  title,
}: SimpleErrorListProps) {
  if (errors.length === 0) {
    return null;
  }

  const displayTitle = title ||
    (errors.length === 1
      ? 'Terdapat 1 kesalahan'
      : `Terdapat ${errors.length} kesalahan`);

  return (
    <Alert
      variant="destructive"
      className={cn(
        'relative animate-in slide-in-from-top-2 duration-300',
        className
      )}
    >
      {onDismiss && (
        <Button
          size="icon"
          variant="ghost"
          className="absolute right-2 top-2 h-6 w-6 hover:bg-destructive/20"
          onClick={onDismiss}
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Tutup</span>
        </Button>
      )}

      <AlertCircle className="h-4 w-4" />

      <AlertTitle className="mb-2 pr-8">{displayTitle}</AlertTitle>

      <AlertDescription>
        <ul className="list-disc list-inside space-y-1 text-sm">
          {errors.map((error, idx) => (
            <li key={idx}>
              <span className="font-medium">{error.field}</span>: {error.message}
            </li>
          ))}
        </ul>
      </AlertDescription>
    </Alert>
  );
}
