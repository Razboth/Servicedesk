'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, FileText, Table, Image } from 'lucide-react';

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
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState<string | null>(null);

  const handleExport = async (format: string) => {
    try {
      setIsExporting(format);
      await onExport(format);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(null);
      setIsOpen(false);
    }
  };

  // Helper function to export data as CSV
  const exportToCSV = (data: any[], filename: string = 'data.csv') => {
    if (!data || data.length === 0) {
      console.warn('No data to export');
      return;
    }

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header];
          // Escape quotes and wrap in quotes if contains comma or quote
          if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value ?? '';
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Helper function to export chart as image
  const exportChartAsImage = (elementId: string, filename: string = 'chart.png') => {
    const element = document.getElementById(elementId);
    if (!element) {
      console.warn('Chart element not found');
      return;
    }

    // This is a simplified version - in production, you'd use html2canvas or similar
    // For now, we'll just show a placeholder
    console.log('Chart export would be implemented here');
  };

  return (
    <div className={`relative ${className}`}>
      <Button
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className="flex items-center space-x-2"
      >
        <Download className="h-4 w-4" />
        <span>Export</span>
      </Button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-64 bg-white border rounded-lg shadow-lg z-50">
          <div className="p-2">
            <div className="text-sm font-medium text-gray-900 px-2 py-1 mb-2">
              Export {reportName}
            </div>
            {exportOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => handleExport(option.value)}
                disabled={isExporting === option.value}
                className="w-full flex items-center space-x-3 px-2 py-2 hover:bg-gray-50 rounded-md transition-colors disabled:opacity-50"
              >
                <div className="flex-shrink-0 text-gray-500">
                  {option.icon}
                </div>
                <div className="flex-1 text-left">
                  <div className="text-sm font-medium text-gray-900">
                    {option.label}
                    {isExporting === option.value && (
                      <span className="ml-2 text-xs text-blue-600">Exporting...</span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500">
                    {option.description}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
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