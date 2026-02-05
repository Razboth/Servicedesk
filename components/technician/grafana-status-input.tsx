'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, AlertTriangle, XCircle, Save } from 'lucide-react';

// 10 Grafana services
const GRAFANA_SERVICES = [
  { key: 'gw724', label: 'GW724' },
  { key: 'atmb', label: 'ATMB' },
  { key: 'bsglink', label: 'BSGLink' },
  { key: 'qris', label: 'QRIS' },
  { key: 'bifIn', label: 'BIF-IN' },
  { key: 'bifOut', label: 'BIF-OUT' },
  { key: 'bifApi', label: 'BIF-API' },
  { key: 'webcms', label: 'WebCMS' },
  { key: 'touchIos', label: 'Touch-iOS' },
  { key: 'touchAndroid', label: 'Touch-Android' },
] as const;

export interface GrafanaStatusData {
  gw724: number | null;
  atmb: number | null;
  bsglink: number | null;
  qris: number | null;
  bifIn: number | null;
  bifOut: number | null;
  bifApi: number | null;
  webcms: number | null;
  touchIos: number | null;
  touchAndroid: number | null;
  timestamp?: string;
}

interface GrafanaStatusInputProps {
  value?: GrafanaStatusData;
  onChange: (data: GrafanaStatusData) => void;
  onSubmit?: (data: GrafanaStatusData) => void;
  readOnly?: boolean;
  isLoading?: boolean;
}

function getStatusColor(value: number | null): string {
  if (value === null) return 'bg-gray-200';
  if (value >= 95) return 'bg-green-500';
  if (value >= 80) return 'bg-yellow-500';
  return 'bg-red-500';
}

function getStatusIcon(value: number | null) {
  if (value === null) return null;
  if (value >= 95) return <CheckCircle2 className="h-4 w-4 text-green-500" />;
  if (value >= 80) return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
  return <XCircle className="h-4 w-4 text-red-500" />;
}

export function GrafanaStatusInput({
  value,
  onChange,
  onSubmit,
  readOnly = false,
  isLoading = false,
}: GrafanaStatusInputProps) {
  const [data, setData] = useState<GrafanaStatusData>({
    gw724: null,
    atmb: null,
    bsglink: null,
    qris: null,
    bifIn: null,
    bifOut: null,
    bifApi: null,
    webcms: null,
    touchIos: null,
    touchAndroid: null,
  });

  useEffect(() => {
    if (value) {
      setData(value);
    }
  }, [value]);

  const handleChange = (key: keyof GrafanaStatusData, strValue: string) => {
    const numValue = strValue === '' ? null : Math.min(100, Math.max(0, parseFloat(strValue) || 0));
    const newData = { ...data, [key]: numValue };
    setData(newData);
    onChange(newData);
  };

  const handleSubmit = () => {
    const dataWithTimestamp = {
      ...data,
      timestamp: new Date().toISOString(),
    };
    // Update local state
    setData(dataWithTimestamp);
    // Only call onSubmit - it will save data + mark as complete
    onSubmit?.(dataWithTimestamp);
  };

  // Calculate overall average
  const values = GRAFANA_SERVICES.map(s => data[s.key]).filter(v => v !== null) as number[];
  const average = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : null;
  const filledCount = values.length;

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-medium text-sm">Status Grafik Grafana</h4>
          <p className="text-xs text-muted-foreground">Last 15 Minutes - Input persentase tiap layanan</p>
        </div>
        {average !== null && (
          <Badge className={average >= 95 ? 'bg-green-500' : average >= 80 ? 'bg-yellow-500' : 'bg-red-500'}>
            Avg: {average.toFixed(1)}%
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {GRAFANA_SERVICES.map((service) => {
          const val = data[service.key];
          return (
            <div key={service.key} className="space-y-1">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium">{service.label}</Label>
                {getStatusIcon(val)}
              </div>
              <div className="relative">
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={val ?? ''}
                  onChange={(e) => handleChange(service.key, e.target.value)}
                  placeholder="0-100"
                  className="pr-6 text-sm h-8"
                  disabled={readOnly || isLoading}
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                  %
                </span>
              </div>
              {val !== null && (
                <Progress value={val} className={`h-1 ${getStatusColor(val)}`} />
              )}
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between pt-2 border-t">
        <span className="text-xs text-muted-foreground">
          {filledCount}/10 layanan terisi
        </span>
        {!readOnly && onSubmit && (
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={isLoading || filledCount === 0}
          >
            <Save className="h-4 w-4 mr-1" />
            Simpan Status
          </Button>
        )}
      </div>
    </div>
  );
}
