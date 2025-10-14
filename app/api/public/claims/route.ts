import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { authenticateApiKey, checkApiPermission, createApiErrorResponse, createApiSuccessResponse } from '@/lib/auth-api';
import { auth } from '@/lib/auth';
import { trackServiceUsage } from '@/lib/services/usage-tracker';

// Validation schema for claim tickets
const createClaimSchema = z.object({
  // Claim-specific fields
  claimType: z.enum(['REIMBURSEMENT', 'INSURANCE', 'EXPENSE', 'DAMAGE', 'LOSS', 'OTHER']).default('OTHER'),
  claimAmount: z.number().positive().optional(),
  claimCurrency: z.string().default('IDR'),
  claimDate: z.string().datetime().optional(),
  claimReason: z.string().min(10, 'Claim reason must be at least 10 characters'),
  
  // Claimant information
  claimantName: z.string().min(1, 'Claimant name is required'),
  claimantEmail: z.string().email('Valid email is required'),
  claimantPhone: z.string().optional(),
  claimantDepartment: z.string().optional(),
  claimantBranchCode: z.string().optional(),
  
  // Ticket details
  title: z.string().optional(), // Will be auto-generated if not provided
  description: z.string().optional(), // Will be combined with claim details
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  serviceId: z.string().optional(), // Will use default claim service if not provided
  
  // Attachments
  attachments: z.array(z.object({
    filename: z.string(),
    mimeType: z.string(),
    size: z.number(),
    content: z.string(), // base64 encoded
    description: z.string().optional()
  })).optional(),
  
  // Additional metadata
  referenceNumber: z.string().optional(),
  approverEmail: z.string().email().optional(),
  metadata: z.record(z.any()).optional()
});

// Helper function to determine priority based on amount
function determinePriority(amount?: number): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
  if (!amount) return 'MEDIUM';
  
  // Priority thresholds (in millions IDR)
  if (amount >= 100000000) return 'CRITICAL'; // >= 100M
  if (amount >= 50000000) return 'HIGH';      // >= 50M
  if (amount >= 10000000) return 'MEDIUM';    // >= 10M
  return 'LOW';
}

// Helper function to format claim amount
function formatClaimAmount(amount?: number, currency: string = 'IDR'): string {
  if (!amount) return 'Not specified';
  
  const formatter = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  });
  
  return formatter.format(amount);
}

// POST /api/public/claims - Create a claim ticket
export async function POST(request: NextRequest) {
  try {
    // Try API key authentication first
    const apiAuth = await authenticateApiKey(request);
    let userId: string | null = null;
    let userBranchId: string | null = null;
    
    // If no API key, try session authentication
    if (!apiAuth.authenticated) {
      const session = await auth();
      if (!session?.user?.id) {
        return createApiErrorResponse('Unauthorized. Provide API key or valid session', 401);
      }
      userId = session.user.id;
      
      // Get user's branch
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { branchId: true }
      });
      userBranchId = user?.branchId || null;
    } else {
      // Check API permissions
      if (!checkApiPermission(apiAuth.apiKey!, 'claims:create')) {
        return createApiErrorResponse('Insufficient permissions to create claim tickets', 403);
      }
      
      // Use the API key creator as the ticket creator
      userId = apiAuth.apiKey!.createdById;
      
      // Get API key creator's branch
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { branchId: true }
      });
      userBranchId = user?.branchId || null;
    }
    
    // Parse and validate request body
    const body = await request.json();
    const validatedData = createClaimSchema.parse(body);
    
    // If branch code is provided, find the branch
    let branchId = userBranchId;
    if (validatedData.claimantBranchCode) {
      const branch = await prisma.branch.findUnique({
        where: { code: validatedData.claimantBranchCode },
        select: { id: true }
      });
      
      if (branch) {
        branchId = branch.id;
      }
    }
    
    // Find or create a default claim service
    let serviceId = validatedData.serviceId;
    if (!serviceId) {
      // Try to find existing claim service
      const claimService = await prisma.service.findFirst({
        where: {
          OR: [
            { name: { contains: 'Claim', mode: 'insensitive' } },
            { name: { contains: 'Klaim', mode: 'insensitive' } },
            { name: { contains: 'Reimbursement', mode: 'insensitive' } }
          ],
          isActive: true
        },
        select: { id: true }
      });
      
      if (claimService) {
        serviceId = claimService.id;
      } else {
        // Create a default claim service if none exists
        const defaultCategory = await prisma.serviceCategory.findFirst({
          where: { level: 1, isActive: true },
          select: { id: true }
        });
        
        if (!defaultCategory) {
          return createApiErrorResponse('No service categories available. Please configure services first', 400);
        }
        
        const newService = await prisma.service.create({
          data: {
            name: 'General Claim Request',
            description: 'Automated claim processing service',
            categoryId: defaultCategory.id,
            priority: 'MEDIUM',
            slaHours: 72,
            responseHours: 4,
            resolutionHours: 72,
            requiresApproval: true,
            defaultItilCategory: 'SERVICE_REQUEST',
            defaultTitle: 'Claim Request',
            isActive: true
          }
        });
        
        serviceId = newService.id;
      }
    }
    
    // Verify service exists
    const service = await prisma.service.findUnique({
      where: { id: serviceId },
      select: { 
        id: true, 
        name: true,
        supportGroupId: true,
        defaultItilCategory: true
      }
    });
    
    if (!service) {
      return createApiErrorResponse('Service not found', 400);
    }
    
    // Generate ticket title if not provided
    const ticketTitle = validatedData.title || 
      `${validatedData.claimType} Claim - ${validatedData.claimantName} - ${formatClaimAmount(validatedData.claimAmount, validatedData.claimCurrency)}`;
    
    // Build comprehensive description
    const descriptionParts = [
      validatedData.description || '',
      '',
      '=== CLAIM DETAILS ===',
      `Type: ${validatedData.claimType}`,
      `Amount: ${formatClaimAmount(validatedData.claimAmount, validatedData.claimCurrency)}`,
      `Date: ${validatedData.claimDate || 'Not specified'}`,
      `Reason: ${validatedData.claimReason}`,
      '',
      '=== CLAIMANT INFORMATION ===',
      `Name: ${validatedData.claimantName}`,
      `Email: ${validatedData.claimantEmail}`,
      `Phone: ${validatedData.claimantPhone || 'Not provided'}`,
      `Department: ${validatedData.claimantDepartment || 'Not specified'}`,
      `Branch: ${validatedData.claimantBranchCode || 'Not specified'}`,
    ];
    
    if (validatedData.referenceNumber) {
      descriptionParts.push('', `Reference Number: ${validatedData.referenceNumber}`);
    }
    
    if (validatedData.approverEmail) {
      descriptionParts.push(`Approver: ${validatedData.approverEmail}`);
    }
    
    if (validatedData.metadata) {
      descriptionParts.push('', '=== ADDITIONAL INFORMATION ===');
      Object.entries(validatedData.metadata).forEach(([key, value]) => {
        descriptionParts.push(`${key}: ${JSON.stringify(value)}`);
      });
    }
    
    const fullDescription = descriptionParts.filter(line => line !== null).join('\n');
    
    // Determine priority
    const priority = validatedData.priority || determinePriority(validatedData.claimAmount);
    
    // Process attachments
    const attachmentData: any[] = [];
    if (validatedData.attachments && validatedData.attachments.length > 0) {
      for (const attachment of validatedData.attachments) {
        attachmentData.push({
          filename: attachment.filename,
          originalName: attachment.filename,
          mimeType: attachment.mimeType,
          size: attachment.size,
          path: attachment.content // Store base64 content
        });
      }
    }
    
    // Create the ticket
    const ticket = await prisma.$transaction(async (tx) => {
      // Generate ticket number - use new simplified sequential format
      const currentYear = new Date().getFullYear();
      const yearStart = new Date(currentYear, 0, 1);
      const yearEnd = new Date(currentYear + 1, 0, 1);

      const yearTicketCount = await tx.ticket.count({
        where: {
          createdAt: {
            gte: yearStart,
            lt: yearEnd
          }
        }
      });

      // New simplified ticket numbering - just sequential numbers
      const ticketNumber = String(yearTicketCount + 1);
      
      // Create the ticket
      const newTicket = await tx.ticket.create({
        data: {
          ticketNumber,
          title: ticketTitle,
          description: fullDescription,
          serviceId: serviceId,
          category: service.defaultItilCategory || 'SERVICE_REQUEST',
          priority,
          status: 'PENDING_APPROVAL', // Claims typically need approval
          createdById: userId,
          branchId,
          supportGroupId: service.supportGroupId,
          isConfidential: validatedData.claimType === 'DAMAGE' || validatedData.claimType === 'LOSS',
          attachments: attachmentData.length > 0 ? {
            create: attachmentData
          } : undefined
        },
        include: {
          service: { 
            select: { 
              name: true,
              slaHours: true,
              responseHours: true,
              resolutionHours: true
            } 
          },
          createdBy: { 
            select: { 
              name: true, 
              email: true 
            } 
          },
          branch: { 
            select: { 
              name: true, 
              code: true 
            } 
          }
        }
      });
      
      // Create audit log
      await tx.auditLog.create({
        data: {
          action: 'CREATE_CLAIM_TICKET',
          entity: 'Ticket',
          entityId: newTicket.id,
          userId: userId,
          newValues: {
            ticketNumber: newTicket.ticketNumber,
            claimType: validatedData.claimType,
            claimAmount: validatedData.claimAmount,
            apiKey: apiAuth.authenticated ? apiAuth.apiKey?.name : undefined,
            source: apiAuth.authenticated ? 'API' : 'SESSION'
          }
        }
      });
      
      // Track service usage
      if (branchId) {
        trackServiceUsage(serviceId, userId, newTicket.id, branchId);
      }
      
      return newTicket;
    });
    
    // Prepare response
    const response = {
      ticketNumber: ticket.ticketNumber,
      ticketId: ticket.id,
      status: ticket.status,
      priority: ticket.priority,
      title: ticket.title,
      service: ticket.service.name,
      branch: ticket.branch ? {
        name: ticket.branch.name,
        code: ticket.branch.code
      } : null,
      sla: {
        responseHours: ticket.service.responseHours,
        resolutionHours: ticket.service.resolutionHours,
        expectedResponseBy: new Date(Date.now() + (ticket.service.responseHours || 4) * 60 * 60 * 1000).toISOString(),
        expectedResolutionBy: new Date(Date.now() + (ticket.service.resolutionHours || 72) * 60 * 60 * 1000).toISOString()
      },
      trackingUrl: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/tickets/${ticket.id}`,
      createdAt: ticket.createdAt,
      claimDetails: {
        type: validatedData.claimType,
        amount: validatedData.claimAmount,
        currency: validatedData.claimCurrency,
        referenceNumber: validatedData.referenceNumber
      }
    };
    
    return createApiSuccessResponse(response, 201);
    
  } catch (error) {
    console.error('Error creating claim ticket:', error);
    
    if (error instanceof z.ZodError) {
      return createApiErrorResponse(
        `Validation error: ${error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`,
        400
      );
    }
    
    return createApiErrorResponse('Failed to create claim ticket', 500);
  }
}

// GET /api/public/claims - Get claim ticket status (requires ticket number)
export async function GET(request: NextRequest) {
  try {
    // Authenticate request
    const apiAuth = await authenticateApiKey(request);
    const session = await auth();
    
    if (!apiAuth.authenticated && !session?.user?.id) {
      return createApiErrorResponse('Unauthorized. Provide API key or valid session', 401);
    }
    
    if (apiAuth.authenticated && !checkApiPermission(apiAuth.apiKey!, 'claims:read')) {
      return createApiErrorResponse('Insufficient permissions to read claim tickets', 403);
    }
    
    // Get ticket number from query params
    const { searchParams } = new URL(request.url);
    const ticketNumber = searchParams.get('ticketNumber');
    
    if (!ticketNumber) {
      return createApiErrorResponse('Ticket number is required', 400);
    }
    
    // Find the ticket
    const ticket = await prisma.ticket.findUnique({
      where: { ticketNumber },
      include: {
        service: {
          select: {
            name: true,
            slaHours: true,
            responseHours: true,
            resolutionHours: true
          }
        },
        createdBy: {
          select: {
            name: true,
            email: true
          }
        },
        assignedTo: {
          select: {
            name: true,
            email: true
          }
        },
        branch: {
          select: {
            name: true,
            code: true
          }
        },
        comments: {
          where: { isInternal: false },
          select: {
            content: true,
            createdAt: true,
            user: {
              select: {
                name: true
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    });
    
    if (!ticket) {
      return createApiErrorResponse('Ticket not found', 404);
    }
    
    // Check if ticket is a claim (check if ticket number starts with CLM or description contains claim details)
    const isClaim = ticket.ticketNumber.startsWith('CLM') || 
                    ticket.description.includes('=== CLAIM DETAILS ===');
    
    if (!isClaim) {
      return createApiErrorResponse('This is not a claim ticket', 400);
    }
    
    // Parse claim details from description if available
    let claimDetails: any = {};
    if (ticket.description.includes('=== CLAIM DETAILS ===')) {
      const lines = ticket.description.split('\n');
      let inClaimSection = false;
      
      for (const line of lines) {
        if (line.includes('=== CLAIM DETAILS ===')) {
          inClaimSection = true;
          continue;
        }
        if (line.includes('===') && inClaimSection) {
          break;
        }
        if (inClaimSection && line.includes(':')) {
          const [key, value] = line.split(':').map(s => s.trim());
          if (key === 'Type') claimDetails.type = value;
          if (key === 'Amount') claimDetails.amount = value;
          if (key === 'Date') claimDetails.date = value;
          if (key === 'Reference Number') claimDetails.referenceNumber = value;
        }
      }
    }
    
    // Calculate SLA status
    const now = new Date();
    const createdAt = new Date(ticket.createdAt);
    const responseDeadline = new Date(createdAt.getTime() + (ticket.service.responseHours || 4) * 60 * 60 * 1000);
    const resolutionDeadline = new Date(createdAt.getTime() + (ticket.service.resolutionHours || 72) * 60 * 60 * 1000);
    
    const slaStatus = {
      responseBreached: now > responseDeadline && !ticket.resolvedAt,
      resolutionBreached: now > resolutionDeadline && !ticket.resolvedAt,
      responseDeadline: responseDeadline.toISOString(),
      resolutionDeadline: resolutionDeadline.toISOString()
    };
    
    const response = {
      ticketNumber: ticket.ticketNumber,
      ticketId: ticket.id,
      status: ticket.status,
      priority: ticket.priority,
      title: ticket.title,
      description: ticket.description,
      service: ticket.service.name,
      createdBy: {
        name: ticket.createdBy.name,
        email: ticket.createdBy.email
      },
      assignedTo: ticket.assignedTo ? {
        name: ticket.assignedTo.name,
        email: ticket.assignedTo.email
      } : null,
      branch: ticket.branch ? {
        name: ticket.branch.name,
        code: ticket.branch.code
      } : null,
      claimDetails,
      sla: slaStatus,
      timeline: {
        created: ticket.createdAt,
        updated: ticket.updatedAt,
        resolved: ticket.resolvedAt,
        closed: ticket.closedAt
      },
      comments: ticket.comments.map(c => ({
        content: c.content,
        createdAt: c.createdAt,
        author: c.user.name
      })),
      trackingUrl: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/tickets/${ticket.id}`
    };
    
    return createApiSuccessResponse(response);
    
  } catch (error) {
    console.error('Error fetching claim ticket:', error);
    return createApiErrorResponse('Failed to fetch claim ticket', 500);
  }
}