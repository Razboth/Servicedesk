'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, FileText, Table, Image, Loader2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';

interface ExportOption {
  label: string;
  value: string;
  icon: React.ReactNode;
  description: string;
}

interface ExportButtonProps {
  onExport: (format: string) => Promise<void> | void;
  disabled?: boolean;
  className?: string;
  reportName?: string;
}

const exportOptions: ExportOption[] = [
  {
    label: 'Excel',
    value: 'xlsx',
    icon: <Table className="h-4 w-4" />,
    description: 'Download as Excel spreadsheet'
  },
  {
    label: 'CSV',
    value: 'csv',
    icon: <FileText className="h-4 w-4" />,
    description: 'Download as CSV file'
  },
  {
    label: 'PDF',
    value: 'pdf',
    icon: <FileText className="h-4 w-4" />,
    description: 'Download as PDF report'
  },
  {
    label: 'PNG',
    value: 'png',
    icon: <Image className="h-4 w-4" />,
    description: 'Download charts as image'
  }
];

export function ExportButton({ 
  onExport, 
  disabled = false, 
  className = '',
  reportName = 'report'
}: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState<string | null>(null);

  const handleExport = async (format: string) => {
    try {
      setIsExporting(format);
      await onExport(format);
    } catch (error) {
      console.error('Export failed:', error);
      // Could add toast notification here
    } finally {
      setIsExporting(null);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled || isExporting !== null}
          className={`flex items-center space-x-2 ${className}`}
        >
          {isExporting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          <span>{isExporting ? 'Exporting...' : 'Export'}</span>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>Export {reportName}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {exportOptions.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onClick={() => handleExport(option.value)}
            disabled={isExporting === option.value}
            className="flex items-center space-x-3 cursor-pointer"
          >
            <div className="flex-shrink-0 text-muted-foreground">
              {isExporting === option.value ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                option.icon
              )}
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium">
                {option.label}
              </div>
              <div className="text-xs text-muted-foreground">
                {option.description}
              </div>
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Utility functions that can be imported and used
export const exportUtils = {
  // Export array of objects to CSV
  exportToCSV: (data: any[], filename: string = 'export.csv') => {
    if (!data || data.length === 0) return;

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header];
          if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value ?? '';
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },

  // Format data for export
  formatDataForExport: (data: any[], formatters: Record<string, (value: any) => string> = {}) => {
    return data.map(row => {
      const formattedRow: any = {};
      Object.entries(row).forEach(([key, value]) => {
        if (formatters[key]) {
          formattedRow[key] = formatters[key](value);
        } else if (value instanceof Date) {
          formattedRow[key] = value.toLocaleDateString();
        } else {
          formattedRow[key] = value;
        }
      });
      return formattedRow;
    });
  },

  // Generate filename with timestamp
  generateFilename: (baseName: string, extension: string) => {
    const timestamp = new Date().toISOString().split('T')[0];
    return `${baseName}_${timestamp}.${extension}`;
  }
};