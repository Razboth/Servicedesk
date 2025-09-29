import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createAuditLog } from '@/lib/audit-logger';

/**
 * DELETE /api/admin/services/[id]/fields/cleanup
 * Comprehensive cleanup of ALL custom fields for a service
 * Removes both ServiceFields and ServiceFieldTemplates
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: serviceId } = await params;
    const session = await auth();

    if (!session || !['ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const cleanupType = searchParams.get('type') || 'all'; // all, fields, templates
    const dryRun = searchParams.get('dryRun') === 'true';

    // Verify service exists
    const service = await prisma.service.findUnique({
      where: { id: serviceId },
      select: {
        id: true,
        name: true,
        _count: {
          select: {
            fields: true,
            fieldTemplates: true,
            tickets: true
          }
        }
      }
    });

    if (!service) {
      return NextResponse.json(
        { error: 'Service not found' },
        { status: 404 }
      );
    }

    // Get detailed information about what will be deleted
    const [serviceFields, fieldTemplates] = await Promise.all([
      prisma.serviceField.findMany({
        where: { serviceId },
        select: { id: true, name: true, label: true, type: true }
      }),
      prisma.serviceFieldTemplate.findMany({
        where: { serviceId },
        include: {
          fieldTemplate: {
            select: { id: true, name: true, label: true, type: true }
          }
        }
      })
    ]);

    // Check if there are any ticket field values that would be affected
    const hasTicketData = await prisma.ticketFieldValue.count({
      where: {
        field: {
          serviceId: serviceId
        }
      }
    }) > 0;

    if (hasTicketData && !dryRun) {
      return NextResponse.json(
        {
          error: 'Cannot delete fields that have ticket data. Please use the cleanup script or contact an administrator.',
          hasTicketData: true,
          affectedTickets: service._count.tickets
        },
        { status: 400 }
      );
    }

    // Prepare response data
    const cleanupReport = {
      service: {
        id: service.id,
        name: service.name,
        ticketCount: service._count.tickets
      },
      fieldsToRemove: {
        serviceFields: serviceFields.length,
        fieldTemplates: fieldTemplates.length,
        total: serviceFields.length + fieldTemplates.length
      },
      details: {
        serviceFields: serviceFields.map(f => ({
          id: f.id,
          name: f.name,
          label: f.label,
          type: f.type
        })),
        fieldTemplates: fieldTemplates.map(sft => ({
          id: sft.id,
          fieldTemplate: {
            id: sft.fieldTemplate.id,
            name: sft.fieldTemplate.name,
            label: sft.fieldTemplate.label,
            type: sft.fieldTemplate.type
          }
        }))
      },
      dryRun,
      hasTicketData
    };

    // If dry run, return what would be deleted
    if (dryRun) {
      return NextResponse.json({
        message: 'Dry run - showing what would be deleted',
        ...cleanupReport
      });
    }

    // Perform the actual cleanup
    let deletedCount = 0;
    const deletionResults = {
      serviceFields: 0,
      fieldTemplates: 0,
      ticketFieldValues: 0,
      errors: [] as string[]
    };

    try {
      // Delete ServiceFields if requested
      if (cleanupType === 'all' || cleanupType === 'fields') {
        // Get field IDs and count related ticket field values before deletion
        const fieldsToDelete = await prisma.serviceField.findMany({
          where: { serviceId },
          select: { id: true, name: true }
        });

        let relatedFieldValues = 0;
        if (fieldsToDelete.length > 0) {
          relatedFieldValues = await prisma.ticketFieldValue.count({
            where: {
              fieldId: { in: fieldsToDelete.map(f => f.id) }
            }
          });
        }

        // Delete ServiceFields (CASCADE will automatically delete TicketFieldValues)
        const deleteResult = await prisma.serviceField.deleteMany({
          where: { serviceId }
        });

        deletionResults.serviceFields = deleteResult.count;
        deletionResults.ticketFieldValues = relatedFieldValues;
        deletedCount += deleteResult.count;

        // Verify complete removal
        const remainingFields = await prisma.serviceField.count({
          where: { serviceId }
        });
        if (remainingFields > 0) {
          deletionResults.errors.push(`Warning: ${remainingFields} ServiceFields still remain after deletion`);
        }
      }

      // Delete ServiceFieldTemplates if requested
      if (cleanupType === 'all' || cleanupType === 'templates') {
        const deleteResult = await prisma.serviceFieldTemplate.deleteMany({
          where: { serviceId }
        });
        deletionResults.fieldTemplates = deleteResult.count;
        deletedCount += deleteResult.count;
      }

      // Update service timestamp
      await prisma.service.update({
        where: { id: serviceId },
        data: { updatedAt: new Date() }
      });

      // Create audit log
      await createAuditLog({
        action: 'service_fields_cleanup',
        userId: session.user.id,
        resourceType: 'service',
        resourceId: serviceId,
        details: {
          cleanupType,
          deletedFields: deletionResults.serviceFields,
          deletedTemplates: deletionResults.fieldTemplates,
          deletedTicketFieldValues: deletionResults.ticketFieldValues,
          totalDeleted: deletedCount,
          serviceName: service.name,
          errors: deletionResults.errors
        },
        metadata: {
          beforeCleanup: {
            serviceFields: serviceFields.length,
            fieldTemplates: fieldTemplates.length
          },
          afterCleanup: deletionResults
        }
      });

      return NextResponse.json({
        message: `Successfully cleaned up ${deletedCount} custom fields from service "${service.name}"`,
        ...cleanupReport,
        deletionResults,
        success: true
      });

    } catch (deleteError) {
      console.error('Error during field cleanup:', deleteError);

      return NextResponse.json(
        {
          error: 'Failed to delete some fields',
          details: deleteError,
          partialResults: deletionResults
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Error in field cleanup:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/services/[id]/fields/cleanup
 * Preview what would be cleaned up
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: serviceId } = await params;
    const session = await auth();

    if (!session || !['ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get service information and field counts
    const service = await prisma.service.findUnique({
      where: { id: serviceId },
      select: {
        id: true,
        name: true,
        fields: {
          select: {
            id: true,
            name: true,
            label: true,
            type: true,
            isRequired: true,
            order: true
          },
          orderBy: { order: 'asc' }
        },
        fieldTemplates: {
          include: {
            fieldTemplate: {
              select: {
                id: true,
                name: true,
                label: true,
                type: true,
                category: true
              }
            }
          },
          orderBy: { order: 'asc' }
        },
        _count: {
          select: {
            tickets: true,
            fields: true,
            fieldTemplates: true
          }
        }
      }
    });

    if (!service) {
      return NextResponse.json(
        { error: 'Service not found' },
        { status: 404 }
      );
    }

    // Check for ticket data that would be affected
    const ticketFieldValues = await prisma.ticketFieldValue.count({
      where: {
        field: {
          serviceId: serviceId
        }
      }
    });

    return NextResponse.json({
      service: {
        id: service.id,
        name: service.name,
        ticketCount: service._count.tickets
      },
      currentFields: {
        serviceFields: service.fields,
        fieldTemplates: service.fieldTemplates,
        counts: {
          serviceFields: service._count.fields,
          fieldTemplates: service._count.fieldTemplates,
          total: service._count.fields + service._count.fieldTemplates
        }
      },
      riskAssessment: {
        hasTicketData: ticketFieldValues > 0,
        affectedTicketFieldValues: ticketFieldValues,
        recommendation: ticketFieldValues > 0
          ? 'Use caution - this service has ticket data that may be affected'
          : 'Safe to clean - no ticket data would be affected'
      }
    });

  } catch (error) {
    console.error('Error getting cleanup preview:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}