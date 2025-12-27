'use client';

/**
 * Error Details Dialog
 *
 * Modal dialog for displaying comprehensive error information
 */

import * as React from 'react';
import {
  AlertCircle,
  Copy,
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  Hash,
  FileWarning,
  Server,
  Lightbulb,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useCurrentError } from '@/lib/stores/error-store';
import { ApiError } from '@/lib/errors/types';

/**
 * Collapsible section component
 */
interface ErrorSectionProps {
  title: string;
  icon: React.ReactNode;
  defaultExpanded?: boolean;
  badge?: React.ReactNode;
  children: React.ReactNode;
}

function ErrorSection({
  title,
  icon,
  defaultExpanded = false,
  badge,
  children,
}: ErrorSectionProps) {
  const [expanded, setExpanded] = React.useState(defaultExpanded);

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 flex items-center justify-between bg-muted/30 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">{icon}</span>
          <span className="font-medium text-sm">{title}</span>
          {badge}
        </div>
        {expanded ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {expanded && (
        <div className="p-4 bg-background border-t border-border">
          {children}
        </div>
      )}
    </div>
  );
}

/**
 * Detail row component
 */
interface DetailRowProps {
  label: string;
  value: React.ReactNode;
  monospace?: boolean;
}

function DetailRow({ label, value, monospace }: DetailRowProps) {
  return (
    <div className="flex items-start gap-3">
      <div className="text-xs font-medium text-muted-foreground min-w-[100px] shrink-0">
        {label}
      </div>
      <div
        className={cn(
          'text-sm text-foreground flex-1 break-all',
          monospace && 'font-mono'
        )}
      >
        {value}
      </div>
    </div>
  );
}

/**
 * Format timestamp for display
 */
function formatTimestamp(timestamp: string): string {
  try {
    const date = new Date(timestamp);
    return new Intl.DateTimeFormat('id-ID', {
      dateStyle: 'short',
      timeStyle: 'medium',
    }).format(date);
  } catch {
    return timestamp;
  }
}

/**
 * Format error for clipboard
 */
function formatErrorForClipboard(error: ApiError): string {
  const sections: string[] = [];

  sections.push('=== DETAIL ERROR ===\n');
  sections.push(`Kode: ${error.code}`);
  sections.push(`Pesan: ${error.message}`);
  if (error.details) sections.push(`Detail: ${error.details}`);
  if (error.timestamp) sections.push(`Waktu: ${error.timestamp}`);
  if (error.requestId) sections.push(`Request ID: ${error.requestId}`);
  if (error.path) sections.push(`Path: ${error.path}`);

  if (error.fieldErrors && error.fieldErrors.length > 0) {
    sections.push('\n=== KESALAHAN VALIDASI ===');
    error.fieldErrors.forEach((err) => {
      sections.push(`- ${err.field}: ${err.message}`);
    });
  }

  if (error.suggestion) {
    sections.push(`\n=== SARAN ===`);
    sections.push(error.suggestion);
  }

  return sections.join('\n');
}

/**
 * Error Details Dialog Component
 */
export function ErrorDetailsDialog() {
  const { error: storedError, isOpen, setOpen } = useCurrentError();
  const [copied, setCopied] = React.useState(false);

  const error = storedError?.error;

  const copyToClipboard = async () => {
    if (!error) return;

    try {
      await navigator.clipboard.writeText(formatErrorForClipboard(error));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  if (!error) return null;

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-full bg-destructive/10 shrink-0">
              <AlertCircle className="h-5 w-5 text-destructive" />
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-left">Detail Error</DialogTitle>
              <DialogDescription className="text-left mt-1">
                Informasi lengkap untuk troubleshooting
              </DialogDescription>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={copyToClipboard}
              className="shrink-0"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Disalin
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-2" />
                  Salin
                </>
              )}
            </Button>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-4 pb-4">
            {/* Summary Section */}
            <ErrorSection
              title="Ringkasan"
              icon={<AlertCircle className="h-4 w-4" />}
              defaultExpanded
            >
              <div className="space-y-3">
                <div>
                  <div className="text-xs font-medium text-muted-foreground mb-1">
                    Pesan Error
                  </div>
                  <div className="text-sm font-medium text-foreground">
                    {error.message}
                  </div>
                </div>

                {error.details && (
                  <div>
                    <div className="text-xs font-medium text-muted-foreground mb-1">
                      Detail
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {error.details}
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap gap-2 pt-2">
                  <Badge variant="outline" className="font-mono text-xs">
                    <Hash className="h-3 w-3 mr-1" />
                    {error.code}
                  </Badge>

                  {error.timestamp && (
                    <Badge variant="outline" className="text-xs">
                      <Clock className="h-3 w-3 mr-1" />
                      {formatTimestamp(error.timestamp)}
                    </Badge>
                  )}

                  {error.requestId && (
                    <Badge variant="outline" className="font-mono text-xs">
                      ID: {error.requestId}
                    </Badge>
                  )}
                </div>
              </div>
            </ErrorSection>

            {/* Validation Errors Section */}
            {error.fieldErrors && error.fieldErrors.length > 0 && (
              <ErrorSection
                title={`Kesalahan Validasi (${error.fieldErrors.length})`}
                icon={<FileWarning className="h-4 w-4" />}
                defaultExpanded
                badge={
                  <Badge variant="destructive" className="text-xs">
                    {error.fieldErrors.length}
                  </Badge>
                }
              >
                <div className="space-y-2">
                  {error.fieldErrors.map((fieldError, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-lg bg-destructive/5 border border-destructive/20"
                    >
                      <div className="text-xs font-medium font-mono text-foreground mb-1">
                        {fieldError.field}
                      </div>
                      <div className="text-sm text-destructive">
                        {fieldError.message}
                      </div>
                    </div>
                  ))}
                </div>
              </ErrorSection>
            )}

            {/* Suggestion Section */}
            {error.suggestion && (
              <ErrorSection
                title="Saran"
                icon={<Lightbulb className="h-4 w-4" />}
                defaultExpanded
              >
                <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
                  <div className="text-sm text-amber-800 dark:text-amber-200">
                    {error.suggestion}
                  </div>
                </div>
              </ErrorSection>
            )}

            {/* Technical Details Section */}
            {(error.path || error.requestId) && (
              <ErrorSection
                title="Detail Teknis"
                icon={<Server className="h-4 w-4" />}
              >
                <div className="space-y-3">
                  {error.path && (
                    <DetailRow label="Path" value={error.path} monospace />
                  )}
                  {error.requestId && (
                    <DetailRow
                      label="Request ID"
                      value={error.requestId}
                      monospace
                    />
                  )}
                  {error.timestamp && (
                    <DetailRow
                      label="Timestamp"
                      value={error.timestamp}
                      monospace
                    />
                  )}
                </div>
              </ErrorSection>
            )}

            {/* Support Information */}
            <div className="p-4 rounded-lg bg-muted/50 border border-border">
              <div className="text-sm font-medium mb-2">Butuh Bantuan?</div>
              <div className="text-sm text-muted-foreground space-y-1">
                <p>1. Salin detail error menggunakan tombol di atas</p>
                <p>2. Hubungi administrator sistem</p>
                <p>3. Sertakan Request ID jika tersedia</p>
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
