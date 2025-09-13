import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';

// GET /api/vendors - List all vendors with filtering
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search') || '';
    const isActive = searchParams.get('isActive');
    const serviceType = searchParams.get('serviceType');

    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
        { contactPerson: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (isActive !== null && isActive !== 'all') {
      where.isActive = isActive === 'true';
    }

    if (serviceType && serviceType !== 'all') {
      where.serviceTypes = {
        has: serviceType
      };
    }

    const vendors = await prisma.vendor.findMany({
      where,
      include: {
        _count: {
          select: {
            vendorTickets: true
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    // Calculate basic metrics for each vendor
    const vendorsWithMetrics = await Promise.all(
      vendors.map(async (vendor) => {
        const tickets = await prisma.vendorTicket.findMany({
          where: { vendorId: vendor.id },
          include: { ticket: true }
        });

        const resolvedTickets = tickets.filter(t => 
          t.ticket.status === 'RESOLVED' || t.ticket.status === 'CLOSED'
        );

        const avgResolutionTime = tickets.length > 0
          ? tickets.reduce((acc, t) => {
              if (t.resolvedAt && t.createdAt) {
                return acc + (new Date(t.resolvedAt).getTime() - new Date(t.createdAt).getTime());
              }
              return acc;
            }, 0) / (resolvedTickets.length || 1)
          : 0;

        return {
          ...vendor,
          totalTickets: tickets.length,
          activeTickets: tickets.filter(t => t.status === 'IN_PROGRESS').length,
          resolvedTickets: resolvedTickets.length,
          avgResolutionTimeHours: Math.round(avgResolutionTime / (1000 * 60 * 60))
        };
      })
    );

    return NextResponse.json(vendorsWithMetrics);
  } catch (error) {
    console.error('Error fetching vendors:', error);
    return NextResponse.json(
      { error: 'Failed to fetch vendors' },
      { status: 500 }
    );
  }
}

// POST /api/vendors - Create new vendor (Admin only)
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();

    // Validate required fields
    if (!data.name || !data.code) {
      return NextResponse.json(
        { error: 'Name and code are required' },
        { status: 400 }
      );
    }

    // Check for duplicate code
    const existingVendor = await prisma.vendor.findUnique({
      where: { code: data.code }
    });

    if (existingVendor) {
      return NextResponse.json(
        { error: 'Vendor with this code already exists' },
        { status: 400 }
      );
    }

    const vendor = await prisma.vendor.create({
      data: {
        name: data.name,
        code: data.code,
        contactName: data.contactPerson || data.contactName || null,
        contactEmail: data.email || data.contactEmail || null,
        contactPhone: data.phone || data.contactPhone || null,
        address: data.address || null,
        website: data.website || null,
        supportHours: data.supportHours || null,
        slaResponseTime: data.slaResponseTime || null,
        slaResolutionTime: data.slaResolutionTime || null,
        notes: data.notes || null,
        isActive: data.isActive !== undefined ? data.isActive : true
      }
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: 'CREATE_VENDOR',
        entity: 'Vendor',
        entityId: vendor.id,
        userId: session.user.id,
        newValues: {
          name: vendor.name,
          code: vendor.code
        }
      }
    });

    return NextResponse.json(vendor);
  } catch (error) {
    console.error('Error creating vendor:', error);
    return NextResponse.json(
      { error: 'Failed to create vendor' },
      { status: 500 }
    );
  }
}