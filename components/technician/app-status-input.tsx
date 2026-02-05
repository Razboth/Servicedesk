'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Save, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';

type AppStatusValue = 'OK' | 'WARNING' | 'CRITICAL' | null;

export interface AppStatusData {
  core: AppStatusValue;
  surrounding: AppStatusValue;
  supporting: AppStatusValue;
  timestamp?: string;
  notes?: string;
}

interface AppStatusInputProps {
  value?: AppStatusData;
  onChange: (data: AppStatusData) => void;
  onSubmit?: (data: AppStatusData) => void;
  readOnly?: boolean;
  isLoading?: boolean;
}

const STATUS_OPTIONS: { value: AppStatusValue; label: string; icon: typeof CheckCircle2; color: string }[] = [
  { value: 'OK', label: 'OK', icon: CheckCircle2, color: 'text-green-500' },
  { value: 'WARNING', label: 'Warning', icon: AlertTriangle, color: 'text-yellow-500' },
  { value: 'CRITICAL', label: 'Critical', icon: XCircle, color: 'text-red-500' },
];

const CATEGORIES: { key: keyof Omit<AppStatusData, 'timestamp' | 'notes'>; label: string; description: string }[] = [
  { key: 'core', label: 'Core', description: 'Aplikasi inti (Core Banking, dll)' },
  { key: 'surrounding', label: 'Surrounding', description: 'Aplikasi pendukung langsung' },
  { key: 'supporting', label: 'Supporting', description: 'Aplikasi pendukung operasional' },
];

function getStatusBadge(status: AppStatusValue) {
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
          : status === 'WARNING'
          ? 'border-yellow-500 text-yellow-600'
          : 'border-red-500 text-red-600'
      }`}
    >
      <Icon className="h-3 w-3 mr-1" />
      {option.label}
    </Badge>
  );
}

export function AppStatusInput({
  value,
  onChange,
  onSubmit,
  readOnly = false,
  isLoading = false,
}: AppStatusInputProps) {
  const [data, setData] = useState<AppStatusData>({
    core: null,
    surrounding: null,
    supporting: null,
  });

  useEffect(() => {
    if (value) {
      setData(value);
    }
  }, [value]);

  const handleChange = (key: keyof Omit<AppStatusData, 'timestamp' | 'notes'>, status: AppStatusValue) => {
    const newData = { ...data, [key]: status };
    setData(newData);
    onChange(newData);
  };

  const handleSubmit = () => {
    const dataWithTimestamp = {
      ...data,
      timestamp: new Date().toISOString(),
    };
    onChange(dataWithTimestamp);
    onSubmit?.(dataWithTimestamp);
  };

  const isAllFilled = data.core && data.surrounding && data.supporting;
  const hasAnyIssue = data.core === 'WARNING' || data.core === 'CRITICAL' ||
    data.surrounding === 'WARNING' || data.surrounding === 'CRITICAL' ||
    data.supporting === 'WARNING' || data.supporting === 'CRITICAL';

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-medium text-sm">Status Aplikasi</h4>
          <p className="text-xs text-muted-foreground">Pilih status untuk setiap kategori aplikasi</p>
        </div>
        {isAllFilled && (
          <Badge variant={hasAnyIssue ? 'destructive' : 'default'}>
            {hasAnyIssue ? 'Ada Masalah' : 'Semua OK'}
          </Badge>
        )}
      </div>

      <div className="space-y-4">
        {CATEGORIES.map((category) => (
          <div key={category.key} className="space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">{category.label}</Label>
                <p className="text-xs text-muted-foreground">{category.description}</p>
              </div>
              {getStatusBadge(data[category.key])}
            </div>
            <RadioGroup
              value={data[category.key] || ''}
              onValueChange={(val) => handleChange(category.key, val as AppStatusValue)}
              className="flex gap-4"
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
                              : option.value === 'WARNING'
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
        ))}
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
