'use client';

/**
 * Error Boundary Component
 *
 * Catches React rendering errors and displays a user-friendly fallback UI
 */

import * as React from 'react';
import { AlertTriangle, RefreshCw, Home, Bug, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{
    error: Error;
    resetError: () => void;
  }>;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error Boundary class component
 */
export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log to console
    console.error('Error Boundary caught an error:', error, errorInfo);

    // Call custom error handler
    this.props.onError?.(error, errorInfo);

    // In production, you could send to error tracking service
    if (process.env.NODE_ENV === 'production') {
      // sendToErrorTracking(error, errorInfo)
    }
  }

  resetError = () => {
    this.setState({
      hasError: false,
      error: null,
    });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return (
          <FallbackComponent
            error={this.state.error}
            resetError={this.resetError}
          />
        );
      }

      return (
        <DefaultErrorFallback
          error={this.state.error}
          resetError={this.resetError}
        />
      );
    }

    return this.props.children;
  }
}

/**
 * Default Error Fallback UI
 */
interface ErrorFallbackProps {
  error: Error;
  resetError: () => void;
}

function DefaultErrorFallback({ error, resetError }: ErrorFallbackProps) {
  const [showDetails, setShowDetails] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  const copyError = async () => {
    const errorText = [
      '=== ERROR REPORT ===',
      `Timestamp: ${new Date().toISOString()}`,
      `URL: ${window.location.href}`,
      `Error: ${error.message}`,
      '',
      '=== STACK TRACE ===',
      error.stack || 'No stack trace available',
    ].join('\n');

    try {
      await navigator.clipboard.writeText(errorText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
      <Card className="max-w-2xl w-full p-8">
        <div className="flex flex-col items-center text-center space-y-6">
          {/* Icon */}
          <div className="p-4 rounded-full bg-destructive/10">
            <AlertTriangle className="h-12 w-12 text-destructive" />
          </div>

          {/* Title & Description */}
          <div className="space-y-2">
            <h1 className="text-2xl font-bold">Terjadi Kesalahan</h1>
            <p className="text-muted-foreground max-w-md">
              Aplikasi mengalami kesalahan yang tidak terduga.
              Silakan coba refresh halaman atau hubungi administrator.
            </p>
          </div>

          {/* Error Message */}
          <div className="w-full">
            <div className="p-4 rounded-lg bg-destructive/5 border border-destructive/20 text-left">
              <div className="text-sm font-medium text-destructive mb-1">
                Pesan Error:
              </div>
              <div className="text-sm text-foreground font-mono break-all">
                {error.message || 'Unknown error'}
              </div>
            </div>

            {/* Expandable Stack Trace */}
            {error.stack && (
              <div className="mt-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDetails(!showDetails)}
                  className="text-xs"
                >
                  <Bug className="h-3 w-3 mr-2" />
                  {showDetails ? 'Sembunyikan' : 'Tampilkan'} Detail Teknis
                </Button>

                {showDetails && (
                  <div className="mt-3 relative">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={copyError}
                      className="absolute top-2 right-2 h-7 text-xs"
                    >
                      {copied ? (
                        <Check className="h-3 w-3 mr-1" />
                      ) : (
                        <Copy className="h-3 w-3 mr-1" />
                      )}
                      {copied ? 'Disalin' : 'Salin'}
                    </Button>
                    <pre className="p-4 rounded-lg bg-muted text-xs font-mono overflow-x-auto max-h-64 text-left">
                      {error.stack}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <Button onClick={resetError} className="flex-1 sm:flex-initial">
              <RefreshCw className="h-4 w-4 mr-2" />
              Coba Lagi
            </Button>
            <Button
              variant="outline"
              onClick={() => (window.location.href = '/')}
              className="flex-1 sm:flex-initial"
            >
              <Home className="h-4 w-4 mr-2" />
              Ke Beranda
            </Button>
          </div>

          {/* Support Info */}
          <div className="pt-6 border-t border-border w-full">
            <p className="text-xs text-muted-foreground">
              Jika masalah berlanjut, hubungi administrator sistem
              dan sertakan pesan error di atas.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}

/**
 * Route-level Error Boundary wrapper
 */
export function RouteErrorBoundary({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        console.error('Route Error:', {
          error,
          errorInfo,
          url: typeof window !== 'undefined' ? window.location.href : 'unknown',
          timestamp: new Date().toISOString(),
        });
      }}
    >
      {children}
    </ErrorBoundary>
  );
}

/**
 * Card-level Error Boundary with minimal UI
 */
interface CardErrorBoundaryProps {
  children: React.ReactNode;
  title?: string;
}

export function CardErrorBoundary({
  children,
  title = 'Komponen ini',
}: CardErrorBoundaryProps) {
  return (
    <ErrorBoundary
      fallback={({ resetError }) => (
        <Card className="p-6 border-destructive/50">
          <div className="flex flex-col items-center text-center gap-4">
            <AlertTriangle className="h-8 w-8 text-destructive" />
            <div>
              <p className="font-medium">{title} mengalami error</p>
              <p className="text-sm text-muted-foreground mt-1">
                Silakan coba muat ulang
              </p>
            </div>
            <Button size="sm" onClick={resetError}>
              <RefreshCw className="h-3 w-3 mr-2" />
              Muat Ulang
            </Button>
          </div>
        </Card>
      )}
    >
      {children}
    </ErrorBoundary>
  );
}
