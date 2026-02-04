'use client';

import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Loader2,
  RefreshCw,
  AlertCircle,
  MonitorSmartphone,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

interface AtmAlertSnapshot {
  id: string;
  timestamp: string;
  receivedAt: string;
  alarmCount: number;
  devicesAlarming: number;
  devicesCleared: number;
}

interface AtmAlertStatusResponse {
  found: boolean;
  exact?: boolean;
  diffMinutes?: number;
  targetTime: string;
  targetDate: string;
  snapshot?: AtmAlertSnapshot;
  message?: string;
}

interface AtmAlertStatusVerificationProps {
  targetTime: string; // Format: "HH:mm" e.g., "12:00"
  date?: string; // Optional: "YYYY-MM-DD"
}

export function AtmAlertStatusVerification({
  targetTime,
  date,
}: AtmAlertStatusVerificationProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AtmAlertStatusResponse | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ time: targetTime });
      if (date) {
        params.append('date', date);
      }

      const response = await fetch(`/api/server-checklist/atm-alert-status?${params}`);
      if (!response.ok) {
        throw new Error('Gagal mengambil data');
      }
      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [targetTime, date]);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground p-3 bg-muted/30 rounded-lg">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Memuat data status ATM...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-950/30 rounded-lg">
        <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
          <AlertCircle className="h-4 w-4" />
          <span>{error}</span>
        </div>
        <Button variant="ghost" size="sm" onClick={fetchData}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  if (!data) return null;

  if (!data.found) {
    return (
      <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
            <Clock className="h-4 w-4" />
            <span>Tidak ada data snapshot untuk pukul {targetTime}</span>
          </div>
          <Button variant="ghost" size="sm" className="h-7 px-2" onClick={fetchData}>
            <RefreshCw className="h-3 w-3" />
          </Button>
        </div>
        <p className="text-xs text-amber-600/80 dark:text-amber-400/80 mt-1">
          {data.message}
        </p>
      </div>
    );
  }

  const snapshot = data.snapshot!;
  const hasAlarms = snapshot.alarmCount > 0;
  const receivedAt = new Date(snapshot.receivedAt);

  return (
    <div className="space-y-2">
      {/* Status Header */}
      <div className={cn(
        'p-3 rounded-lg',
        hasAlarms
          ? 'bg-red-50 dark:bg-red-950/30'
          : 'bg-green-50 dark:bg-green-950/30'
      )}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {hasAlarms ? (
              <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
            ) : (
              <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
            )}
            <span className={cn(
              'text-sm font-medium',
              hasAlarms
                ? 'text-red-700 dark:text-red-300'
                : 'text-green-700 dark:text-green-300'
            )}>
              Status ATM Pukul {targetTime}
            </span>
          </div>
          <Button variant="ghost" size="sm" className="h-7 px-2" onClick={fetchData}>
            <RefreshCw className="h-3 w-3" />
          </Button>
        </div>

        {/* Stats */}
        <div className="flex flex-wrap gap-2 mb-2">
          <Badge
            variant="outline"
            className={cn(
              'text-xs',
              hasAlarms
                ? 'border-red-300 text-red-700 dark:border-red-700 dark:text-red-300'
                : 'border-green-300 text-green-700 dark:border-green-700 dark:text-green-300'
            )}
          >
            <MonitorSmartphone className="h-3 w-3 mr-1" />
            {snapshot.devicesAlarming} ATM Alarm
          </Badge>
          <Badge variant="outline" className="text-xs">
            Total Alert: {snapshot.alarmCount}
          </Badge>
          {snapshot.devicesCleared > 0 && (
            <Badge className="text-xs bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
              {snapshot.devicesCleared} Cleared
            </Badge>
          )}
        </div>

        {/* Time info */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>
            Data dari {format(receivedAt, 'HH:mm:ss', { locale: id })}
            {!data.exact && data.diffMinutes && data.diffMinutes > 0 && (
              <span className="text-amber-600 dark:text-amber-400 ml-1">
                (±{data.diffMinutes} menit dari target)
              </span>
            )}
          </span>
        </div>

        {/* Status message */}
        {hasAlarms ? (
          <div className="mt-2">
            <Link
              href="/monitoring/atm"
              className="text-xs text-red-600 dark:text-red-400 hover:underline flex items-center gap-1"
            >
              Lihat detail di halaman monitoring ATM →
            </Link>
          </div>
        ) : (
          <p className="text-sm text-green-600 dark:text-green-400 mt-2">
            Semua ATM berjalan normal
          </p>
        )}
      </div>
    </div>
  );
}
