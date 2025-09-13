import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';

// GET /api/vendors/[id] - Get vendor details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const vendor = await prisma.vendor.findUnique({
      where: { id: params.id },
      include: {
        vendorTickets: {
          include: {
            ticket: {
              include: {
                createdBy: {
                  select: {
                    id: true,
                    name: true,
                    email: true
                  }
                },
                assignedTo: {
                  select: {
                    id: true,
                    name: true,
                    email: true
                  }
                },
                branch: true
              }
            },
            assignedBy: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: 50
        },
        _count: {
          select: {
            vendorTickets: true
          }
        }
      }
    });

    if (!vendor) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 });
    }

    // Calculate performance metrics
    const allTickets = await prisma.vendorTicket.findMany({
      where: { vendorId: vendor.id },
      include: { ticket: true }
    });

    const resolvedTickets = allTickets.filter(vt => 
      vt.status === 'RESOLVED' || vt.ticket.status === 'RESOLVED' || vt.ticket.status === 'CLOSED'
    );

    const totalResponseTime = allTickets.reduce((acc, vt) => {
      if (vt.respondedAt && vt.createdAt) {
        return acc + (new Date(vt.respondedAt).getTime() - new Date(vt.createdAt).getTime());
      }
      return acc;
    }, 0);

    const totalResolutionTime = resolvedTickets.reduce((acc, vt) => {
      if (vt.resolvedAt && vt.createdAt) {
        return acc + (new Date(vt.resolvedAt).getTime() - new Date(vt.createdAt).getTime());
      }
      return acc;
    }, 0);

    const respondedTickets = allTickets.filter(vt => vt.respondedAt);
    const avgResponseTime = respondedTickets.length > 0 
      ? totalResponseTime / respondedTickets.length 
      : 0;
    
    const avgResolutionTime = resolvedTickets.length > 0 
      ? totalResolutionTime / resolvedTickets.length 
      : 0;

    // Calculate SLA compliance
    const slaCompliantResponse = respondedTickets.filter(vt => {
      if (vt.respondedAt && vt.createdAt) {
        const responseHours = (new Date(vt.respondedAt).getTime() - new Date(vt.createdAt).getTime()) / (1000 * 60 * 60);
        return responseHours <= vendor.slaResponseTime;
      }
      return false;
    });

    const slaCompliantResolution = resolvedTickets.filter(vt => {
      if (vt.resolvedAt && vt.createdAt) {
        const resolutionHours = (new Date(vt.resolvedAt).getTime() - new Date(vt.createdAt).getTime()) / (1000 * 60 * 60);
        return resolutionHours <= vendor.slaResolutionTime;
      }
      return false;
    });

    const metrics = {
      totalTickets: allTickets.length,
      activeTickets: allTickets.filter(vt => vt.status === 'IN_PROGRESS').length,
      pendingTickets: allTickets.filter(vt => vt.status === 'PENDING').length,
      resolvedTickets: resolvedTickets.length,
      avgResponseTimeHours: Math.round(avgResponseTime / (1000 * 60 * 60) * 10) / 10,
      avgResolutionTimeHours: Math.round(avgResolutionTime / (1000 * 60 * 60) * 10) / 10,
      slaResponseCompliance: respondedTickets.length > 0 
        ? Math.round((slaCompliantResponse.length / respondedTickets.length) * 100) 
        : 100,
      slaResolutionCompliance: resolvedTickets.length > 0 
        ? Math.round((slaCompliantResolution.length / resolvedTickets.length) * 100) 
        : 100
    };

    return NextResponse.json({
      ...vendor,
      metrics
    });
  } catch (error) {
    console.error('Error fetching vendor:', error);
    return NextResponse.json(
      { error: 'Failed to fetch vendor' },
      { status: 500 }
    );
  }
}

// PUT /api/vendors/[id] - Update vendor (Admin only)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();

    // Check if vendor exists
    const existingVendor = await prisma.vendor.findUnique({
      where: { id: params.id }
    });

    if (!existingVendor) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 });
    }

    // Check for duplicate code if code is being changed
    if (data.code && data.code !== existingVendor.code) {
      const duplicateVendor = await prisma.vendor.findUnique({
        where: { code: data.code }
      });

      if (duplicateVendor) {
        return NextResponse.json(
          { error: 'Another vendor with this code already exists' },
          { status: 400 }
        );
      }
    }

    const vendor = await prisma.vendor.update({
      where: { id: params.id },
      data: {
        name: data.name,
        code: data.code,
        contactName: data.contactPerson || data.contactName || existingVendor.contactName,
        contactEmail: data.email || data.contactEmail || existingVendor.contactEmail,
        contactPhone: data.phone || data.contactPhone || existingVendor.contactPhone,
        address: data.address !== undefined ? data.address : existingVendor.address,
        website: data.website !== undefined ? data.website : existingVendor.website,
        supportHours: data.supportHours !== undefined ? data.supportHours : existingVendor.supportHours,
        slaResponseTime: data.slaResponseTime !== undefined ? data.slaResponseTime : existingVendor.slaResponseTime,
        slaResolutionTime: data.slaResolutionTime !== undefined ? data.slaResolutionTime : existingVendor.slaResolutionTime,
        notes: data.notes !== undefined ? data.notes : existingVendor.notes,
        isActive: data.isActive !== undefined ? data.isActive : existingVendor.isActive
      }
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: 'UPDATE_VENDOR',
        entity: 'Vendor',
        entityType: 'Vendor',
        entityId: vendor.id,
        userId: session.user.id,
        details: {
          name: vendor.name,
          changes: data
        }
      }
    });

    return NextResponse.json(vendor);
  } catch (error) {
    console.error('Error updating vendor:', error);
    return NextResponse.json(
      { error: 'Failed to update vendor' },
      { status: 500 }
    );
  }
}

// DELETE /api/vendors/[id] - Deactivate vendor (Admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if vendor exists
    const vendor = await prisma.vendor.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: {
            vendorTickets: {
              where: {
                status: 'IN_PROGRESS'
              }
            }
          }
        }
      }
    });

    if (!vendor) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 });
    }

    // Check for active tickets
    if (vendor._count.vendorTickets > 0) {
      return NextResponse.json(
        { error: 'Cannot deactivate vendor with active tickets' },
        { status: 400 }
      );
    }

    // Soft delete (deactivate)
    const updatedVendor = await prisma.vendor.update({
      where: { id: params.id },
      data: { isActive: false }
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: 'DELETE_VENDOR',
        entity: 'Vendor',
        entityType: 'Vendor',
        entityId: vendor.id,
        userId: session.user.id,
        details: {
          name: vendor.name,
          code: vendor.code
        }
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting vendor:', error);
    return NextResponse.json(
      { error: 'Failed to delete vendor' },
      { status: 500 }
    );
  }
}