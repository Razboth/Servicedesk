import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import * as XLSX from 'xlsx';

// GET /api/reports/transaction-claims - Get all tickets with Transaction Claims category
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');
    const transactionStartDateParam = searchParams.get('transactionStartDate');
    const transactionEndDateParam = searchParams.get('transactionEndDate');
    const format = searchParams.get('format'); // 'csv' or 'xlsx' for export

    // Parse dates and set to start/end of day to capture full range
    let startDate: Date;
    let endDate: Date;

    if (startDateParam) {
      // Parse the start date and set to beginning of day (00:00:00)
      startDate = new Date(startDateParam);
      startDate.setHours(0, 0, 0, 0);
    } else {
      // Default to 30 days ago
      startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
      startDate.setHours(0, 0, 0, 0);
    }

    if (endDateParam) {
      // Parse the end date and set to end of day (23:59:59.999)
      endDate = new Date(endDateParam);
      endDate.setHours(23, 59, 59, 999);
    } else {
      // Default to today
      endDate = new Date();
      endDate.setHours(23, 59, 59, 999);
    }

    // Parse transaction date filters (Tanggal Transaksi)
    let transactionStartDate: Date | null = null;
    let transactionEndDate: Date | null = null;

    if (transactionStartDateParam) {
      transactionStartDate = new Date(transactionStartDateParam);
      transactionStartDate.setHours(0, 0, 0, 0);
    }

    if (transactionEndDateParam) {
      transactionEndDate = new Date(transactionEndDateParam);
      transactionEndDate.setHours(23, 59, 59, 999);
    }

    console.log('Transaction Claims Report - Date Range:', {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      startDateParam,
      endDateParam,
      transactionStartDate: transactionStartDate?.toISOString(),
      transactionEndDate: transactionEndDate?.toISOString()
    });

    // Get tickets with "Transaction Claims" category (new 3-tier system)
    // Also include tickets with "claim" or "klaim" in the service name
    const tickets = await prisma.ticket.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate
        },
        OR: [
          // New 3-tier categorization system - tier1 category contains Transaction Claim
          {
            service: {
              tier1Category: {
                name: {
                  contains: 'Transaction Claim',
                  mode: 'insensitive'
                }
              }
            }
          },
          // Service name contains "claim" (English)
          {
            service: {
              name: {
                contains: 'claim',
                mode: 'insensitive'
              }
            }
          },
          // Service name contains "klaim" (Indonesian)
          {
            service: {
              name: {
                contains: 'klaim',
                mode: 'insensitive'
              }
            }
          }
        ]
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
            employeeId: true
          }
        },
        branch: {
          select: {
            id: true,
            name: true,
            code: true
          }
        },
        service: {
          include: {
            tier1Category: {
              select: {
                id: true,
                name: true
              }
            },
            tier2Subcategory: {
              select: {
                id: true,
                name: true
              }
            },
            tier3Item: {
              select: {
                id: true,
                name: true
              }
            },
            supportGroup: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
            employeeId: true
          }
        },
        approvals: {
          include: {
            approver: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        },
        comments: {
          select: {
            id: true,
            content: true,
            createdAt: true,
            user: {
              select: {
                name: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: 1
        },
        slaTracking: {
          select: {
            responseDeadline: true,
            resolutionDeadline: true,
            isResponseBreached: true,
            isResolutionBreached: true,
            responseTime: true,
            resolutionTime: true
          }
        },
        fieldValues: {
          include: {
            field: {
              select: {
                name: true,
                label: true,
                type: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Filter by transaction date if provided
    let filteredTickets = tickets;
    if (transactionStartDate || transactionEndDate) {
      filteredTickets = tickets.filter(ticket => {
        // Find transaction_date field value
        const transactionDateField = ticket.fieldValues.find(fv =>
          fv.field.name === 'transaction_date' ||
          fv.field.name === 'tanggal_transaksi' ||
          fv.field.label.toLowerCase().includes('tanggal transaksi')
        );

        if (!transactionDateField?.value) return false;

        try {
          const transactionDate = new Date(transactionDateField.value);
          if (isNaN(transactionDate.getTime())) return false;

          if (transactionStartDate && transactionDate < transactionStartDate) return false;
          if (transactionEndDate && transactionDate > transactionEndDate) return false;
          return true;
        } catch {
          return false;
        }
      });
    }

    console.log('Transaction Claims Report - Results:', {
      totalTickets: tickets.length,
      filteredTickets: filteredTickets.length,
      ticketNumbers: filteredTickets.slice(0, 5).map(t => t.ticketNumber),
      services: filteredTickets.slice(0, 5).map(t => ({
        serviceName: t.service?.name,
        tier1Category: t.service?.tier1Category?.name
      }))
    });

    // Helper function to extract field value
    const getFieldValue = (ticket: typeof filteredTickets[0], fieldNames: string[]) => {
      const fieldValue = ticket.fieldValues.find(fv =>
        fieldNames.some(name =>
          fv.field.name === name ||
          fv.field.label.toLowerCase().includes(name.toLowerCase())
        )
      );
      return fieldValue?.value || null;
    };

    // Transform data for export or display
    const ticketsData = filteredTickets.map(ticket => {
      // Extract transaction date from field values
      const transactionDateValue = getFieldValue(ticket, ['transaction_date', 'tanggal_transaksi', 'tanggal transaksi']);
      const customerNameValue = getFieldValue(ticket, ['customer_name', 'nama_nasabah', 'nama nasabah']);
      const transactionAmountValue = getFieldValue(ticket, ['transaction_amount', 'nominal_transaksi', 'nominal transaksi']);
      const accountNumberValue = getFieldValue(ticket, ['account_number', 'nomor_rekening', 'nomor rekening']);

      return {
        ticketNumber: ticket.ticketNumber,
        subject: ticket.title || ticket.description?.substring(0, 100) || 'N/A',
        description: ticket.description,
        status: ticket.status,
        priority: ticket.priority,
        category: ticket.service?.tier1Category?.name || 'N/A',
        subcategory: ticket.service?.tier2Subcategory?.name || 'N/A',
        serviceItem: ticket.service?.tier3Item?.name || ticket.service?.name || 'N/A',
        serviceName: ticket.service?.name || 'N/A',
        supportGroup: ticket.service?.supportGroup?.name || 'N/A',
        creatorName: ticket.createdBy?.name || 'N/A',
        creatorEmail: ticket.createdBy?.email || 'N/A',
        creatorEmployeeId: ticket.createdBy?.employeeId || 'N/A',
        branchName: ticket.branch?.name || 'N/A',
        branchCode: ticket.branch?.code || 'N/A',
        assignedToName: ticket.assignedTo?.name || 'Unassigned',
        assignedToEmail: ticket.assignedTo?.email || 'N/A',
        assignedToEmployeeId: ticket.assignedTo?.employeeId || 'N/A',
        createdAt: ticket.createdAt.toISOString(),
        updatedAt: ticket.updatedAt?.toISOString() || 'N/A',
        resolvedAt: ticket.resolvedAt?.toISOString() || 'Not Resolved',
        closedAt: ticket.closedAt?.toISOString() || 'Not Closed',
        estimatedHours: ticket.estimatedHours || 0,
        actualHours: ticket.actualHours || 0,
        progressPercentage: 0,
        responseDeadline: ticket.slaTracking?.[0]?.responseDeadline?.toISOString() || 'N/A',
        resolutionDeadline: ticket.slaTracking?.[0]?.resolutionDeadline?.toISOString() || 'N/A',
        isResponseBreached: ticket.slaTracking?.[0]?.isResponseBreached ? 'Yes' : 'No',
        isResolutionBreached: ticket.slaTracking?.[0]?.isResolutionBreached ? 'Yes' : 'No',
        responseTime: ticket.slaTracking?.[0]?.responseTime || 0,
        resolutionTime: ticket.slaTracking?.[0]?.resolutionTime || 0,
        approvalStatus: ticket.approvals && ticket.approvals.length > 0
          ? ticket.approvals[0].status
          : 'N/A',
        lastComment: ticket.comments && ticket.comments.length > 0
          ? ticket.comments[0].content
          : 'No comments',
        lastCommentDate: ticket.comments && ticket.comments.length > 0
          ? ticket.comments[0].createdAt.toISOString()
          : 'N/A',
        // Transaction claim specific fields
        transactionDate: transactionDateValue,
        customerName: customerNameValue || ticket.customerName || 'N/A',
        transactionAmount: transactionAmountValue,
        accountNumber: accountNumberValue
      };
    });

    // If export format is requested, return CSV or XLSX data
    if (format === 'csv') {
      const csvHeaders = [
        'Ticket Number', 'Subject', 'Description', 'Status', 'Priority',
        'Category', 'Subcategory', 'Service Item', 'Service Name', 'Support Group',
        'Customer Name', 'Account Number', 'Transaction Date', 'Transaction Amount',
        'Creator Name', 'Creator Email', 'Creator Employee ID',
        'Branch Name', 'Branch Code',
        'Assigned To', 'Assigned Email', 'Assigned Employee ID',
        'Created At', 'Updated At', 'Resolved At', 'Closed At',
        'Estimated Hours', 'Actual Hours', 'Progress %',
        'Response Deadline', 'Resolution Deadline',
        'Response Breached', 'Resolution Breached',
        'Response Time (hrs)', 'Resolution Time (hrs)',
        'Approval Status', 'Last Comment', 'Last Comment Date'
      ];

      const csvRows = ticketsData.map(ticket => [
        ticket.ticketNumber,
        `"${(ticket.subject || '').replace(/"/g, '""')}"`,
        `"${(ticket.description || '').replace(/"/g, '""')}"`,
        ticket.status,
        ticket.priority,
        ticket.category,
        ticket.subcategory,
        ticket.serviceItem,
        ticket.serviceName,
        ticket.supportGroup,
        ticket.customerName || 'N/A',
        ticket.accountNumber || 'N/A',
        ticket.transactionDate || 'N/A',
        ticket.transactionAmount || 'N/A',
        ticket.creatorName,
        ticket.creatorEmail,
        ticket.creatorEmployeeId,
        ticket.branchName,
        ticket.branchCode,
        ticket.assignedToName,
        ticket.assignedToEmail,
        ticket.assignedToEmployeeId,
        ticket.createdAt,
        ticket.updatedAt,
        ticket.resolvedAt,
        ticket.closedAt,
        ticket.estimatedHours,
        ticket.actualHours,
        ticket.progressPercentage,
        ticket.responseDeadline,
        ticket.resolutionDeadline,
        ticket.isResponseBreached,
        ticket.isResolutionBreached,
        ticket.responseTime,
        ticket.resolutionTime,
        ticket.approvalStatus,
        `"${(ticket.lastComment || '').replace(/"/g, '""')}"`,
        ticket.lastCommentDate
      ].join(','));

      const csv = [csvHeaders.join(','), ...csvRows].join('\n');

      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="transaction-claims-report-${new Date().toISOString().split('T')[0]}.csv"`
        }
      });
    }

    if (format === 'xlsx') {
      // Create worksheet data
      const wsData = [
        // Headers
        [
          'Ticket Number', 'Subject', 'Description', 'Status', 'Priority',
          'Category', 'Subcategory', 'Service Item', 'Service Name', 'Support Group',
          'Customer Name', 'Account Number', 'Transaction Date', 'Transaction Amount',
          'Creator Name', 'Creator Email', 'Creator Employee ID',
          'Branch Name', 'Branch Code',
          'Assigned To', 'Assigned Email', 'Assigned Employee ID',
          'Created At', 'Updated At', 'Resolved At', 'Closed At',
          'Estimated Hours', 'Actual Hours', 'Progress %',
          'Response Deadline', 'Resolution Deadline',
          'Response Breached', 'Resolution Breached',
          'Response Time (hrs)', 'Resolution Time (hrs)',
          'Approval Status', 'Last Comment', 'Last Comment Date'
        ],
        // Data rows
        ...ticketsData.map(ticket => [
          ticket.ticketNumber,
          ticket.subject,
          ticket.description,
          ticket.status,
          ticket.priority,
          ticket.category,
          ticket.subcategory,
          ticket.serviceItem,
          ticket.serviceName,
          ticket.supportGroup,
          ticket.customerName || 'N/A',
          ticket.accountNumber || 'N/A',
          ticket.transactionDate || 'N/A',
          ticket.transactionAmount || 'N/A',
          ticket.creatorName,
          ticket.creatorEmail,
          ticket.creatorEmployeeId,
          ticket.branchName,
          ticket.branchCode,
          ticket.assignedToName,
          ticket.assignedToEmail,
          ticket.assignedToEmployeeId,
          ticket.createdAt,
          ticket.updatedAt,
          ticket.resolvedAt,
          ticket.closedAt,
          ticket.estimatedHours,
          ticket.actualHours,
          ticket.progressPercentage,
          ticket.responseDeadline,
          ticket.resolutionDeadline,
          ticket.isResponseBreached,
          ticket.isResolutionBreached,
          ticket.responseTime,
          ticket.resolutionTime,
          ticket.approvalStatus,
          ticket.lastComment,
          ticket.lastCommentDate
        ])
      ];

      // Create workbook and worksheet
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(wsData);

      // Set column widths
      const colWidths = [
        { wch: 15 }, // Ticket Number
        { wch: 30 }, // Subject
        { wch: 40 }, // Description
        { wch: 15 }, // Status
        { wch: 10 }, // Priority
        { wch: 20 }, // Category
        { wch: 20 }, // Subcategory
        { wch: 25 }, // Service Item
        { wch: 25 }, // Service Name
        { wch: 20 }, // Support Group
        { wch: 25 }, // Creator Name
        { wch: 30 }, // Creator Email
        { wch: 15 }, // Creator Employee ID
        { wch: 30 }, // Branch Name
        { wch: 12 }, // Branch Code
        { wch: 25 }, // Assigned To
        { wch: 30 }, // Assigned Email
        { wch: 15 }, // Assigned Employee ID
        { wch: 20 }, // Created At
        { wch: 20 }, // Updated At
        { wch: 20 }, // Resolved At
        { wch: 20 }, // Closed At
        { wch: 12 }, // Estimated Hours
        { wch: 12 }, // Actual Hours
        { wch: 10 }, // Progress %
        { wch: 20 }, // Response Deadline
        { wch: 20 }, // Resolution Deadline
        { wch: 15 }, // Response Breached
        { wch: 15 }, // Resolution Breached
        { wch: 15 }, // Response Time
        { wch: 15 }, // Resolution Time
        { wch: 15 }, // Approval Status
        { wch: 40 }, // Last Comment
        { wch: 20 }  // Last Comment Date
      ];
      ws['!cols'] = colWidths;

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, 'Transaction Claims');

      // Generate XLSX buffer
      const xlsxBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

      return new NextResponse(xlsxBuffer, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="transaction-claims-report-${new Date().toISOString().split('T')[0]}.xlsx"`
        }
      });
    }

    // Calculate summary statistics
    const summary = {
      totalTickets: filteredTickets.length,
      byStatus: filteredTickets.reduce((acc, ticket) => {
        acc[ticket.status] = (acc[ticket.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      byPriority: filteredTickets.reduce((acc, ticket) => {
        acc[ticket.priority] = (acc[ticket.priority] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      byBranch: filteredTickets.reduce((acc, ticket) => {
        const branchName = ticket.branch?.name || 'Unknown';
        acc[branchName] = (acc[branchName] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      bySupportGroup: filteredTickets.reduce((acc, ticket) => {
        const groupName = ticket.service?.supportGroup?.name || 'Unassigned';
        acc[groupName] = (acc[groupName] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      resolvedTickets: filteredTickets.filter(t => ['RESOLVED', 'CLOSED'].includes(t.status)).length,
      avgResolutionTime: filteredTickets.filter(t => t.actualHours).length > 0
        ? filteredTickets.filter(t => t.actualHours).reduce((sum, t) => sum + (t.actualHours || 0), 0) / filteredTickets.filter(t => t.actualHours).length
        : 0,
      slaBreaches: {
        response: filteredTickets.filter(t => t.slaTracking?.[0]?.isResponseBreached).length,
        resolution: filteredTickets.filter(t => t.slaTracking?.[0]?.isResolutionBreached).length
      }
    };

    // Return JSON data for display
    return NextResponse.json({
      tickets: ticketsData,
      summary,
      period: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      },
      recordCount: ticketsData.length
    });

  } catch (error) {
    console.error('Error fetching transaction claims report:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
