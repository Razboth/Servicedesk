import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateApiKey, checkApiPermission, createApiErrorResponse, createApiSuccessResponse } from '@/lib/auth-api';
import { validateOmnichannelRequest, sanitizeCustomerData } from '@/lib/omnichannel/validator';
import { transformToInternalTicket, transformToOmnichannelResponse, transformStatusResponse } from '@/lib/omnichannel/transformer';
import { OmnichannelTicketRequest, OmnichannelTicketResponse } from '@/lib/omnichannel/types';
import { trackServiceUsage } from '@/lib/services/usage-tracker';
import { sendTicketNotification } from '@/lib/services/email.service';
import { createNotification } from '@/lib/notifications';
import { saveFile } from '@/lib/file-storage';
import { getClientIp } from '@/lib/utils/ip-utils';

/**
 * POST /api/omnichannel/tickets
 * Create a ticket from omnichannel partner
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
      return createApiErrorResponse('Insufficient permissions to create omnichannel tickets', 403);
    }

    // Parse request body
    const body = await request.json();

    // Log the omnichannel request
    omnichannelLog = await prisma.omnichannelLog.create({
      data: {
        apiKeyId: authResult.apiKey!.id,
        channel: body.channel,
        serviceType: body.serviceType,
        requestData: body,
        ipAddress: getClientIp(request),
        status: 'PROCESSING'
      }
    });

    // Validate request
    const validation = await validateOmnichannelRequest(body);
    if (!validation.valid) {
      await prisma.omnichannelLog.update({
        where: { id: omnichannelLog.id },
        data: {
          status: 'FAILED',
          errorMessage: JSON.stringify(validation.errors),
          responseTime: Date.now() - startTime
        }
      });

      return createApiErrorResponse('Validation failed', 400, validation.errors);
    }

    const validatedRequest = validation.validatedData!;

    // Check for idempotency (prevent duplicate tickets)
    if (validatedRequest.integration?.requestId) {
      const existingTicket = await prisma.ticket.findFirst({
        where: {
          metadata: {
            path: ['integration', 'requestId'],
            equals: validatedRequest.integration.requestId
          }
        },
        include: {
          service: {
            include: { supportGroup: true }
          }
        }
      });

      if (existingTicket) {
        await prisma.omnichannelLog.update({
          where: { id: omnichannelLog.id },
          data: {
            status: 'DUPLICATE',
            ticketId: existingTicket.id,
            responseTime: Date.now() - startTime
          }
        });

        const response = transformToOmnichannelResponse(existingTicket, process.env.NEXT_PUBLIC_APP_URL);
        response.message = 'Ticket already exists (duplicate request)';
        return createApiSuccessResponse(response);
      }
    }

    // Sanitize customer data
    validatedRequest.customer = sanitizeCustomerData(validatedRequest.customer);

    // Get or create user for the customer
    const user = await getOrCreateCustomerUser(validatedRequest);

    // Get branch based on customer data
    const branch = await getBranchForCustomer(validatedRequest);

    // Transform to internal ticket format
    const { ticketData, attachments, fieldValues } = await transformToInternalTicket(
      validatedRequest,
      user.id,
      branch?.id || user.branchId!
    );

    // Generate ticket number (same as main API - just sequential numbers)
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

    // Use the same simple sequential numbering as the main ticket API
    const ticketNumber = String(yearTicketCount + 1);

    // Create the ticket
    const ticket = await prisma.ticket.create({
      data: {
        ...ticketData,
        ticketNumber,
        // Ensure we have the required fields
        createdById: user.id,
        branchId: branch?.id || user.branchId!,
      },
      include: {
        service: {
          include: { supportGroup: true }
        },
        branch: true,
        createdBy: true
      }
    });

    // Create field values if any
    if (fieldValues.length > 0) {
      await prisma.ticketFieldValue.createMany({
        data: fieldValues.map(fv => ({
          ticketId: ticket.id,
          fieldId: fv.fieldId,
          value: fv.value
        }))
      });
    }

    // Handle attachments
    const uploadedAttachments = [];
    for (const attachment of attachments) {
      try {
        const fileBuffer = Buffer.from(attachment.content, 'base64');
        const saveResult = await saveFile(
          fileBuffer,
          attachment.filename,
          attachment.mimeType,
          user.id
        );

        if (saveResult.success && saveResult.filename) {
          const dbAttachment = await prisma.ticketAttachment.create({
            data: {
              ticketId: ticket.id,
              filename: attachment.filename,
              originalName: attachment.filename,
              path: saveResult.filename,
              mimeType: attachment.mimeType,
              size: attachment.size
            }
          });
          uploadedAttachments.push(dbAttachment);
        }
      } catch (error) {
        console.error('Failed to upload attachment:', error);
      }
    }

    // Create SLA tracking
    const slaHours = ticket.service?.slaHours || 24;

    // Get or create SLA template for the service
    let slaTemplate = await prisma.sLATemplate.findUnique({
      where: {
        serviceId: ticket.serviceId
      }
    });

    if (!slaTemplate) {
      slaTemplate = await prisma.sLATemplate.create({
        data: {
          serviceId: ticket.serviceId,
          responseHours: Math.floor(slaHours * 0.25), // 25% for response
          resolutionHours: slaHours,
          escalationHours: Math.floor(slaHours * 0.75), // 75% for escalation
          businessHoursOnly: false, // 24/7 for omnichannel
          isActive: true
        }
      });
    }

    await prisma.sLATracking.create({
      data: {
        ticketId: ticket.id,
        slaTemplateId: slaTemplate.id,
        responseDeadline: new Date(Date.now() + (slaHours * 0.25) * 60 * 60 * 1000), // 25% for response
        resolutionDeadline: new Date(Date.now() + slaHours * 60 * 60 * 1000),
        escalationDeadline: new Date(Date.now() + (slaHours * 0.75) * 60 * 60 * 1000), // 75% for escalation
        isResponseBreached: false,
        isResolutionBreached: false
      }
    });

    // Track service usage
    await trackServiceUsage(user.id, ticketData.serviceId);

    // Create notification
    await createNotification({
      userId: user.id,
      type: 'TICKET_CREATED',
      title: 'Ticket Created via Omnichannel',
      message: `Your ticket ${ticket.ticketNumber} has been created`,
      data: { ticketId: ticket.id }
    });

    // Send email notification if enabled
    if (validatedRequest.customer.email) {
      try {
        await sendTicketNotification({
          to: validatedRequest.customer.email,
          ticket,
          type: 'created'
        });
      } catch (error) {
        console.error('Failed to send email notification:', error);
      }
    }

    // Create KLAIM-OMNI ticket if this is a claim
    if (validatedRequest.serviceType === 'CLAIM' && validatedRequest.ticket.metadata) {
      try {
        const { mapClaimToSubcategory } = await import('@/lib/omnichannel/service-mapper');

        // Get the correct subcategory
        const { categoryId, subcategoryId, subcategoryName } = await mapClaimToSubcategory(
          validatedRequest.ticket.metadata.mediaTransaksi || '',
          validatedRequest.ticket.metadata.jenisTransaksi
        );

        // Generate ticket number for KLAIM-OMNI
        const klaimTicketCount = await prisma.ticket.count({
          where: {
            createdAt: {
              gte: yearStart,
              lt: yearEnd
            }
          }
        });
        const klaimTicketNumber = String(klaimTicketCount + 1);

        // Create KLAIM-OMNI title
        const mediaText = validatedRequest.ticket.metadata.mediaTransaksi || 'UNKNOWN';
        const jenisText = validatedRequest.ticket.metadata.jenisTransaksi || '';
        const klaimTitle = `KLAIM - OMNI - ${mediaText}${jenisText ? ' - ' + jenisText : ''}`;

        // Build KLAIM-OMNI description
        const klaimDescription = `
=== KLAIM OMNI TICKET ===
Original Ticket: #${ticket.ticketNumber}

=== DETAIL KLAIM ===
Nama Nasabah: ${validatedRequest.ticket.metadata.namaNasabah || validatedRequest.customer.name}
Media Transaksi: ${mediaText}
Jenis Transaksi: ${jenisText || 'N/A'}
Nominal: Rp ${(validatedRequest.ticket.metadata.nominal || 0).toLocaleString('id-ID')}
Nomor Rekening: ${validatedRequest.ticket.metadata.nomorRekening || 'Tidak tersedia'}
Nomor Kartu: ${validatedRequest.ticket.metadata.nomorKartu || 'Tidak tersedia'}

=== INFORMASI TAMBAHAN ===
Tanggal Klaim: ${validatedRequest.ticket.metadata.claimDate || new Date().toISOString()}
Alasan Klaim: ${validatedRequest.ticket.metadata.claimReason || 'Lihat deskripsi ticket utama'}

=== DESKRIPSI ORIGINAL ===
${validatedRequest.ticket.description}
        `.trim();

        // Find a service in the Transaction Claims category
        let klaimService = null;
        if (categoryId && subcategoryId) {
          klaimService = await prisma.service.findFirst({
            where: {
              tier1CategoryId: categoryId,
              tier2SubcategoryId: subcategoryId,
              isActive: true
            }
          });
        }

        // If no specific service found, try to find any Transaction Claims service
        if (!klaimService && categoryId) {
          klaimService = await prisma.service.findFirst({
            where: {
              tier1CategoryId: categoryId,
              isActive: true
            }
          });
        }

        // Create the KLAIM-OMNI ticket
        const klaimTicket = await prisma.ticket.create({
          data: {
            ticketNumber: klaimTicketNumber,
            title: klaimTitle,
            description: klaimDescription,
            serviceId: klaimService?.id || ticket.serviceId, // Fallback to original service
            categoryId: categoryId || undefined,
            subcategoryId: subcategoryId || undefined,
            priority: ticket.priority,
            status: 'OPEN',
            createdById: user.id,
            branchId: branch?.id || user.branchId!,
            category: 'SERVICE_REQUEST',
            isConfidential: false,

            // Link to original ticket via metadata
            metadata: {
              type: 'KLAIM_OMNI',
              originalTicketId: ticket.id,
              originalTicketNumber: ticket.ticketNumber,
              mediaTransaksi: mediaText,
              jenisTransaksi: jenisText,
              nominal: validatedRequest.ticket.metadata.nominal,
              namaNasabah: validatedRequest.ticket.metadata.namaNasabah || validatedRequest.customer.name,
              nomorRekening: validatedRequest.ticket.metadata.nomorRekening,
              nomorKartu: validatedRequest.ticket.metadata.nomorKartu,
              subcategoryName: subcategoryName
            },

            // Copy omnichannel tracking info
            sourceChannel: validatedRequest.channel,
            channelReferenceId: `KLAIM-${validatedRequest.channelReferenceId}`,
            customerName: validatedRequest.customer.name,
            customerEmail: validatedRequest.customer.email,
            customerPhone: validatedRequest.customer.phone,
            customerIdentifier: validatedRequest.customer.identifier
          }
        });

        // Create SLA tracking for KLAIM-OMNI ticket
        const klaimSlaTemplate = await prisma.sLATemplate.findUnique({
          where: {
            serviceId: klaimService?.id || ticket.serviceId
          }
        });

        if (!klaimSlaTemplate) {
          await prisma.sLATemplate.create({
            data: {
              serviceId: klaimService?.id || ticket.serviceId,
              responseHours: 24,
              resolutionHours: 72, // 3 days for claims
              escalationHours: 48,
              businessHoursOnly: true,
              isActive: true
            }
          });
        }

        await prisma.sLATracking.create({
          data: {
            ticketId: klaimTicket.id,
            slaTemplateId: klaimSlaTemplate?.id || slaTemplate.id,
            responseDeadline: new Date(Date.now() + 24 * 60 * 60 * 1000),
            resolutionDeadline: new Date(Date.now() + 72 * 60 * 60 * 1000),
            escalationDeadline: new Date(Date.now() + 48 * 60 * 60 * 1000),
            isResponseBreached: false,
            isResolutionBreached: false
          }
        });

        // Add a comment linking the tickets
        await prisma.ticketComment.create({
          data: {
            ticketId: ticket.id,
            userId: user.id,
            content: `KLAIM-OMNI ticket created: #${klaimTicket.ticketNumber} for transaction claims processing`,
            isInternal: true
          }
        });

        console.log(`Created KLAIM-OMNI ticket #${klaimTicket.ticketNumber} for original ticket #${ticket.ticketNumber}`);

      } catch (error) {
        console.error('Failed to create KLAIM-OMNI ticket:', error);
        // Don't fail the main request if KLAIM-OMNI creation fails
      }
    }

    // Update omnichannel log
    await prisma.omnichannelLog.update({
      where: { id: omnichannelLog.id },
      data: {
        status: 'SUCCESS',
        ticketId: ticket.id,
        responseTime: Date.now() - startTime
      }
    });

    // Schedule webhook callback if configured
    if (validatedRequest.integration?.webhookUrl) {
      await scheduleWebhook({
        url: validatedRequest.integration.webhookUrl,
        event: 'TICKET_CREATED',
        ticketNumber: ticket.ticketNumber,
        channelReferenceId: validatedRequest.channelReferenceId
      });
    }

    // Return success response
    const response = transformToOmnichannelResponse(ticket, process.env.NEXT_PUBLIC_APP_URL);
    return createApiSuccessResponse(response);

  } catch (error) {
    console.error('Omnichannel ticket creation error:', error);

    if (omnichannelLog) {
      await prisma.omnichannelLog.update({
        where: { id: omnichannelLog.id },
        data: {
          status: 'ERROR',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          responseTime: Date.now() - startTime
        }
      }).catch(console.error);
    }

    return createApiErrorResponse(
      error instanceof Error ? error.message : 'Failed to create ticket',
      500
    );
  }
}

/**
 * GET /api/omnichannel/tickets
 * Check ticket status by ticket number or channel reference
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
      return createApiErrorResponse('Insufficient permissions to read tickets', 403);
    }

    const { searchParams } = new URL(request.url);
    const ticketNumber = searchParams.get('ticketNumber');
    const channelReferenceId = searchParams.get('channelReferenceId');

    if (!ticketNumber && !channelReferenceId) {
      return createApiErrorResponse('Either ticketNumber or channelReferenceId is required', 400);
    }

    // Find ticket
    const ticket = await prisma.ticket.findFirst({
      where: ticketNumber ? {
        ticketNumber
      } : {
        channelReferenceId
      },
      include: {
        assignedTo: true,
        comments: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: {
            user: {
              select: { name: true }
            }
          }
        },
        slaTracking: true
      }
    });

    if (!ticket) {
      return createApiErrorResponse('Ticket not found', 404);
    }

    // Transform and return
    const response = transformStatusResponse(ticket);
    return createApiSuccessResponse(response);

  } catch (error) {
    console.error('Omnichannel status check error:', error);
    return createApiErrorResponse(
      error instanceof Error ? error.message : 'Failed to fetch ticket status',
      500
    );
  }
}

/**
 * Get or create a user for the omnichannel customer
 */
async function getOrCreateCustomerUser(request: OmnichannelTicketRequest) {
  // Try to find existing user by email or identifier
  if (request.customer.email) {
    const existingUser = await prisma.user.findUnique({
      where: { email: request.customer.email }
    });

    if (existingUser) {
      return existingUser;
    }
  }

  // Try by customer identifier as username
  if (request.customer.identifier) {
    const existingUser = await prisma.user.findFirst({
      where: {
        username: request.customer.identifier
      }
    });

    if (existingUser) {
      return existingUser;
    }
  }

  // Create new user for the customer
  const username = request.customer.email?.split('@')[0] ||
    request.customer.identifier ||
    `omni_${Date.now()}`;

  const branch = await getBranchForCustomer(request);

  const newUser = await prisma.user.create({
    data: {
      email: request.customer.email || `${username}@omnichannel.local`,
      name: request.customer.name,
      username: username.toLowerCase(),
      role: 'USER',
      branchId: branch?.id,
      phone: request.customer.phone,
      isActive: true,
      // Omnichannel users don't have passwords (external auth)
      password: null
    }
  });

  return newUser;
}

/**
 * Get branch for customer based on branch code or default
 */
async function getBranchForCustomer(request: OmnichannelTicketRequest) {
  if (request.customer.branchCode) {
    const branch = await prisma.branch.findUnique({
      where: { code: request.customer.branchCode }
    });

    if (branch) {
      return branch;
    }
  }

  // Get default branch (main branch)
  return await prisma.branch.findFirst({
    where: {
      OR: [
        { code: '001' },
        { name: { contains: 'Utama' } },
        { name: { contains: 'Main' } }
      ]
    }
  }) || await prisma.branch.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: 'asc' }
  });
}

/**
 * Schedule webhook callback
 */
async function scheduleWebhook(data: any) {
  try {
    await prisma.webhookQueue.create({
      data: {
        url: data.url,
        payload: data,
        status: 'PENDING',
        retryCount: 0,
        scheduledFor: new Date()
      }
    });
  } catch (error) {
    console.error('Failed to schedule webhook:', error);
  }
}