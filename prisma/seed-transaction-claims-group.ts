import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Creating Transaction Claims Support Group...');

  try {
    // Check if the support group already exists
    const existingGroup = await prisma.supportGroup.findUnique({
      where: { code: 'TRANSACTION_CLAIMS_SUPPORT' }
    });

    if (existingGroup) {
      console.log('Transaction Claims Support group already exists');
      return existingGroup;
    }

    // Create the support group
    const transactionClaimsGroup = await prisma.supportGroup.create({
      data: {
        code: 'TRANSACTION_CLAIMS_SUPPORT',
        name: 'Transaction Claims Support',
        description: 'Support group for viewing and responding to customer inquiries about transaction claims and disputes. Members have read-only access with ability to add internal comments.',
        isActive: true
      }
    });

    console.log('✅ Created Transaction Claims Support group:', transactionClaimsGroup.name);

    // Find existing support groups for the specified departments
    // These might already exist or need to be mapped to actual support group codes
    const departmentMappings = [
      { name: 'Call Center', code: 'CALL_CENTER' },
      { name: 'Dukungan dan Layanan', code: 'DUKUNGAN_LAYANAN' },
      { name: 'Corporate Secretary', code: 'CORPORATE_SECRETARY' }
    ];

    // Find technicians from these departments
    // First, let's check if these support groups exist
    const existingDepartments = await prisma.supportGroup.findMany({
      where: {
        OR: [
          { code: 'CALL_CENTER' },
          { code: 'DUKUNGAN_LAYANAN' },
          { code: 'CORPORATE_SECRETARY' },
          // Also check by name patterns
          { name: { contains: 'Call Center' } },
          { name: { contains: 'Dukungan' } },
          { name: { contains: 'Corporate' } }
        ]
      },
      include: {
        users: {
          where: {
            role: 'TECHNICIAN',
            isActive: true
          }
        }
      }
    });

    console.log(`Found ${existingDepartments.length} existing department support groups`);

    // Collect all technicians from these departments
    const techniciansToUpdate: string[] = [];
    
    for (const dept of existingDepartments) {
      console.log(`- ${dept.name}: ${dept.users.length} active technicians`);
      techniciansToUpdate.push(...dept.users.map(u => u.id));
    }

    // Also find technicians who might be assigned by branch/department name
    // This is a fallback if support groups don't exist yet
    const additionalTechnicians = await prisma.user.findMany({
      where: {
        role: 'TECHNICIAN',
        isActive: true,
        OR: [
          // Users with supportGroup already in our list
          { supportGroupId: { in: existingDepartments.map(d => d.id) } },
          // Users whose branch might indicate department (fallback)
          {
            branch: {
              OR: [
                { name: { contains: 'Call Center' } },
                { name: { contains: 'Dukungan' } },
                { name: { contains: 'Corporate' } }
              ]
            }
          }
        ]
      }
    });

    // Combine and deduplicate technician IDs
    const allTechnicianIds = [...new Set([
      ...techniciansToUpdate,
      ...additionalTechnicians.map(t => t.id)
    ])];

    if (allTechnicianIds.length > 0) {
      // Update these technicians to be part of the Transaction Claims Support group
      const updateResult = await prisma.user.updateMany({
        where: {
          id: { in: allTechnicianIds }
        },
        data: {
          supportGroupId: transactionClaimsGroup.id
        }
      });

      console.log(`✅ Assigned ${updateResult.count} technicians to Transaction Claims Support group`);
    } else {
      console.log('⚠️ No technicians found from specified departments. You may need to manually assign users.');
    }

    // Create audit log for this action
    await prisma.auditLog.create({
      data: {
        action: 'CREATE',
        entity: 'SupportGroup',
        entityId: transactionClaimsGroup.id,
        newValues: {
          code: transactionClaimsGroup.code,
          name: transactionClaimsGroup.name,
          description: transactionClaimsGroup.description,
          techniciansAssigned: allTechnicianIds.length
        }
      }
    });

    console.log('✅ Transaction Claims Support group setup completed');
    
    // Return summary
    return {
      group: transactionClaimsGroup,
      techniciansAssigned: allTechnicianIds.length,
      departments: existingDepartments.map(d => ({ 
        name: d.name, 
        code: d.code,
        technicians: d.users.length 
      }))
    };

  } catch (error) {
    console.error('Error creating Transaction Claims Support group:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });