import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN' && session.user.supportGroupCode !== 'TECH_SUPPORT')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch available OS licenses (not fully used)
    const osLicenses = await prisma.oSLicense.findMany({
      where: {
        isActive: true,
        assignedToPC: null // Only show unassigned licenses
      },
      select: {
        id: true,
        name: true,
        osName: true,
        osVersion: true,
        licenseType: true,
        licenseKey: true,
        maxActivations: true,
        currentActivations: true,
        assignedToPC: true,
        assignedToBranch: true,
        branch: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    // Fetch available Office licenses (not fully used)
    const officeLicenses = await prisma.officeLicense.findMany({
      where: {
        isActive: true,
        assignedToPC: null // Only show unassigned licenses
      },
      select: {
        id: true,
        name: true,
        productName: true,
        productType: true,
        licenseType: true,
        licenseKey: true,
        maxUsers: true,
        currentUsers: true,
        assignedToPC: true,
        assignedToBranch: true,
        branch: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    // Process licenses to show availability
    const availableOSLicenses = osLicenses.map(license => ({
      ...license,
      availableActivations: license.maxActivations - license.currentActivations,
      displayName: `${license.name} (${license.osName} ${license.osVersion || ''})`.trim(),
      isAvailable: !license.assignedToPC || (license.maxActivations > license.currentActivations)
    }));

    const availableOfficeLicenses = officeLicenses.map(license => ({
      ...license,
      availableUsers: license.maxUsers - license.currentUsers,
      displayName: `${license.name} (${license.productName})`,
      isAvailable: !license.assignedToPC || (license.maxUsers > license.currentUsers)
    }));

    return NextResponse.json({
      osLicenses: availableOSLicenses,
      officeLicenses: availableOfficeLicenses
    });
  } catch (error) {
    console.error('Error fetching available licenses:', error);
    return NextResponse.json(
      { error: 'Failed to fetch available licenses' },
      { status: 500 }
    );
  }
}