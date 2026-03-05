import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { authenticateApiKey, checkApiPermission, createApiErrorResponse } from '@/lib/auth-api';

// GET /api/tickets/transaction-claim/[id] - Get transaction claim ticket details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check for API key header first (case-insensitive)
    const apiKeyHeader = request.headers.get('x-api-key') ||
                         request.headers.get('X-API-Key') ||
                         request.headers.get('authorization')?.replace('Bearer ', '') ||
                         request.headers.get('Authorization')?.replace('Bearer ', '');

    console.log('[Transaction Claim API] Auth check:', {
      hasApiKeyHeader: !!apiKeyHeader,
      headerKeys: Array.from(request.headers.keys())
    });

    let isAuthenticated = false;

    if (apiKeyHeader) {
      // API key authentication
      const authResult = await authenticateApiKey(request);
      console.log('[Transaction Claim API] API Key auth result:', {
        authenticated: authResult.authenticated,
        error: authResult.error,
        hasApiKey: !!authResult.apiKey,
        permissions: authResult.apiKey?.permissions
      });

      if (!authResult.authenticated) {
        return createApiErrorResponse(authResult.error || 'Unauthorized', 401);
      }

      // Check permission for reading tickets
      const hasPermission = checkApiPermission(authResult.apiKey!, 'tickets:read');
      console.log('[Transaction Claim API] Permission check:', {
        required: 'tickets:read',
        hasPermission
      });

      if (!hasPermission) {
        return createApiErrorResponse('Insufficient permissions to read tickets', 403);
      }
      isAuthenticated = true;
    } else {
      // Session authentication
      const session = await auth();
      console.log('[Transaction Claim API] Session auth:', {
        hasSession: !!session,
        userId: session?.user?.id
      });
      if (session?.user?.id) {
        isAuthenticated = true;
      }
    }

    if (!isAuthenticated) {
      return NextResponse.json(
        { error: 'Unauthorized. Provide a valid session or API key.' },
        { status: 401 }
      );
    }

    const { id } = await params;

    // Find ticket by ID or ticket number
    const ticket = await prisma.ticket.findFirst({
      where: {
        OR: [
          { id: id },
          { ticketNumber: id }
        ]
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
            branch: {
              select: {
                id: true,
                name: true,
                code: true
              }
            }
          }
        },
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true
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
          select: {
            id: true,
            name: true,
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
                name: true,
                code: true
              }
            }
          }
        },
        fieldValues: {
          include: {
            field: {
              select: {
                id: true,
                name: true,
                label: true,
                type: true
              }
            }
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
          },
          orderBy: {
            createdAt: 'desc'
          }
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
        comments: {
          select: {
            id: true,
            content: true,
            isInternal: true,
            createdAt: true,
            user: {
              select: {
                id: true,
                name: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: 10
        },
        attachments: {
          select: {
            id: true,
            filename: true,
            originalName: true,
            mimeType: true,
            size: true,
            createdAt: true
          }
        }
      }
    });

    if (!ticket) {
      return NextResponse.json(
        { error: 'Ticket not found' },
        { status: 404 }
      );
    }

    // Helper function to get field value by field name variations
    const getFieldValue = (fieldNames: string[]): string | null => {
      const fieldValue = ticket.fieldValues.find(fv =>
        fieldNames.some(name =>
          fv.field.name.toLowerCase() === name.toLowerCase() ||
          fv.field.label.toLowerCase().includes(name.toLowerCase())
        )
      );
      return fieldValue?.value || null;
    };

    // Extract transaction claim specific fields
    const transactionClaimData = {
      // Customer Information
      customerName: getFieldValue(['customer_name', 'nama_nasabah', 'nama nasabah']),
      accountNumber: getFieldValue(['account_number', 'customer_account', 'nomor_rekening', 'nomor rekening', 'rekening']),
      cardNumber: getFieldValue(['card_number', 'card_last_4', 'nomor_kartu', 'no kartu', 'kartu']),
      customerPhone: getFieldValue(['customer_phone', 'phone_number', 'nomor_telepon', 'nomor telepon', 'no hp', 'hp']),
      customerEmail: getFieldValue(['customer_email', 'email_nasabah', 'email']),

      // Transaction Information
      transactionAmount: getFieldValue(['transaction_amount', 'nominal_transaksi', 'nominal transaksi', 'nominal', 'amount']),
      transactionDate: getFieldValue(['transaction_date', 'tanggal_transaksi', 'tanggal transaksi', 'tgl transaksi']),
      transactionId: getFieldValue(['transaction_id', 'id_transaksi', 'id transaksi', 'ref number']),
      archiveNumber: getFieldValue(['archive_number', 'nomor_arsip', 'nomor arsip']),

      // ATM Information
      atmCode: getFieldValue(['atm_code', 'kode_atm', 'kode atm', 'id atm']),
      atmLocation: getFieldValue(['atm_location', 'lokasi_atm', 'lokasi atm', 'nama atm']),
      atmSerialNumber: getFieldValue(['serial_number', 'sn', 'serial']),

      // Claim Information
      claimType: getFieldValue(['claim_type', 'jenis_klaim', 'jenis klaim', 'tipe klaim']),
      claimDescription: getFieldValue(['claim_description', 'deskripsi_klaim', 'keterangan klaim']),
      reportingChannel: getFieldValue(['reporting_channel', 'channel_pelaporan', 'channel']),

      // Branch Information
      reportingBranch: getFieldValue(['reporting_branch', 'cabang_pelapor', 'cabang pelapor']),
      ownerBranch: getFieldValue(['owner_branch', 'cabang_pemilik', 'cabang pemilik atm']),

      // Additional Fields
      errorDescription: getFieldValue(['error_description', 'keterangan_error', 'deskripsi error']),
      chronology: getFieldValue(['error_chronology', 'kronologi', 'kronologis']),
      complaint: getFieldValue(['complaint', 'keluhan', 'masalah']),

      // Verification Fields
      verificationStatus: getFieldValue(['verification_status', 'status_verifikasi']),
      verificationNotes: getFieldValue(['verification_notes', 'catatan_verifikasi']),
    };

    // Format claim type label
    const claimTypeLabels: Record<string, string> = {
      'CARD_CAPTURED': 'Kartu Tertelan',
      'CASH_NOT_DISPENSED': 'Uang Tidak Keluar',
      'WRONG_AMOUNT': 'Nominal Tidak Sesuai',
      'DOUBLE_DEBIT': 'Terdebet Ganda',
      'TIMEOUT': 'Transaksi Timeout',
      'OTHER': 'Lainnya'
    };

    // Build response object
    const response = {
      // Ticket Basic Info
      id: ticket.id,
      ticketNumber: ticket.ticketNumber,
      title: ticket.title,
      description: ticket.description,
      status: ticket.status,
      priority: ticket.priority,
      category: ticket.category,
      issueClassification: ticket.issueClassification,

      // Service Info
      service: {
        id: ticket.service?.id,
        name: ticket.service?.name,
        category: ticket.service?.tier1Category?.name,
        subcategory: ticket.service?.tier2Subcategory?.name,
        item: ticket.service?.tier3Item?.name,
        supportGroup: ticket.service?.supportGroup?.name
      },

      // Creator Info
      createdBy: {
        id: ticket.createdBy.id,
        name: ticket.createdBy.name,
        email: ticket.createdBy.email,
        branch: ticket.createdBy.branch
      },

      // Assigned Technician
      assignedTo: ticket.assignedTo ? {
        id: ticket.assignedTo.id,
        name: ticket.assignedTo.name,
        email: ticket.assignedTo.email
      } : null,

      // Branch Info
      branch: ticket.branch,

      // Transaction Claim Data
      transactionClaim: {
        ...transactionClaimData,
        claimTypeLabel: transactionClaimData.claimType
          ? claimTypeLabels[transactionClaimData.claimType] || transactionClaimData.claimType
          : null,
        transactionAmountFormatted: transactionClaimData.transactionAmount
          ? `Rp ${Number(transactionClaimData.transactionAmount).toLocaleString('id-ID')}`
          : null,
        transactionDateFormatted: transactionClaimData.transactionDate
          ? new Date(transactionClaimData.transactionDate).toLocaleString('id-ID')
          : null
      },

      // All Field Values (raw)
      fieldValues: ticket.fieldValues.map(fv => ({
        fieldId: fv.field.id,
        fieldName: fv.field.name,
        fieldLabel: fv.field.label,
        fieldType: fv.field.type,
        value: fv.value
      })),

      // Timestamps
      timestamps: {
        createdAt: ticket.createdAt,
        updatedAt: ticket.updatedAt,
        resolvedAt: ticket.resolvedAt,
        closedAt: ticket.closedAt,
        claimedAt: ticket.claimedAt,
        slaStartAt: ticket.slaStartAt
      },

      // SLA Information
      sla: ticket.slaTracking?.[0] ? {
        responseDeadline: ticket.slaTracking[0].responseDeadline,
        resolutionDeadline: ticket.slaTracking[0].resolutionDeadline,
        isResponseBreached: ticket.slaTracking[0].isResponseBreached,
        isResolutionBreached: ticket.slaTracking[0].isResolutionBreached,
        responseTime: ticket.slaTracking[0].responseTime,
        resolutionTime: ticket.slaTracking[0].resolutionTime
      } : null,

      // Approval Info
      approvals: ticket.approvals.map(approval => ({
        id: approval.id,
        status: approval.status,
        reason: approval.reason,
        approver: {
          id: approval.approver.id,
          name: approval.approver.name,
          email: approval.approver.email
        },
        createdAt: approval.createdAt,
        updatedAt: approval.updatedAt
      })),

      // Recent Comments
      recentComments: ticket.comments.map(comment => ({
        id: comment.id,
        content: comment.content,
        isInternal: comment.isInternal,
        createdAt: comment.createdAt,
        user: comment.user
      })),

      // Attachments
      attachments: ticket.attachments.map(att => ({
        id: att.id,
        filename: att.filename,
        originalName: att.originalName,
        mimeType: att.mimeType,
        size: att.size,
        createdAt: att.createdAt
      })),

      // Resolution Info
      resolution: {
        notes: ticket.resolutionNotes,
        rootCause: ticket.rootCause,
        preventiveMeasures: ticket.preventiveMeasures,
        estimatedHours: ticket.estimatedHours,
        actualHours: ticket.actualHours
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error fetching transaction claim ticket:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
