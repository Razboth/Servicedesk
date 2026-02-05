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
  MapPin,
  Clock,
  Loader2,
  Save,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

interface ATMAlert {
  atmId: string;
  terminalId: string;
  location: string;
  alarmType: string;
  alarmDescription?: string;
  status: string;
  timestamp: string;
}

export interface ATMAlertData {
  fetchedAt: string;
  targetTime: string;
  totalAlerts: number;
  alerts: ATMAlert[];
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
  const [data, setData] = useState<ATMAlertData | null>(value || null);

  useEffect(() => {
    if (value) {
      setData(value);
    }
  }, [value]);

  // Check if current time is within allowed fetch window (target time to +3 minutes)
  const isWithinFetchWindow = () => {
    const [hours, minutes] = targetTime.split(':').map(Number);
    const now = new Date();

    // Get current time in WITA (UTC+8)
    const witaOffset = 8 * 60; // minutes
    const utcMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
    let witaMinutes = utcMinutes + witaOffset;
    if (witaMinutes >= 24 * 60) witaMinutes -= 24 * 60;

    const witaHour = Math.floor(witaMinutes / 60);
    const witaMinute = witaMinutes % 60;

    const targetMinutes = hours * 60 + minutes;
    const currentMinutes = witaHour * 60 + witaMinute;

    // Allow fetch from target time to +3 minutes
    const diff = currentMinutes - targetMinutes;
    return diff >= 0 && diff <= 3;
  };

  const getTimeWindowMessage = () => {
    const [hours, minutes] = targetTime.split(':').map(Number);
    const endMinutes = minutes + 3;
    const endHour = hours + Math.floor(endMinutes / 60);
    const endMin = endMinutes % 60;
    return `${targetTime} - ${String(endHour).padStart(2, '0')}:${String(endMin).padStart(2, '0')}`;
  };

  const fetchAlerts = async () => {
    // Check if within fetch window
    if (!isWithinFetchWindow()) {
      toast.error(`Data hanya bisa diambil pada jam ${getTimeWindowMessage()} WITA`);
      return;
    }

    try {
      setLoading(true);

      // Fetch ATM alerts from monitoring API (current state)
      const response = await fetch('/api/monitoring/atm/alerts');

      if (!response.ok) {
        throw new Error('Failed to fetch ATM alerts');
      }

      const result = await response.json();

      const alertData: ATMAlertData = {
        fetchedAt: new Date().toISOString(),
        targetTime,
        totalAlerts: result.data?.length || 0,
        alerts: result.data || [],
      };

      setData(alertData);
      onChange(alertData);
      toast.success(`Berhasil mengambil ${alertData.totalAlerts} alert ATM`);
    } catch (error) {
      console.error('Error fetching ATM alerts:', error);

      // Fallback: If API not available, create empty data
      const emptyData: ATMAlertData = {
        fetchedAt: new Date().toISOString(),
        targetTime,
        totalAlerts: 0,
        alerts: [],
      };
      setData(emptyData);
      onChange(emptyData);
      toast.info('Data ATM tidak tersedia, mencatat sebagai 0 alert');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = () => {
    if (data) {
      // Only call onSubmit - it will save data + mark as complete
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
              {data.totalAlerts} Alert
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ) : data ? (
          <>
            {/* Fetch time info - prominent display */}
            <div className="flex items-center justify-between p-2 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-blue-500" />
                <span className="text-blue-700 dark:text-blue-300">
                  Data jam <span className="font-bold">{format(new Date(data.fetchedAt), 'HH:mm')}</span>
                </span>
              </div>
              <span className="text-xs text-blue-600 dark:text-blue-400">
                {format(new Date(data.fetchedAt), 'd MMM yyyy', { locale: id })}
              </span>
            </div>

            {data.totalAlerts === 0 ? (
              <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950/30 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <span className="text-sm text-green-700 dark:text-green-400">
                  Tidak ada alert ATM aktif
                </span>
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {data.alerts.map((alert, index) => (
                  <div
                    key={`${alert.atmId}-${index}`}
                    className="flex items-start gap-2 p-2 bg-red-50 dark:bg-red-950/30 rounded-lg text-sm"
                  >
                    <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-medium">{alert.terminalId || alert.atmId}</span>
                        <Badge variant="outline" className="text-xs">{alert.alarmType}</Badge>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                        <MapPin className="h-3 w-3" />
                        <span className="truncate">{alert.location}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground mb-1">
              Klik tombol untuk mengambil data alert ATM
            </p>
            <p className="text-xs text-muted-foreground">
              Waktu pengambilan: <span className="font-medium">{getTimeWindowMessage()} WITA</span>
            </p>
          </div>
        )}

        {!readOnly && (
          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button
              size="sm"
              variant="outline"
              onClick={fetchAlerts}
              disabled={loading || (!data && !isWithinFetchWindow())}
              title={!isWithinFetchWindow() ? `Data hanya bisa diambil pada jam ${getTimeWindowMessage()} WITA` : ''}
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
