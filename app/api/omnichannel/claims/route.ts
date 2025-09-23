import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateApiKey, checkApiPermission, createApiErrorResponse, createApiSuccessResponse } from '@/lib/auth-api';
import { trackServiceUsage } from '@/lib/services/usage-tracker';
import { createNotification } from '@/lib/notifications';
import { getClientIp } from '@/lib/utils/ip-utils';
import { z } from 'zod';

// Simplified claim validation schema
const claimSchema = z.object({
  namaNasabah: z.string().min(1, 'Nama nasabah is required'),
  mediaTransaksi: z.enum(['ATM', 'QRIS', 'DEBIT', 'TOUCH', 'SMS']),
  jenisTransaksi: z.enum(['PEMBELIAN', 'PEMBAYARAN', 'TRANSFER']).optional(),
  nominal: z.number().positive('Nominal must be positive').max(1000000000, 'Nominal exceeds maximum limit'),
  nomorRekening: z.string().optional(),
  nomorKartu: z.string().optional(),
  claimReason: z.string().optional(),
  claimDate: z.string().optional(),
  transactionId: z.string().optional(),
  referenceNumber: z.string().optional(),
  atmId: z.string().optional(),
  description: z.string().optional()
});

/**
 * POST /api/omnichannel/claims
 * Create a simplified claim ticket
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  let omnichannelLog: any;

  try {
    // Authenticate API key
    const authResult = await authenticateApiKey(request);
    if (!authResult.authenticated) {
      return createApiErrorResponse(authResult.error || 'Unauthorized', 401);
    }

    // Check permissions
    if (!checkApiPermission(authResult.apiKey!, 'omnichannel:create')) {
      return createApiErrorResponse('Insufficient permissions to create claims', 403);
    }

    // Parse request body
    const body = await request.json();

    // Log the request
    omnichannelLog = await prisma.omnichannelLog.create({
      data: {
        apiKeyId: authResult.apiKey!.id,
        channel: 'API',
        serviceType: 'CLAIM',
        requestData: body,
        ipAddress: getClientIp(request),
        status: 'PROCESSING'
      }
    });

    // Validate claim data
    const validation = claimSchema.safeParse(body);
    if (!validation.success) {
      const errors: Record<string, string> = {};
      validation.error.errors.forEach(err => {
        errors[err.path.join('.')] = err.message;
      });

      await prisma.omnichannelLog.update({
        where: { id: omnichannelLog.id },
        data: {
          status: 'FAILED',
          errorMessage: JSON.stringify(errors),
          responseTime: Date.now() - startTime
        }
      });

      return createApiErrorResponse('Validation failed', 400, errors);
    }

    const claimData = validation.data;

    // Validate media/transaction type combination
    const needsJenisTransaksi = ['ATM', 'TOUCH', 'SMS'].includes(claimData.mediaTransaksi);
    if (needsJenisTransaksi && !claimData.jenisTransaksi) {
      return createApiErrorResponse('Validation failed', 400, {
        jenisTransaksi: `Jenis transaksi is required for ${claimData.mediaTransaksi}`
      });
    }

    // Get or create user for the claim
    const systemUser = await prisma.user.findFirst({
      where: {
        username: 'omnichannel_system'
      }
    });

    if (!systemUser) {
      return createApiErrorResponse('System user not found', 500);
    }

    // Get OMNI branch
    const omniBranch = await prisma.branch.findFirst({
      where: {
        OR: [
          { code: 'OMNI' },
          { name: 'OMNICHANNEL' }
        ],
        isActive: true
      }
    });

    if (!omniBranch) {
      return createApiErrorResponse('OMNI branch not found', 500);
    }

    // Find claim service
    const claimService = await prisma.service.findFirst({
      where: {
        name: { contains: 'Claim', mode: 'insensitive' },
        isActive: true
      }
    });

    if (!claimService) {
      return createApiErrorResponse('Claim service not found', 500);
    }

    // Generate ticket number
    const currentYear = new Date().getFullYear();
    const yearStart = new Date(currentYear, 0, 1);
    const yearEnd = new Date(currentYear + 1, 0, 1);

    const yearTicketCount = await prisma.ticket.count({
      where: {
        createdAt: {
          gte: yearStart,
          lt: yearEnd
        }
      }
    });

    const ticketNumber = String(yearTicketCount + 1);

    // Build comprehensive description with all payload info
    const description = `
=== DETAIL KLAIM ===
Nama Nasabah: ${claimData.namaNasabah}
Media Transaksi: ${claimData.mediaTransaksi}
Jenis Transaksi: ${claimData.jenisTransaksi || 'N/A'}
Nominal: Rp ${claimData.nominal.toLocaleString('id-ID')}
Nomor Rekening: ${claimData.nomorRekening || '-'}
Nomor Kartu: ${claimData.nomorKartu || '-'}

=== INFORMASI TRANSAKSI ===
Tanggal Klaim: ${claimData.claimDate || new Date().toISOString()}
Alasan Klaim: ${claimData.claimReason || '-'}
${claimData.transactionId ? `ID Transaksi: ${claimData.transactionId}` : 'ID Transaksi: -'}
${claimData.referenceNumber ? `No. Referensi: ${claimData.referenceNumber}` : 'No. Referensi: -'}
${claimData.atmId ? `ATM ID: ${claimData.atmId}` : ''}

=== DESKRIPSI MASALAH ===
${claimData.description || 'Klaim transaksi bermasalah'}
    `.trim();

    // Get the correct subcategory for KLAIM-OMNI
    const { mapClaimToSubcategory } = await import('@/lib/omnichannel/service-mapper');
    const { categoryId, subcategoryId, subcategoryName } = await mapClaimToSubcategory(
      claimData.mediaTransaksi,
      claimData.jenisTransaksi
    );

    // Create KLAIM-OMNI title
    const mediaText = claimData.mediaTransaksi;
    const jenisText = claimData.jenisTransaksi || '';
    const klaimTitle = `KLAIM - OMNI - ${mediaText}${jenisText ? ' - ' + jenisText : ''}`;

    // Try to find a service in the Transaction Claims category
    let serviceToUse = claimService;
    if (categoryId && subcategoryId) {
      const klaimService = await prisma.service.findFirst({
        where: {
          tier1CategoryId: categoryId,
          tier2SubcategoryId: subcategoryId,
          isActive: true
        }
      });
      if (klaimService) {
        serviceToUse = klaimService;
      }
    } else if (categoryId) {
      const klaimService = await prisma.service.findFirst({
        where: {
          tier1CategoryId: categoryId,
          isActive: true
        }
      });
      if (klaimService) {
        serviceToUse = klaimService;
      }
    }

    // Create single KLAIM-OMNI ticket (no duplicate main ticket)
    const ticket = await prisma.ticket.create({
      data: {
        ticketNumber,
        title: klaimTitle,
        description,
        serviceId: serviceToUse.id,
        priority: claimData.nominal >= 10000000 ? 'HIGH' : 'MEDIUM',
        status: 'OPEN',
        createdById: systemUser.id,
        branchId: omniBranch.id,
        category: 'SERVICE_REQUEST',
        isConfidential: false,

        // Store metadata with KLAIM-OMNI type and category info
        metadata: {
          source: 'OMNICHANNEL_CLAIM_API',
          type: 'KLAIM_OMNI',
          subcategoryName: subcategoryName,
          ...claimData
        },

        // Set category and subcategory
        categoryId: categoryId || undefined,
        subcategoryId: subcategoryId || undefined,

        // Customer info in standard fields
        customerName: claimData.namaNasabah,
        sourceChannel: 'API'
      },
      include: {
        service: {
          include: { supportGroup: true }
        },
        branch: true,
        createdBy: true
      }
    });

    console.log(`Created KLAIM-OMNI ticket #${ticket.ticketNumber}`);

    // Create SLA tracking
    const slaHours = serviceToUse.slaHours || 24;
    let slaTemplate = await prisma.sLATemplate.findFirst({
      where: { serviceId: serviceToUse.id }
    });

    if (!slaTemplate) {
      slaTemplate = await prisma.sLATemplate.create({
        data: {
          serviceId: serviceToUse.id,
          responseHours: Math.floor(slaHours * 0.25),
          resolutionHours: slaHours,
          escalationHours: Math.floor(slaHours * 0.75),
          businessHoursOnly: false,
          isActive: true
        }
      });
    }

    await prisma.sLATracking.create({
      data: {
        ticketId: ticket.id,
        slaTemplateId: slaTemplate.id,
        responseDeadline: new Date(Date.now() + (slaHours * 0.25) * 60 * 60 * 1000),
        resolutionDeadline: new Date(Date.now() + slaHours * 60 * 60 * 1000),
        escalationDeadline: new Date(Date.now() + (slaHours * 0.75) * 60 * 60 * 1000),
        isResponseBreached: false,
        isResolutionBreached: false
      }
    });

    // Track service usage
    await trackServiceUsage(systemUser.id, serviceToUse.id);

    // Update log
    await prisma.omnichannelLog.update({
      where: { id: omnichannelLog.id },
      data: {
        status: 'SUCCESS',
        ticketId: ticket.id,
        responseData: {
          ticketNumber: ticket.ticketNumber
        },
        responseTime: Date.now() - startTime
      }
    });

    // Return response
    return createApiSuccessResponse({
      success: true,
      ticketNumber: ticket.ticketNumber,
      ticketId: ticket.id,
      status: ticket.status,
      estimatedResolution: new Date(Date.now() + slaHours * 60 * 60 * 1000).toISOString(),
      trackingUrl: `/tickets/${ticket.ticketNumber}`,
      message: 'KLAIM-OMNI ticket created successfully'
    });

  } catch (error) {
    console.error('Error creating claim:', error);

    if (omnichannelLog) {
      await prisma.omnichannelLog.update({
        where: { id: omnichannelLog.id },
        data: {
          status: 'ERROR',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          responseTime: Date.now() - startTime
        }
      });
    }

    return createApiErrorResponse(
      error instanceof Error ? error.message : 'Failed to create claim',
      500
    );
  }
}

/**
 * GET /api/omnichannel/claims/:ticketNumber
 * Get claim status
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate API key
    const authResult = await authenticateApiKey(request);
    if (!authResult.authenticated) {
      return createApiErrorResponse(authResult.error || 'Unauthorized', 401);
    }

    // Check permissions
    if (!checkApiPermission(authResult.apiKey!, 'omnichannel:read')) {
      return createApiErrorResponse('Insufficient permissions', 403);
    }

    // Get ticket number from URL
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    const ticketNumber = pathParts[pathParts.length - 1];

    if (!ticketNumber || ticketNumber === 'claims') {
      return createApiErrorResponse('Ticket number is required', 400);
    }

    // Find ticket
    const ticket = await prisma.ticket.findUnique({
      where: { ticketNumber },
      include: {
        service: {
          include: { supportGroup: true }
        },
        assignedTo: true,
        slaTracking: true,
        comments: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          include: { user: true }
        }
      }
    });

    if (!ticket) {
      return createApiErrorResponse('Ticket not found', 404);
    }

    // Return ticket status
    return createApiSuccessResponse({
      ticketNumber: ticket.ticketNumber,
      status: ticket.status,
      priority: ticket.priority,
      createdAt: ticket.createdAt,
      updatedAt: ticket.updatedAt,
      resolvedAt: ticket.resolvedAt,
      closedAt: ticket.closedAt,
      currentAssignee: ticket.assignedTo?.name,
      lastComment: ticket.comments[0] ? {
        content: ticket.comments[0].content,
        author: ticket.comments[0].user?.name || 'System',
        timestamp: ticket.comments[0].createdAt
      } : undefined,
      sla: ticket.slaTracking ? {
        responseDeadline: ticket.slaTracking.responseDeadline,
        resolutionDeadline: ticket.slaTracking.resolutionDeadline,
        isBreached: ticket.slaTracking.isResponseBreached || ticket.slaTracking.isResolutionBreached
      } : undefined
    });

  } catch (error) {
    console.error('Error fetching claim status:', error);
    return createApiErrorResponse(
      error instanceof Error ? error.message : 'Failed to fetch claim status',
      500
    );
  }
}