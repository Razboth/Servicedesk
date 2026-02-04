'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Save, CheckCircle2, AlertTriangle, XCircle, Wifi, Monitor, Server } from 'lucide-react';

type StatusValue = 'OK' | 'DEGRADED' | 'DOWN' | null;

export interface AvailabilityStatusData {
  koneksi: StatusValue;
  aksesAplikasi: StatusValue;
  aksesServer: StatusValue;
  notes?: string;
  timestamp?: string;
}

interface AvailabilityStatusInputProps {
  value?: AvailabilityStatusData;
  onChange: (data: AvailabilityStatusData) => void;
  onSubmit?: () => void;
  readOnly?: boolean;
  isLoading?: boolean;
}

const STATUS_OPTIONS: { value: StatusValue; label: string; icon: typeof CheckCircle2; color: string }[] = [
  { value: 'OK', label: 'OK', icon: CheckCircle2, color: 'text-green-500' },
  { value: 'DEGRADED', label: 'Degraded', icon: AlertTriangle, color: 'text-yellow-500' },
  { value: 'DOWN', label: 'Down', icon: XCircle, color: 'text-red-500' },
];

const CATEGORIES: { key: keyof Omit<AvailabilityStatusData, 'timestamp' | 'notes'>; label: string; icon: typeof Wifi; description: string }[] = [
  { key: 'koneksi', label: 'Koneksi Jaringan', icon: Wifi, description: 'Status koneksi jaringan ke server' },
  { key: 'aksesAplikasi', label: 'Akses Aplikasi', icon: Monitor, description: 'Kemampuan mengakses aplikasi utama' },
  { key: 'aksesServer', label: 'Akses Server', icon: Server, description: 'Konektivitas ke server-server' },
];

function getStatusBadge(status: StatusValue) {
  if (!status) return null;
  const option = STATUS_OPTIONS.find(o => o.value === status);
  if (!option) return null;
  const Icon = option.icon;
  return (
    <Badge
      variant="outline"
      className={`${
        status === 'OK'
          ? 'border-green-500 text-green-600'
          : status === 'DEGRADED'
          ? 'border-yellow-500 text-yellow-600'
          : 'border-red-500 text-red-600'
      }`}
    >
      <Icon className="h-3 w-3 mr-1" />
      {option.label}
    </Badge>
  );
}

export function AvailabilityStatusInput({
  value,
  onChange,
  onSubmit,
  readOnly = false,
  isLoading = false,
}: AvailabilityStatusInputProps) {
  const [data, setData] = useState<AvailabilityStatusData>({
    koneksi: null,
    aksesAplikasi: null,
    aksesServer: null,
    notes: '',
  });

  useEffect(() => {
    if (value) {
      setData(value);
    }
  }, [value]);

  const handleChange = (key: keyof Omit<AvailabilityStatusData, 'timestamp' | 'notes'>, status: StatusValue) => {
    const newData = { ...data, [key]: status };
    setData(newData);
    onChange(newData);
  };

  const handleNotesChange = (notes: string) => {
    const newData = { ...data, notes };
    setData(newData);
    onChange(newData);
  };

  const handleSubmit = () => {
    const dataWithTimestamp = {
      ...data,
      timestamp: new Date().toISOString(),
    };
    onChange(dataWithTimestamp);
    onSubmit?.();
  };

  const isAllFilled = data.koneksi && data.aksesAplikasi && data.aksesServer;
  const hasAnyIssue = data.koneksi !== 'OK' || data.aksesAplikasi !== 'OK' || data.aksesServer !== 'OK';

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-medium text-sm">Status Operasional/Availability</h4>
          <p className="text-xs text-muted-foreground">Verifikasi status koneksi dan akses sistem</p>
        </div>
        {isAllFilled && (
          <Badge variant={hasAnyIssue ? 'destructive' : 'default'}>
            {hasAnyIssue ? 'Ada Masalah' : 'Semua OK'}
          </Badge>
        )}
      </div>

      <div className="space-y-4">
        {CATEGORIES.map((category) => {
          const CategoryIcon = category.icon;
          return (
            <div key={category.key} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CategoryIcon className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <Label className="text-sm font-medium">{category.label}</Label>
                    <p className="text-xs text-muted-foreground">{category.description}</p>
                  </div>
                </div>
                {getStatusBadge(data[category.key])}
              </div>
              <RadioGroup
                value={data[category.key] || ''}
                onValueChange={(val) => handleChange(category.key, val as StatusValue)}
                className="flex gap-3"
                disabled={readOnly || isLoading}
              >
                {STATUS_OPTIONS.map((option) => {
                  const Icon = option.icon;
                  return (
                    <div key={option.value} className="flex items-center space-x-2">
                      <RadioGroupItem
                        value={option.value || ''}
                        id={`${category.key}-${option.value}`}
                        className="sr-only"
                      />
                      <Label
                        htmlFor={`${category.key}-${option.value}`}
                        className={`
                          flex items-center gap-1.5 px-3 py-1.5 rounded-lg border cursor-pointer
                          transition-colors
                          ${
                            data[category.key] === option.value
                              ? option.value === 'OK'
                                ? 'bg-green-100 border-green-500 dark:bg-green-950'
                                : option.value === 'DEGRADED'
                                ? 'bg-yellow-100 border-yellow-500 dark:bg-yellow-950'
                                : 'bg-red-100 border-red-500 dark:bg-red-950'
                              : 'bg-background hover:bg-muted'
                          }
                          ${readOnly || isLoading ? 'opacity-50 cursor-not-allowed' : ''}
                        `}
                      >
                        <Icon className={`h-4 w-4 ${option.color}`} />
                        <span className="text-sm">{option.label}</span>
                      </Label>
                    </div>
                  );
                })}
              </RadioGroup>
            </div>
          );
        })}

        {/* Notes for issues */}
        {hasAnyIssue && (
          <div className="space-y-2 pt-2 border-t">
            <Label className="text-sm">Catatan Masalah (opsional)</Label>
            <Textarea
              value={data.notes || ''}
              onChange={(e) => handleNotesChange(e.target.value)}
              placeholder="Jelaskan masalah yang ditemukan..."
              className="text-sm min-h-[60px]"
              disabled={readOnly || isLoading}
            />
          </div>
        )}
      </div>

      {!readOnly && onSubmit && (
        <div className="flex justify-end pt-2 border-t">
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={isLoading || !isAllFilled}
          >
            <Save className="h-4 w-4 mr-1" />
            Simpan Status
          </Button>
        </div>
      )}
    </div>
  );
}
