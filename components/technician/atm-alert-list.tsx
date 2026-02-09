'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Clock,
  Loader2,
  Save,
  MonitorSmartphone,
  MapPin,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

interface ATMAlarm {
  deviceId: string;
  alarmType: string;
  location: string;
  occurredAt?: string;
  timeAgo?: string;
}

export interface ATMAlertData {
  fetchedAt: string;
  targetTime: string;
  totalAlerts: number;
  alarms: ATMAlarm[];
  // Fields for snapshot data
  snapshotId?: string;
  snapshotTime?: string;
  devicesAlarming?: number;
  exact?: boolean;
  diffMinutes?: number;
}

interface ATMAlertListProps {
  targetTime: string; // e.g., "08:00"
  value?: ATMAlertData;
  onChange: (data: ATMAlertData) => void;
  onSubmit?: (data: ATMAlertData) => void;
  readOnly?: boolean;
}

export function ATMAlertList({
  targetTime,
  value,
  onChange,
  onSubmit,
  readOnly = false,
}: ATMAlertListProps) {
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [data, setData] = useState<ATMAlertData | null>(value || null);
  const [noDataFound, setNoDataFound] = useState(false);

  // Auto-fetch on mount if no value provided
  useEffect(() => {
    if (value) {
      setData(value);
      setInitialLoading(false);
    } else {
      fetchNearestSnapshot();
    }
  }, [targetTime]);

  // Update data when value prop changes
  useEffect(() => {
    if (value) {
      setData(value);
    }
  }, [value]);

  // Fetch nearest snapshot from the atm-alert-status API
  const fetchNearestSnapshot = async () => {
    try {
      setLoading(true);
      setNoDataFound(false);

      const response = await fetch(`/api/server-checklist/atm-alert-status?time=${targetTime}`);

      if (!response.ok) {
        throw new Error('Failed to fetch ATM status');
      }

      const result = await response.json();

      if (!result.found) {
        // No snapshot data available
        setNoDataFound(true);
        setData(null);
        return;
      }

      // Build ATMAlertData from snapshot
      const alertData: ATMAlertData = {
        fetchedAt: result.snapshot.receivedAt,
        targetTime,
        totalAlerts: result.snapshot.alarmCount,
        alarms: result.alarms || [],
        snapshotId: result.snapshot.id,
        snapshotTime: result.snapshot.receivedAt,
        devicesAlarming: result.snapshot.devicesAlarming,
        exact: result.exact,
        diffMinutes: result.diffMinutes,
      };

      setData(alertData);
      onChange(alertData);
    } catch (error) {
      console.error('Error fetching ATM snapshot:', error);
      setNoDataFound(true);
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  };

  // Create new snapshot from current data
  const createCurrentSnapshot = async () => {
    try {
      setLoading(true);

      const response = await fetch('/api/server-checklist/atm-alert-status', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to create snapshot');
      }

      const result = await response.json();

      if (result.success && result.snapshot) {
        const alertData: ATMAlertData = {
          fetchedAt: result.snapshot.receivedAt,
          targetTime,
          totalAlerts: result.snapshot.alarmCount,
          alarms: result.alarms || [],
          snapshotId: result.snapshot.id,
          snapshotTime: result.snapshot.receivedAt,
          devicesAlarming: result.snapshot.devicesAlarming,
          exact: true,
          diffMinutes: 0,
        };

        setData(alertData);
        setNoDataFound(false);
        onChange(alertData);
        toast.success('Berhasil mengambil data ATM saat ini');
      }
    } catch (error) {
      console.error('Error creating snapshot:', error);
      toast.error('Gagal mengambil data ATM');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = () => {
    if (data) {
      onSubmit?.(data);
    }
  };

  return (
    <Card className="bg-muted/30">
      <CardHeader className="py-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            Status Alert ATM [{targetTime}]
          </CardTitle>
          {data && (
            <Badge variant={data.totalAlerts > 0 ? 'destructive' : 'default'}>
              {data.devicesAlarming ?? data.totalAlerts} ATM Alarm
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        {initialLoading || loading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ) : data ? (
          <>
            {/* Snapshot time info */}
            <div className="flex items-center justify-between p-2 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-blue-500" />
                <span className="text-blue-700 dark:text-blue-300">
                  Data jam{' '}
                  <span className="font-bold">
                    {format(new Date(data.fetchedAt), 'HH:mm:ss')}
                  </span>
                </span>
                {!data.exact && data.diffMinutes && data.diffMinutes > 0 && (
                  <span className="text-xs text-amber-600 dark:text-amber-400">
                    (±{data.diffMinutes} menit dari target)
                  </span>
                )}
              </div>
              <span className="text-xs text-blue-600 dark:text-blue-400">
                {format(new Date(data.fetchedAt), 'd MMM yyyy', { locale: id })}
              </span>
            </div>

            {/* Status display */}
            {(data.devicesAlarming ?? data.totalAlerts) === 0 ? (
              <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950/30 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <span className="text-sm text-green-700 dark:text-green-400">
                  Tidak ada alert ATM aktif
                </span>
              </div>
            ) : (
              <div className="space-y-2">
                {/* Summary */}
                <div className="p-3 bg-red-50 dark:bg-red-950/30 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                    <span className="text-sm font-medium text-red-700 dark:text-red-400">
                      {data.devicesAlarming ?? data.totalAlerts} ATM dalam kondisi alarm
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge
                      variant="outline"
                      className="text-xs border-red-300 text-red-700 dark:border-red-700 dark:text-red-300"
                    >
                      <MonitorSmartphone className="h-3 w-3 mr-1" />
                      {data.devicesAlarming ?? 0} Perangkat
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      Total Alert: {data.totalAlerts}
                    </Badge>
                  </div>
                </div>

                {/* Alarm Details */}
                {data.alarms && data.alarms.length > 0 && (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {data.alarms.map((alarm, index) => (
                      <div
                        key={`${alarm.deviceId}-${alarm.alarmType}-${index}`}
                        className="flex items-start gap-2 p-2 bg-red-50/50 dark:bg-red-950/20 rounded border border-red-100 dark:border-red-900"
                      >
                        <AlertTriangle className="h-3.5 w-3.5 text-red-500 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-sm font-medium text-red-700 dark:text-red-300">
                              {alarm.deviceId}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {alarm.alarmType}
                            </Badge>
                            {alarm.timeAgo && (
                              <span className="text-xs text-muted-foreground">
                                {alarm.timeAgo}
                              </span>
                            )}
                          </div>
                          {alarm.location && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                              <MapPin className="h-3 w-3" />
                              <span className="truncate">{alarm.location}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        ) : noDataFound ? (
          <div className="text-center py-4">
            <div className="flex items-center justify-center gap-2 text-amber-600 dark:text-amber-400 mb-2">
              <Clock className="h-4 w-4" />
              <span className="text-sm">Tidak ada data snapshot untuk pukul {targetTime}</span>
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              Tidak ditemukan data dalam rentang waktu yang diminta
            </p>
            {!readOnly && (
              <Button
                size="sm"
                variant="outline"
                className="text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900/50"
                onClick={createCurrentSnapshot}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    Mengambil...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-1" />
                    Ambil Data Saat Ini
                  </>
                )}
              </Button>
            )}
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground">
              Memuat data ATM...
            </p>
          </div>
        )}

        {!readOnly && (
          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button
              size="sm"
              variant="outline"
              onClick={data ? fetchNearestSnapshot : createCurrentSnapshot}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  Mengambil...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-1" />
                  {data ? 'Refresh' : 'Ambil Data'}
                </>
              )}
            </Button>
            {data && (
              <Button
                size="sm"
                onClick={handleSubmit}
                disabled={loading}
              >
                <Save className="h-4 w-4 mr-1" />
                Simpan
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
