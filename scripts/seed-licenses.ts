import prisma from '../lib/prisma';

async function seedLicenses() {
  console.log('🌱 Seeding OS and Office Licenses...\n');

  try {
    // Get a sample admin user and branches for assignment
    const adminUser = await prisma.user.findFirst({
      where: { role: 'ADMIN' }
    });

    if (!adminUser) {
      throw new Error('No admin user found. Please run user seed first.');
    }

    const branches = await prisma.branch.findMany({
      take: 5
    });

    if (branches.length === 0) {
      throw new Error('No branches found. Please run branch seed first.');
    }

    // Get some PC Assets if they exist
    const pcAssets = await prisma.pCAsset.findMany({
      take: 3
    });

    // Seed OS Licenses
    console.log('📀 Creating OS Licenses...');
    
    const osLicenses = [
      {
        name: 'Windows 11 Pro - Enterprise License',
        osName: 'Windows 11 Pro',
        osVersion: '23H2',
        licenseType: 'VOLUME' as const,
        licenseKey: 'XXXXX-XXXXX-XXXXX-XXXXX-XXXXX',
        purchaseDate: new Date('2024-01-15'),
        expiryDate: new Date('2027-01-15'),
        cost: 25000000, // 25 juta
        vendor: 'Microsoft Indonesia',
        invoiceNumber: 'INV-MS-2024-001',
        maxActivations: 100,
        currentActivations: 45,
        assignedToBranch: branches[0].id,
        createdBy: adminUser.id,
        notes: 'Enterprise volume license for headquarters'
      },
      {
        name: 'Windows 11 Pro - Branch License Pack',
        osName: 'Windows 11 Pro',
        osVersion: '22H2',
        licenseType: 'VOLUME' as const,
        licenseKey: 'YYYYY-YYYYY-YYYYY-YYYYY-YYYYY',
        purchaseDate: new Date('2023-06-01'),
        expiryDate: new Date('2026-06-01'),
        cost: 15000000,
        vendor: 'Microsoft Indonesia',
        invoiceNumber: 'INV-MS-2023-045',
        maxActivations: 50,
        currentActivations: 32,
        assignedToBranch: branches[1]?.id || branches[0].id,
        createdBy: adminUser.id,
        notes: 'Volume license for branch offices'
      },
      {
        name: 'Windows 10 Pro - Legacy Systems',
        osName: 'Windows 10 Pro',
        osVersion: '22H2',
        licenseType: 'OEM' as const,
        licenseKey: 'ZZZZZ-ZZZZZ-ZZZZZ-ZZZZZ-ZZZZZ',
        purchaseDate: new Date('2022-03-10'),
        cost: 2500000,
        vendor: 'Dell Indonesia',
        invoiceNumber: 'INV-DELL-2022-089',
        maxActivations: 1,
        currentActivations: 1,
        assignedToPC: pcAssets[0]?.id || null,
        createdBy: adminUser.id,
        notes: 'OEM license for Dell OptiPlex'
      },
      {
        name: 'Windows Server 2022 Datacenter',
        osName: 'Windows Server 2022',
        osVersion: 'Datacenter',
        licenseType: 'VOLUME' as const,
        licenseKey: 'SRVDC-XXXXX-XXXXX-XXXXX-XXXXX',
        purchaseDate: new Date('2023-09-01'),
        expiryDate: new Date('2026-09-01'),
        cost: 45000000,
        vendor: 'Microsoft Indonesia',
        invoiceNumber: 'INV-MS-2023-SRV-001',
        maxActivations: 16,
        currentActivations: 8,
        assignedToBranch: branches[0].id,
        createdBy: adminUser.id,
        notes: 'Datacenter license for virtualization'
      },
      {
        name: 'Ubuntu Linux - Open Source',
        osName: 'Ubuntu Linux',
        osVersion: '22.04 LTS',
        licenseType: 'OPEN_SOURCE' as const,
        purchaseDate: new Date('2023-01-01'),
        cost: 0,
        vendor: 'Canonical',
        maxActivations: 999,
        currentActivations: 15,
        assignedToBranch: branches[0].id,
        createdBy: adminUser.id,
        notes: 'Open source license for development servers'
      }
    ];

    for (const osLicense of osLicenses) {
      const existing = await prisma.oSLicense.findFirst({
        where: { 
          name: osLicense.name,
          licenseKey: osLicense.licenseKey 
        }
      });

      if (!existing) {
        await prisma.oSLicense.create({
          data: osLicense
        });
        console.log(`   ✅ Created OS License: ${osLicense.name}`);
      } else {
        console.log(`   ⏭️  OS License already exists: ${osLicense.name}`);
      }
    }

    // Seed Office Licenses
    console.log('\n📊 Creating Office Licenses...');
    
    const officeLicenses = [
      {
        name: 'Microsoft 365 Business Premium - Annual',
        productName: 'Microsoft 365 Business Premium',
        productType: 'OFFICE_365' as const,
        licenseType: 'SUBSCRIPTION' as const,
        licenseKey: 'M365-BPREM-XXXXX-XXXXX',
        subscriptionId: 'SUB-M365-2024-001',
        purchaseDate: new Date('2024-01-01'),
        expiryDate: new Date('2025-01-01'),
        renewalDate: new Date('2024-12-15'),
        cost: 50000000, // 50 juta per tahun
        costPeriod: 'YEARLY' as const,
        vendor: 'Microsoft Indonesia',
        invoiceNumber: 'INV-M365-2024-001',
        maxUsers: 100,
        currentUsers: 85,
        autoRenew: true,
        assignedToBranch: branches[0].id,
        createdBy: adminUser.id,
        notes: 'Annual subscription for all headquarters staff'
      },
      {
        name: 'Microsoft 365 Apps for Business',
        productName: 'Microsoft 365 Apps',
        productType: 'OFFICE_365' as const,
        licenseType: 'SUBSCRIPTION' as const,
        licenseKey: 'M365-APPS-XXXXX-XXXXX',
        subscriptionId: 'SUB-M365-2024-002',
        purchaseDate: new Date('2024-03-01'),
        expiryDate: new Date('2025-03-01'),
        renewalDate: new Date('2025-02-15'),
        cost: 3000000, // 3 juta per bulan
        costPeriod: 'MONTHLY' as const,
        vendor: 'Microsoft Indonesia',
        invoiceNumber: 'INV-M365-2024-045',
        maxUsers: 50,
        currentUsers: 42,
        autoRenew: true,
        assignedToBranch: branches[1]?.id || branches[0].id,
        createdBy: adminUser.id,
        notes: 'Monthly subscription for branch offices'
      },
      {
        name: 'Office 2021 Professional Plus',
        productName: 'Office Professional Plus 2021',
        productType: 'OFFICE_2021_LTSC' as const,
        licenseType: 'FPP' as const,
        licenseKey: 'OFF21-PROPLUS-XXXXX-XXXXX',
        purchaseDate: new Date('2023-06-15'),
        cost: 7500000,
        costPeriod: 'ONE_TIME' as const,
        vendor: 'Microsoft Indonesia',
        invoiceNumber: 'INV-OFF-2023-089',
        maxUsers: 1,
        currentUsers: 1,
        autoRenew: false,
        assignedToPC: pcAssets[1]?.id || null,
        createdBy: adminUser.id,
        notes: 'Perpetual license for specific workstation'
      },
      {
        name: 'Office 2019 Standard - Volume',
        productName: 'Office Standard 2019',
        productType: 'OFFICE_2019' as const,
        licenseType: 'VOLUME' as const,
        licenseKey: 'OFF19-STD-XXXXX-XXXXX',
        purchaseDate: new Date('2022-01-10'),
        cost: 25000000,
        costPeriod: 'ONE_TIME' as const,
        vendor: 'Microsoft Indonesia',
        invoiceNumber: 'INV-OFF-2022-012',
        maxUsers: 25,
        currentUsers: 20,
        autoRenew: false,
        assignedToBranch: branches[2]?.id || branches[0].id,
        createdBy: adminUser.id,
        notes: 'Volume license for legacy systems'
      },
      {
        name: 'LibreOffice - Open Source',
        productName: 'LibreOffice',
        productType: 'LIBRE_OFFICE' as const,
        licenseType: 'OPEN_SOURCE' as const,
        purchaseDate: new Date('2023-01-01'),
        cost: 0,
        costPeriod: 'ONE_TIME' as const,
        vendor: 'The Document Foundation',
        maxUsers: 999,
        currentUsers: 25,
        autoRenew: false,
        assignedToBranch: branches[0].id,
        createdBy: adminUser.id,
        notes: 'Open source office suite for development team'
      },
      {
        name: 'Microsoft 365 E3 - Enterprise',
        productName: 'Microsoft 365 E3',
        productType: 'OFFICE_365' as const,
        licenseType: 'SUBSCRIPTION' as const,
        licenseKey: 'M365-E3-XXXXX-XXXXX',
        subscriptionId: 'SUB-E3-2024-001',
        purchaseDate: new Date('2024-02-01'),
        expiryDate: new Date('2025-02-01'),
        renewalDate: new Date('2025-01-15'),
        cost: 75000000,
        costPeriod: 'YEARLY' as const,
        vendor: 'Microsoft Indonesia',
        invoiceNumber: 'INV-E3-2024-001',
        maxUsers: 200,
        currentUsers: 150,
        autoRenew: true,
        assignedToBranch: branches[0].id,
        createdBy: adminUser.id,
        notes: 'Enterprise E3 license with advanced security features'
      }
    ];

    for (const officeLicense of officeLicenses) {
      const existing = await prisma.officeLicense.findFirst({
        where: { 
          name: officeLicense.name,
          licenseKey: officeLicense.licenseKey 
        }
      });

      if (!existing) {
        await prisma.officeLicense.create({
          data: officeLicense
        });
        console.log(`   ✅ Created Office License: ${officeLicense.name}`);
      } else {
        console.log(`   ⏭️  Office License already exists: ${officeLicense.name}`);
      }
    }

    // Create some additional licenses if we have more branches
    if (branches.length > 3) {
      console.log('\n🔄 Creating additional licenses for other branches...');
      
      for (let i = 3; i < branches.length && i < 5; i++) {
        const branch = branches[i];
        
        // Create an OS license for this branch
        const branchOSLicense = {
          name: `Windows 11 Pro - ${branch.name}`,
          osName: 'Windows 11 Pro',
          osVersion: '23H2',
          licenseType: 'VOLUME' as const,
          licenseKey: `BR${i}-XXXXX-XXXXX-XXXXX-XXXXX`,
          purchaseDate: new Date('2024-01-01'),
          expiryDate: new Date('2027-01-01'),
          cost: 10000000,
          vendor: 'Microsoft Indonesia',
          invoiceNumber: `INV-BR-2024-${i}`,
          maxActivations: 25,
          currentActivations: Math.floor(Math.random() * 20) + 5,
          assignedToBranch: branch.id,
          createdBy: adminUser.id,
          notes: `Volume license for ${branch.name}`
        };

        const existingBranchOS = await prisma.oSLicense.findFirst({
          where: { name: branchOSLicense.name }
        });

        if (!existingBranchOS) {
          await prisma.oSLicense.create({
            data: branchOSLicense
          });
          console.log(`   ✅ Created Branch OS License: ${branchOSLicense.name}`);
        }

        // Create an Office license for this branch
        const branchOfficeLicense = {
          name: `Microsoft 365 Apps - ${branch.name}`,
          productName: 'Microsoft 365 Apps',
          productType: 'OFFICE_365' as const,
          licenseType: 'SUBSCRIPTION' as const,
          licenseKey: `BR${i}-M365-XXXXX-XXXXX`,
          subscriptionId: `SUB-BR-2024-${i}`,
          purchaseDate: new Date('2024-01-01'),
          expiryDate: new Date('2025-01-01'),
          renewalDate: new Date('2024-12-15'),
          cost: 2000000,
          costPeriod: 'MONTHLY' as const,
          vendor: 'Microsoft Indonesia',
          invoiceNumber: `INV-M365-BR-2024-${i}`,
          maxUsers: 25,
          currentUsers: Math.floor(Math.random() * 20) + 5,
          autoRenew: true,
          assignedToBranch: branch.id,
          createdBy: adminUser.id,
          notes: `Subscription for ${branch.name}`
        };

        const existingBranchOffice = await prisma.officeLicense.findFirst({
          where: { name: branchOfficeLicense.name }
        });

        if (!existingBranchOffice) {
          await prisma.officeLicense.create({
            data: branchOfficeLicense
          });
          console.log(`   ✅ Created Branch Office License: ${branchOfficeLicense.name}`);
        }
      }
    }

    // Get final counts
    const osCount = await prisma.oSLicense.count();
    const officeCount = await prisma.officeLicense.count();

    console.log('\n📊 License Seeding Summary:');
    console.log(`   • Total OS Licenses: ${osCount}`);
    console.log(`   • Total Office Licenses: ${officeCount}`);
    console.log('\n✅ License seeding completed successfully!');

  } catch (error) {
    console.error('\n❌ Error seeding licenses:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seed
seedLicenses()
  .then(() => {
    console.log('\n🎉 License seed completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 License seed failed:', error);
    process.exit(1);
  });