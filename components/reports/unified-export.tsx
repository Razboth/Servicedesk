'use client';

import { useState } from 'react';
import { ExportButton } from './export-button';
import { 
  exportToCSV, 
  exportToExcel, 
  exportToPDF, 
  exportChartAsImage, 
  generateFilename,
  formatDataForExport,
  ticketExportFormatters 
} from '@/lib/export-utils';

interface ReportCard {
  title: string;
  description: string;
  href: string;
  icon: any;
  category: string;
  roles: string[];
  badge?: string;
  lastUpdated?: string;
}

interface AnalyticsData {
  summary: {
    totalTickets: number;
    openTickets: number;
    resolvedTickets: number;
    avgResolutionTime: number;
    slaCompliance: number;
    avgResponseTime: number;
  };
  distribution: {
    byStatus: Array<{ status: string; count: number; percentage: number; }>;
    byPriority: Array<{ priority: string; count: number; percentage: number; }>;
    byCategory: Array<{ category: string; count: number; percentage: number; }>;
    byBranch: Array<{ branch: string; count: number; percentage: number; }>;
  };
  performance: {
    resolutionTimes: Array<{
      priority: string;
      avgTime: number;
      targetTime: number;
      compliance: number;
    }>;
    slaMetrics: {
      onTime: number;
      breached: number;
      total: number;
      complianceRate: number;
    };
  };
  period: {
    startDate: string;
    endDate: string;
  };
}

interface UnifiedExportProps {
  reports: ReportCard[];
  analyticsData?: AnalyticsData | null;
  userRole?: string;
  className?: string;
}

export function UnifiedExport({ 
  reports, 
  analyticsData, 
  userRole,
  className = ''
}: UnifiedExportProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async (format: string) => {
    if (isExporting) return;
    
    setIsExporting(true);
    
    try {
      const timestamp = new Date().toISOString().split('T')[0];
      const baseFilename = generateFilename(`complete_reports_${userRole?.toLowerCase()}`, format, true);

      switch (format) {
        case 'csv':
          await exportUnifiedCSV(baseFilename);
          break;
        case 'xlsx':
          await exportUnifiedExcel(baseFilename);
          break;
        case 'pdf':
          await exportUnifiedPDF(baseFilename);
          break;
        case 'png':
          if (analyticsData) {
            await exportChartAsImage('analytics-dashboard', baseFilename);
          }
          break;
      }
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const exportUnifiedCSV = async (filename: string) => {
    // Combine reports catalog and analytics summary into CSV
    const reportsData = reports.map(report => ({
      title: report.title,
      description: report.description,
      category: report.category,
      badge: report.badge || 'None',
      roles: report.roles.join(', '),
      url: report.href,
      lastUpdated: report.lastUpdated || 'N/A',
      type: 'Report'
    }));

    let combinedData = reportsData;

    if (analyticsData) {
      const analyticsMetrics = [
        { title: 'Total Tickets', description: 'Total number of tickets', category: 'Analytics', badge: 'Metric', roles: userRole || '', url: '/reports?tab=analytics', lastUpdated: 'Real-time', type: 'Metric', value: analyticsData.summary.totalTickets },
        { title: 'Open Tickets', description: 'Currently open tickets', category: 'Analytics', badge: 'Metric', roles: userRole || '', url: '/reports?tab=analytics', lastUpdated: 'Real-time', type: 'Metric', value: analyticsData.summary.openTickets },
        { title: 'Resolved Tickets', description: 'Successfully resolved tickets', category: 'Analytics', badge: 'Metric', roles: userRole || '', url: '/reports?tab=analytics', lastUpdated: 'Real-time', type: 'Metric', value: analyticsData.summary.resolvedTickets },
        { title: 'SLA Compliance', description: 'Service level agreement compliance rate', category: 'Analytics', badge: 'Metric', roles: userRole || '', url: '/reports?tab=analytics', lastUpdated: 'Real-time', type: 'Metric', value: `${analyticsData.summary.slaCompliance}%` }
      ];

      combinedData = [...reportsData, ...analyticsMetrics] as any;
    }

    exportToCSV({
      data: combinedData,
      filename,
      title: `Complete Reports & Analytics Export for ${userRole}`
    });
  };

  const exportUnifiedExcel = async (filename: string) => {
    // Create multi-sheet Excel workbook
    const XLSX = await import('xlsx');
    const workbook = XLSX.utils.book_new();

    // Sheet 1: Reports Catalog
    const reportsData = reports.map(report => ({
      'Report Title': report.title,
      'Description': report.description,
      'Category': report.category,
      'Badge': report.badge || 'None',
      'Authorized Roles': report.roles.join(', '),
      'URL': report.href,
      'Last Updated': report.lastUpdated || 'N/A'
    }));

    const reportsSheet = XLSX.utils.json_to_sheet(reportsData);
    XLSX.utils.book_append_sheet(workbook, reportsSheet, 'Reports Catalog');

    // Sheet 2: Analytics Summary (if available)
    if (analyticsData) {
      const analyticsSheet = XLSX.utils.json_to_sheet([
        { 'Metric': 'Total Tickets', 'Value': analyticsData.summary.totalTickets },
        { 'Metric': 'Open Tickets', 'Value': analyticsData.summary.openTickets },
        { 'Metric': 'Resolved Tickets', 'Value': analyticsData.summary.resolvedTickets },
        { 'Metric': 'Average Resolution Time (hours)', 'Value': analyticsData.summary.avgResolutionTime },
        { 'Metric': 'SLA Compliance (%)', 'Value': analyticsData.summary.slaCompliance },
        { 'Metric': 'Average Response Time (hours)', 'Value': analyticsData.summary.avgResponseTime }
      ]);
      XLSX.utils.book_append_sheet(workbook, analyticsSheet, 'Analytics Summary');

      // Sheet 3: Status Distribution
      const statusSheet = XLSX.utils.json_to_sheet(
        analyticsData.distribution.byStatus.map(item => ({
          'Status': item.status,
          'Count': item.count,
          'Percentage': `${item.percentage}%`
        }))
      );
      XLSX.utils.book_append_sheet(workbook, statusSheet, 'Status Distribution');

      // Sheet 4: Priority Distribution
      const prioritySheet = XLSX.utils.json_to_sheet(
        analyticsData.distribution.byPriority.map(item => ({
          'Priority': item.priority,
          'Count': item.count,
          'Percentage': `${item.percentage}%`
        }))
      );
      XLSX.utils.book_append_sheet(workbook, prioritySheet, 'Priority Distribution');
    }

    XLSX.writeFile(workbook, filename);
  };

  const exportUnifiedPDF = async (filename: string) => {
    const jsPDF = (await import('jspdf')).default;
    const pdf = new jsPDF();
    let yPosition = 20;

    // Title
    pdf.setFontSize(18);
    pdf.text(`Complete Reports & Analytics for ${userRole}`, 20, yPosition);
    yPosition += 20;

    // Generation info
    pdf.setFontSize(10);
    pdf.text(`Generated on: ${new Date().toLocaleDateString()}`, 20, yPosition);
    pdf.text(`Total Reports Available: ${reports.length}`, 20, yPosition + 10);
    yPosition += 30;

    // Reports Section
    pdf.setFontSize(14);
    pdf.text('Available Reports:', 20, yPosition);
    yPosition += 15;

    pdf.setFontSize(9);
    reports.slice(0, 15).forEach((report, index) => {
      if (yPosition > 260) {
        pdf.addPage();
        yPosition = 20;
      }
      
      pdf.text(`${index + 1}. ${report.title}`, 25, yPosition);
      yPosition += 8;
      
      if (report.description.length > 0) {
        const description = report.description.length > 80 
          ? report.description.substring(0, 80) + '...' 
          : report.description;
        pdf.text(`   ${description}`, 25, yPosition);
        yPosition += 8;
      }
      
      pdf.text(`   Category: ${report.category} | Badge: ${report.badge || 'None'}`, 25, yPosition);
      yPosition += 12;
    });

    // Analytics Section (if available)
    if (analyticsData && yPosition < 200) {
      yPosition += 20;
      pdf.setFontSize(14);
      pdf.text('Analytics Summary:', 20, yPosition);
      yPosition += 15;

      pdf.setFontSize(10);
      pdf.text(`Total Tickets: ${analyticsData.summary.totalTickets}`, 25, yPosition);
      pdf.text(`Open Tickets: ${analyticsData.summary.openTickets}`, 25, yPosition + 10);
      pdf.text(`Resolved Tickets: ${analyticsData.summary.resolvedTickets}`, 25, yPosition + 20);
      pdf.text(`SLA Compliance: ${analyticsData.summary.slaCompliance}%`, 25, yPosition + 30);
    }

    pdf.save(filename);
  };

  return (
    <ExportButton
      onExport={handleExport}
      disabled={isExporting}
      reportName={`Complete Reports & Analytics${analyticsData ? ' + Live Data' : ''}`}
      className={`bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white border-0 shadow-lg ${className}`}
    />
  );
}