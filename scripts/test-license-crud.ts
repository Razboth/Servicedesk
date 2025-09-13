import prisma from '../lib/prisma';

async function testLicenseCRUD() {
  console.log('🔍 Testing License CRUD Operations...\n');

  try {
    // Test 1: Check if tables exist
    console.log('1️⃣ Checking if tables exist...');
    const osLicenseCount = await prisma.oSLicense.count();
    const officeLicenseCount = await prisma.officeLicense.count();
    const pcAssetCount = await prisma.pCAsset.count();
    
    console.log(`   ✅ OS Licenses table exists (${osLicenseCount} records)`);
    console.log(`   ✅ Office Licenses table exists (${officeLicenseCount} records)`);
    console.log(`   ✅ PC Assets table exists (${pcAssetCount} records)`);

    // Test 2: Create test data
    console.log('\n2️⃣ Testing CREATE operations...');
    
    // Get a test user and branch
    const testUser = await prisma.user.findFirst({
      where: { role: 'ADMIN' }
    });
    
    const testBranch = await prisma.branch.findFirst();
    
    if (!testUser || !testBranch) {
      throw new Error('Test user or branch not found');
    }

    // Create a test PC Asset
    const testPCAsset = await prisma.pCAsset.create({
      data: {
        pcName: `TEST-PC-${Date.now()}`,
        brand: 'Dell',
        model: 'OptiPlex 7090',
        processor: 'Intel Core i7-11700',
        ram: '16GB DDR4',
        storageDevices: [
          { type: 'SSD', size: '512GB', brand: 'Samsung' }
        ],
        branchId: testBranch.id,
        createdById: testUser.id,
        osName: 'Windows 11 Pro',
        osLicenseType: 'OEM',
        officeProductType: 'OFFICE_365', // Using correct enum value
        officeLicenseType: 'SUBSCRIPTION'
      }
    });
    console.log(`   ✅ Created PC Asset: ${testPCAsset.pcName}`);

    // Create a test OS License
    const testOSLicense = await prisma.oSLicense.create({
      data: {
        name: `Windows 11 Pro - TEST-${Date.now()}`,
        osName: 'Windows 11 Pro',
        osVersion: '23H2',
        licenseType: 'FPP',  // Fixed enum value
        licenseKey: `TEST-KEY-${Date.now()}`,
        maxActivations: 1,
        currentActivations: 0,
        assignedToPC: testPCAsset.id,
        createdBy: testUser.id
      }
    });
    console.log(`   ✅ Created OS License: ${testOSLicense.name}`);

    // Create a test Office License
    const testOfficeLicense = await prisma.officeLicense.create({
      data: {
        name: `Office 365 - TEST-${Date.now()}`,
        productName: 'Microsoft 365 Business Standard',
        productType: 'OFFICE_365',
        licenseType: 'SUBSCRIPTION',
        licenseKey: `TEST-OFFICE-KEY-${Date.now()}`,
        maxUsers: 5,
        currentUsers: 1,
        assignedToPC: testPCAsset.id,
        createdBy: testUser.id
      }
    });
    console.log(`   ✅ Created Office License: ${testOfficeLicense.name}`);

    // Test 3: Read operations
    console.log('\n3️⃣ Testing READ operations...');
    
    const pcWithLicenses = await prisma.pCAsset.findUnique({
      where: { id: testPCAsset.id },
      include: {
        osLicenses: true,
        officeLicenses: true
      }
    });
    
    console.log(`   ✅ PC Asset has ${pcWithLicenses?.osLicenses.length} OS licenses`);
    console.log(`   ✅ PC Asset has ${pcWithLicenses?.officeLicenses.length} Office licenses`);

    // Test 4: Update operations
    console.log('\n4️⃣ Testing UPDATE operations...');
    
    const updatedOSLicense = await prisma.oSLicense.update({
      where: { id: testOSLicense.id },
      data: { currentActivations: 1 }
    });
    console.log(`   ✅ Updated OS License activations: ${updatedOSLicense.currentActivations}`);

    const updatedOfficeLicense = await prisma.officeLicense.update({
      where: { id: testOfficeLicense.id },
      data: { currentUsers: 2 }
    });
    console.log(`   ✅ Updated Office License users: ${updatedOfficeLicense.currentUsers}`);

    // Test 5: Relationship testing
    console.log('\n5️⃣ Testing relationships...');
    
    // Assign licenses to branch instead of PC
    await prisma.oSLicense.update({
      where: { id: testOSLicense.id },
      data: {
        assignedToPC: null,
        assignedToBranch: testBranch.id
      }
    });
    console.log(`   ✅ Reassigned OS License to branch: ${testBranch.name}`);

    // Test 6: Delete operations (cleanup)
    console.log('\n6️⃣ Testing DELETE operations (cleanup)...');
    
    await prisma.officeLicense.delete({
      where: { id: testOfficeLicense.id }
    });
    console.log(`   ✅ Deleted Office License`);

    await prisma.oSLicense.delete({
      where: { id: testOSLicense.id }
    });
    console.log(`   ✅ Deleted OS License`);

    await prisma.pCAsset.delete({
      where: { id: testPCAsset.id }
    });
    console.log(`   ✅ Deleted PC Asset`);

    console.log('\n✅ All CRUD operations completed successfully!');
    console.log('✅ PC Assets, OS Licenses, and Office Licenses are properly connected!');

  } catch (error) {
    console.error('\n❌ Error during testing:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testLicenseCRUD()
  .then(() => {
    console.log('\n🎉 Test completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Test failed:', error);
    process.exit(1);
  });