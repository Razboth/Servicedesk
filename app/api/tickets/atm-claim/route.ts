import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authenticateApiKey, checkApiPermission, createApiErrorResponse, createApiSuccessResponse } from '@/lib/auth-api'

export async function POST(request: NextRequest) {
  try {
    // Check API key authentication
    const authResult = await authenticateApiKey(request)
    if (!authResult.authenticated) {
      return createApiErrorResponse(authResult.error || 'Unauthorized', 401)
    }

    // Check permission for creating ATM claims
    if (!checkApiPermission(authResult.apiKey!, 'tickets:create:atm-claim')) {
      return createApiErrorResponse('Insufficient permissions to create ATM claim tickets', 403)
    }

    // Get the user who created the API key
    const apiKeyUser = await prisma.user.findUnique({
      where: { id: authResult.apiKey!.createdById },
      include: { branch: true }
    })

    if (!apiKeyUser) {
      return createApiErrorResponse('API key user not found', 404)
    }

    const body = await request.json()
    console.log('ATM Claim Request:', JSON.stringify(body, null, 2))

    // Validate required fields
    const requiredFields = [
      'atm_code',
      'transaction_date', 
      'transaction_amount',
      'card_last_4',
      'customer_name',
      'customer_account',
      'customer_phone',
      'claim_type',
      'claim_description',
      'reporting_channel'
    ]

    const missingFields = requiredFields.filter(field => !body[field])
    if (missingFields.length > 0) {
      return NextResponse.json(
        { error: `Missing required fields: ${missingFields.join(', ')}` },
        { status: 400 }
      )
    }

    // Find the ATM Claim service
    const service = await prisma.service.findFirst({
      where: {
        name: 'Penarikan Tunai Internal - ATM Claim',
        isActive: true
      },
      include: {
        fieldTemplates: {
          include: {
            fieldTemplate: true
          }
        }
      }
    })

    if (!service) {
      return NextResponse.json(
        { error: 'ATM Claim service not found' },
        { status: 404 }
      )
    }

    // Get ATM information for routing
    const atm = await prisma.aTM.findUnique({
      where: { code: body.atm_code },
      include: { branch: true }
    })

    if (!atm) {
      return NextResponse.json(
        { error: `ATM with code ${body.atm_code} not found` },
        { status: 404 }
      )
    }

    // Find the system user for the ATM's branch
    const systemUsername = `system_${atm.branch.code.toLowerCase()}`
    const branchSystemUser = await prisma.user.findFirst({
      where: {
        username: systemUsername,
        branch: { id: atm.branch.id }
      }
    })

    // Use branch system user if available, otherwise fall back to API key creator
    const ticketCreator = branchSystemUser || apiKeyUser

    // Generate ticket number
    const today = new Date()
    const ticketCount = await prisma.ticket.count({
      where: {
        createdAt: {
          gte: new Date(today.setHours(0, 0, 0, 0)),
          lt: new Date(today.setHours(23, 59, 59, 999))
        }
      }
    })
    const ticketNumber = `TKT-${today.toISOString().slice(0, 10).replace(/-/g, '')}-${String(ticketCount + 1).padStart(4, '0')}`

    // Auto-populate location and branch fields
    const enrichedBody = {
      ...body,
      atm_location: atm.location,
      owner_branch: atm.branch.name,
      reporting_branch: apiKeyUser?.branch?.name || body.reporting_branch || 'Unknown'
    }

    // Build title
    const claimTypeLabels: Record<string, string> = {
      'CARD_CAPTURED': 'Kartu Tertelan',
      'CASH_NOT_DISPENSED': 'Uang Tidak Keluar',
      'WRONG_AMOUNT': 'Nominal Tidak Sesuai',
      'DOUBLE_DEBIT': 'Terdebet Ganda',
      'TIMEOUT': 'Transaksi Timeout',
      'OTHER': 'Lainnya'
    }
    const title = `Klaim ATM - ${claimTypeLabels[body.claim_type] || body.claim_type} - ${body.atm_code}`

    // Build description
    const description = `
**Informasi Klaim ATM**
- Jenis Klaim: ${claimTypeLabels[body.claim_type] || body.claim_type}
- ATM: ${body.atm_code} - ${atm.location}
- Tanggal Transaksi: ${new Date(body.transaction_date).toLocaleString('id-ID')}
- Nominal: Rp ${Number(body.transaction_amount).toLocaleString('id-ID')}

**Informasi Nasabah**
- Nama: ${body.customer_name}
- No. Rekening: ${body.customer_account}
- No. HP: ${body.customer_phone}
- Email: ${body.customer_email || '-'}
- Kartu ATM (4 digit): ****${body.card_last_4}

**Kronologi Kejadian**
${body.claim_description}

**Informasi Pelaporan**
- Channel: ${body.reporting_channel}
- Cabang Pelapor: ${enrichedBody.reporting_branch}
- Cabang Pemilik ATM: ${atm.branch.name}
${body.transaction_ref ? `- No. Referensi: ${body.transaction_ref}` : ''}
    `.trim()

    // Start transaction
    const result = await prisma.$transaction(async (tx) => {
      // Determine initial status based on service approval requirements
      let initialStatus: 'OPEN' | 'PENDING_APPROVAL' = 'OPEN'
      
      if (service.requiresApproval) {
        // Always require approval for API-created tickets (system users are not managers)
        initialStatus = 'PENDING_APPROVAL'
      }
      
      // Create ticket with auto-routing to ATM owner branch
      const ticket = await tx.ticket.create({
        data: {
          ticketNumber,
          title,
          description,
          serviceId: service.id,
          categoryId: service.categoryId!,
          priority: service.priority,
          status: initialStatus,
          createdById: ticketCreator.id, // Use branch system user
          branchId: atm.branchId, // Route to ATM owner branch
          supportGroupId: service.supportGroupId,
          isConfidential: false,
          category: 'SERVICE_REQUEST',
          issueClassification: 'SYSTEM_ERROR'
        }
      })
      
      // Handle approval if needed
      if (service.requiresApproval) {
        // Create pending approval record with system user as temporary approver
        await tx.ticketApproval.create({
          data: {
            ticketId: ticket.id,
            approverId: ticketCreator.id, // Will be updated when actually approved
            status: 'PENDING',
            reason: 'Awaiting manager approval'
          }
        })
      }

      // Create field values for all custom fields
      const fieldValues = []
      for (const fieldTemplate of service.fieldTemplates) {
        const fieldName = fieldTemplate.fieldTemplate.name
        const value = enrichedBody[fieldName]
        
        if (value !== undefined && value !== null && value !== '') {
          // Find or create service field
          let serviceField = await tx.serviceField.findFirst({
            where: {
              serviceId: service.id,
              name: fieldName
            }
          })

          if (!serviceField) {
            serviceField = await tx.serviceField.create({
              data: {
                serviceId: service.id,
                name: fieldName,
                label: fieldTemplate.fieldTemplate.label,
                type: fieldTemplate.fieldTemplate.type,
                isRequired: fieldTemplate.isRequired ?? false,
                isUserVisible: fieldTemplate.isUserVisible ?? true,
                order: fieldTemplate.order,
                options: fieldTemplate.fieldTemplate.options as any,
                helpText: fieldTemplate.helpText || fieldTemplate.fieldTemplate.helpText,
                defaultValue: fieldTemplate.defaultValue || fieldTemplate.fieldTemplate.defaultValue,
                isActive: true
              }
            })
          }

          fieldValues.push({
            ticketId: ticket.id,
            fieldId: serviceField.id,
            value: String(value)
          })
        }
      }

      // Create all field values
      if (fieldValues.length > 0) {
        await tx.ticketFieldValue.createMany({
          data: fieldValues
        })
      }

      // Handle file attachment if provided
      if (body.evidence_file) {
        await tx.ticketAttachment.create({
          data: {
            ticketId: ticket.id,
            filename: body.evidence_file.filename || 'evidence.jpg',
            originalName: body.evidence_file.originalName || body.evidence_file.filename || 'evidence.jpg',
            mimeType: body.evidence_file.mimeType || 'image/jpeg',
            size: body.evidence_file.size || 0,
            path: body.evidence_file.path || body.evidence_file.content || ''
          }
        })
      }

      // Create initial comment as activity log
      await tx.ticketComment.create({
        data: {
          ticketId: ticket.id,
          userId: ticketCreator.id, // Use system user for comment
          content: `Ticket klaim ATM dibuat melalui API.\nATM: ${body.atm_code}\nJenis: ${claimTypeLabels[body.claim_type] || body.claim_type}\nDibuat oleh: ${apiKeyUser.name} (via API)`,
          isInternal: true
        }
      })

      // Track service usage
      await tx.serviceUsage.create({
        data: {
          serviceId: service.id,
          userId: ticketCreator.id, // Use system user
          ticketId: ticket.id,
          branchId: atm.branchId // Use ATM's branch
        }
      })

      return ticket
    })

    // Fetch complete ticket data
    const createdTicket = await prisma.ticket.findUnique({
      where: { id: result.id },
      include: {
        service: {
          select: { name: true, requiresApproval: true }
        },
        createdBy: {
          select: { name: true, email: true, role: true }
        },
        branch: {
          select: { name: true, code: true }
        },
        fieldValues: {
          include: {
            field: {
              select: { name: true, label: true, type: true }
            }
          }
        },
        attachments: true,
        approvals: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    })

    console.log(`✅ ATM Claim ticket created: ${result.ticketNumber}`)

    return createApiSuccessResponse({
      message: `Ticket klaim ATM berhasil dibuat: ${result.ticketNumber}`,
      ticket: createdTicket,
      routing: {
        reportingBranch: enrichedBody.reporting_branch,
        ownerBranch: atm.branch.name,
        routedTo: atm.branch.name,
        atm: {
          code: atm.code,
          location: atm.location
        }
      },
      approval: createdTicket?.approvals?.[0] ? {
        status: createdTicket.approvals[0].status,
        reason: createdTicket.approvals[0].reason,
        requiresApproval: service.requiresApproval
      } : null
    }, 201)

  } catch (error) {
    console.error('Error creating ATM claim ticket:', error)
    return createApiErrorResponse(
      error instanceof Error ? error.message : 'Failed to create ATM claim ticket',
      500
    )
  }
}

// GET endpoint to fetch service schema
export async function GET() {
  try {
    const service = await prisma.service.findFirst({
      where: {
        name: 'Penarikan Tunai Internal - ATM Claim',
        isActive: true
      },
      include: {
        fieldTemplates: {
          include: {
            fieldTemplate: true
          },
          orderBy: {
            order: 'asc'
          }
        }
      }
    })

    if (!service) {
      return NextResponse.json(
        { error: 'ATM Claim service not found' },
        { status: 404 }
      )
    }

    // Get list of ATMs for reference
    const atms = await prisma.aTM.findMany({
      where: { isActive: true },
      select: {
        code: true,
        location: true,
        branch: {
          select: { name: true }
        }
      },
      orderBy: {
        code: 'asc'
      }
    })

    // Build field schema
    const fieldSchema = service.fieldTemplates.map(sft => ({
      name: sft.fieldTemplate.name,
      label: sft.fieldTemplate.label,
      type: sft.fieldTemplate.type,
      required: sft.isRequired,
      category: sft.fieldTemplate.category,
      helpText: sft.helpText || sft.fieldTemplate.helpText,
      defaultValue: sft.defaultValue || sft.fieldTemplate.defaultValue,
      options: sft.fieldTemplate.options,
      validation: sft.fieldTemplate.validation
    }))

    return NextResponse.json({
      service: {
        id: service.id,
        name: service.name,
        description: service.description,
        slaHours: service.slaHours,
        responseHours: service.responseHours,
        resolutionHours: service.resolutionHours
      },
      fields: fieldSchema,
      atms: atms.map(atm => ({
        value: atm.code,
        label: `${atm.code} - ${atm.location} (${atm.branch.name})`
      })),
      examplePayload: {
        // ATM Information
        atm_code: "ATM001",
        // atm_location: "Auto-populated based on ATM selection",
        
        // Transaction Details
        transaction_date: new Date().toISOString(),
        transaction_amount: 500000,
        transaction_ref: "123456789", // Optional
        card_last_4: "1234",
        
        // Customer Information
        customer_name: "John Doe",
        customer_account: "1234567890",
        customer_phone: "081234567890",
        customer_email: "john@example.com", // Optional
        
        // Claim Details
        claim_type: "CASH_NOT_DISPENSED", // CARD_CAPTURED | CASH_NOT_DISPENSED | WRONG_AMOUNT | DOUBLE_DEBIT | TIMEOUT | OTHER
        claim_description: "Saya melakukan penarikan tunai sebesar Rp 500.000 namun uang tidak keluar dari mesin ATM...",
        evidence_file: { // Optional
          filename: "struk.jpg",
          mimeType: "image/jpeg",
          size: 1024000,
          content: "base64_encoded_content_here"
        },
        
        // Reporting Information
        reporting_channel: "BRANCH", // BRANCH | CALL_CENTER | EMAIL | MOBILE
        // reporting_branch: "Auto-populated based on user's branch",
        // owner_branch: "Auto-populated based on ATM selection"
      }
    })
  } catch (error) {
    console.error('Error fetching ATM claim schema:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch ATM claim schema',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}