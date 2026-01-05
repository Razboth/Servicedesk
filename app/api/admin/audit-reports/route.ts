import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  generateAuditReport,
  exportReportToCSV,
  exportReportToExcel,
  getAvailableReportTypes,
  AuditReportType
} from '@/lib/audit/audit-report-generator';
import { createAuditLog } from '@/lib/audit-logger';

// GET: List available report types
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user || !['ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const reportTypes = getAvailableReportTypes();

    return NextResponse.json({
      reportTypes
    });

  } catch (error) {
    console.error('Failed to get report types:', error);
    return NextResponse.json(
      { error: 'Failed to get report types' },
      { status: 500 }
    );
  }
}

// POST: Generate audit report
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user || !['ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      type,
      startDate,
      endDate,
      format = 'json',
      filters
    } = body;

    // Validate report type
    const validTypes: AuditReportType[] = [
      'LOGIN_ACTIVITY',
      'FAILED_LOGINS',
      'PASSWORD_CHANGES',
      'USER_ACTIVITY',
      'SECURITY_EVENTS',
      'PROFILE_CHANGES',
      'SESSION_HISTORY'
    ];

    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: 'Invalid report type' },
        { status: 400 }
      );
    }

    // Parse dates
    const dateRange = {
      start: startDate ? new Date(startDate) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Default 7 days ago
      end: endDate ? new Date(endDate) : new Date()
    };

    // Generate report
    const report = await generateAuditReport({
      type,
      dateRange,
      filters,
      format
    });

    // Log the report generation
    await createAuditLog({
      userId: session.user.id,
      action: 'AUDIT_REPORT_GENERATED',
      entity: 'AUDIT_REPORT',
      newValues: {
        reportType: type,
        dateRange,
        recordCount: report.totalRecords
      },
      request
    });

    // Return based on format
    if (format === 'csv') {
      const csvContent = exportReportToCSV(report);

      await createAuditLog({
        userId: session.user.id,
        action: 'AUDIT_REPORT_EXPORTED',
        entity: 'AUDIT_REPORT',
        newValues: {
          reportType: type,
          format: 'csv',
          recordCount: report.totalRecords
        },
        request
      });

      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="audit-${type.toLowerCase()}-${new Date().toISOString().split('T')[0]}.csv"`
        }
      });
    }

    if (format === 'xlsx') {
      const buffer = exportReportToExcel(report);

      await createAuditLog({
        userId: session.user.id,
        action: 'AUDIT_REPORT_EXPORTED',
        entity: 'AUDIT_REPORT',
        newValues: {
          reportType: type,
          format: 'xlsx',
          recordCount: report.totalRecords
        },
        request
      });

      return new NextResponse(buffer, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="audit-${type.toLowerCase()}-${new Date().toISOString().split('T')[0]}.xlsx"`
        }
      });
    }

    // Return JSON
    return NextResponse.json(report);

  } catch (error) {
    console.error('Failed to generate audit report:', error);
    return NextResponse.json(
      { error: 'Failed to generate report', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
