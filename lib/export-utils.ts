'use client';

import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export interface ExportData {
  data: any[];
  filename: string;
  title?: string;
  headers?: string[];
}

// CSV Export Utility
export const exportToCSV = (exportData: ExportData) => {
  const { data, filename, headers } = exportData;
  
  if (!data || data.length === 0) {
    throw new Error('No data to export');
  }

  const finalHeaders = headers || Object.keys(data[0]);
  const csvContent = [
    finalHeaders.join(','),
    ...data.map(row => 
      finalHeaders.map(header => {
        const value = row[header];
        // Handle null/undefined values
        if (value === null || value === undefined) return '';
        
        // Escape quotes and wrap in quotes if contains comma or quote
        if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        
        // Format dates
        if (value instanceof Date) {
          return value.toLocaleDateString();
        }
        
        return String(value);
      }).join(',')
    )
  ].join('\n');

  downloadFile(csvContent, filename, 'text/csv');
};

// Excel Export Utility
export const exportToExcel = (exportData: ExportData) => {
  const { data, filename, title, headers } = exportData;
  
  if (!data || data.length === 0) {
    throw new Error('No data to export');
  }

  // Create workbook and worksheet
  const workbook = XLSX.utils.book_new();
  
  // Prepare data with proper headers
  const finalHeaders = headers || Object.keys(data[0]);
  const worksheetData = [
    finalHeaders,
    ...data.map(row => finalHeaders.map(header => {
      const value = row[header];
      if (value instanceof Date) {
        return value.toLocaleDateString();
      }
      return value;
    }))
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
  
  // Auto-size columns
  const colWidths = finalHeaders.map(header => ({ wch: Math.max(header.length, 15) }));
  worksheet['!cols'] = colWidths;

  // Add title if provided
  if (title) {
    XLSX.utils.sheet_add_aoa(worksheet, [[title]], { origin: 'A1' });
    XLSX.utils.sheet_add_aoa(worksheet, [finalHeaders], { origin: 'A3' });
    XLSX.utils.sheet_add_aoa(worksheet, data.map(row => finalHeaders.map(header => row[header])), { origin: 'A4' });
  }

  XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');
  XLSX.writeFile(workbook, filename);
};

// PDF Export Utility
export const exportToPDF = async (exportData: ExportData & { 
  chartElementId?: string;
  includeChart?: boolean;
}) => {
  const { data, filename, title = 'Report', chartElementId, includeChart } = exportData;
  
  const pdf = new jsPDF();
  let yPosition = 20;

  // Add title
  pdf.setFontSize(16);
  pdf.text(title, 20, yPosition);
  yPosition += 20;

  // Add generation date
  pdf.setFontSize(10);
  pdf.text(`Generated on: ${new Date().toLocaleDateString()}`, 20, yPosition);
  yPosition += 20;

  // Include chart if specified
  if (includeChart && chartElementId) {
    try {
      const chartElement = document.getElementById(chartElementId);
      if (chartElement) {
        const canvas = await html2canvas(chartElement);
        const imgData = canvas.toDataURL('image/png');
        
        const imgWidth = 170;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        
        pdf.addImage(imgData, 'PNG', 20, yPosition, imgWidth, imgHeight);
        yPosition += imgHeight + 20;
      }
    } catch (error) {
      console.error('Failed to include chart in PDF:', error);
    }
  }

  // Add data table if there's space and data
  if (data && data.length > 0 && yPosition < 250) {
    pdf.setFontSize(12);
    pdf.text('Data Summary:', 20, yPosition);
    yPosition += 15;

    const headers = Object.keys(data[0]);
    const maxRows = Math.floor((280 - yPosition) / 6); // Approximate rows that fit

    // Add table headers
    pdf.setFontSize(8);
    let xPosition = 20;
    headers.forEach((header, index) => {
      if (xPosition > 190) return; // Don't overflow page width
      pdf.text(header.substring(0, 15), xPosition, yPosition);
      xPosition += 35;
    });
    yPosition += 8;

    // Add data rows (limited to fit on page)
    data.slice(0, maxRows).forEach(row => {
      if (yPosition > 280) return; // Don't overflow page height
      
      xPosition = 20;
      headers.forEach(header => {
        if (xPosition > 190) return;
        const value = row[header];
        const displayValue = value instanceof Date 
          ? value.toLocaleDateString() 
          : String(value || '').substring(0, 12);
        pdf.text(displayValue, xPosition, yPosition);
        xPosition += 35;
      });
      yPosition += 6;
    });

    if (data.length > maxRows) {
      pdf.text(`... and ${data.length - maxRows} more rows`, 20, yPosition + 10);
    }
  }

  pdf.save(filename);
};

// Chart Export as Image
export const exportChartAsImage = async (chartElementId: string, filename: string, format: 'png' | 'jpeg' = 'png') => {
  const element = document.getElementById(chartElementId);
  if (!element) {
    throw new Error('Chart element not found');
  }

  try {
    const canvas = await html2canvas(element, {
      backgroundColor: '#ffffff',
      scale: 2, // Higher quality
      logging: false,
    });

    // Convert to blob and download
    canvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
    }, `image/${format}`, 0.95);
  } catch (error) {
    console.error('Failed to export chart:', error);
    throw new Error('Failed to export chart as image');
  }
};

// Generic download file utility
const downloadFile = (content: string, filename: string, mimeType: string) => {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8;` });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// Generate filename with timestamp
export const generateFilename = (baseName: string, extension: string, includeTimestamp: boolean = true) => {
  const cleanBaseName = baseName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  const timestamp = includeTimestamp ? `_${new Date().toISOString().split('T')[0]}` : '';
  return `${cleanBaseName}${timestamp}.${extension}`;
};

// Format data for export (clean up and standardize)
export const formatDataForExport = (
  data: any[], 
  formatters: Record<string, (value: any) => string> = {},
  excludeFields: string[] = []
) => {
  return data.map(row => {
    const formattedRow: any = {};
    
    Object.entries(row).forEach(([key, value]) => {
      // Skip excluded fields
      if (excludeFields.includes(key)) return;
      
      // Apply custom formatter if available
      if (formatters[key]) {
        formattedRow[key] = formatters[key](value);
      } 
      // Format dates
      else if (value instanceof Date) {
        formattedRow[key] = value.toLocaleDateString();
      } 
      // Format numbers
      else if (typeof value === 'number') {
        formattedRow[key] = Number.isInteger(value) ? value : value.toFixed(2);
      }
      // Handle null/undefined
      else if (value === null || value === undefined) {
        formattedRow[key] = '';
      }
      // Default string conversion
      else {
        formattedRow[key] = String(value);
      }
    });
    
    return formattedRow;
  });
};

// Ticket-specific export utilities
export const ticketExportFormatters = {
  createdAt: (date: string | Date) => new Date(date).toLocaleDateString(),
  updatedAt: (date: string | Date) => new Date(date).toLocaleDateString(),
  resolvedAt: (date: string | Date) => date ? new Date(date).toLocaleDateString() : 'Not resolved',
  closedAt: (date: string | Date) => date ? new Date(date).toLocaleDateString() : 'Not closed',
  priority: (priority: string) => priority?.toUpperCase() || 'NONE',
  status: (status: string) => status?.replace('_', ' ').toUpperCase() || 'UNKNOWN'
};

// Analytics export utilities
export const analyticsExportFormatters = {
  percentage: (value: number) => `${(value * 100).toFixed(1)}%`,
  currency: (value: number) => `$${value.toFixed(2)}`,
  duration: (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  }
};