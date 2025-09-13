import prisma from '../lib/prisma';

async function seedOSTypes() {
  console.log('Seeding Operating System types...');
  
  const osTypes = [
    // Windows
    { name: 'Windows 11 Pro', version: '23H2', type: 'WINDOWS', architecture: 'x64', edition: 'Pro', sortOrder: 1 },
    { name: 'Windows 11 Enterprise', version: '23H2', type: 'WINDOWS', architecture: 'x64', edition: 'Enterprise', sortOrder: 2 },
    { name: 'Windows 11 Home', version: '23H2', type: 'WINDOWS', architecture: 'x64', edition: 'Home', sortOrder: 3 },
    { name: 'Windows 10 Pro', version: '22H2', type: 'WINDOWS', architecture: 'x64', edition: 'Pro', sortOrder: 4 },
    { name: 'Windows 10 Enterprise', version: '22H2', type: 'WINDOWS', architecture: 'x64', edition: 'Enterprise', sortOrder: 5 },
    { name: 'Windows 10 Home', version: '22H2', type: 'WINDOWS', architecture: 'x64', edition: 'Home', sortOrder: 6 },
    { name: 'Windows 10 LTSC', version: '2021', type: 'WINDOWS', architecture: 'x64', edition: 'LTSC', sortOrder: 7 },
    { name: 'Windows 8.1 Pro', version: null, type: 'WINDOWS', architecture: 'x64', edition: 'Pro', sortOrder: 8 },
    { name: 'Windows 7 Professional', version: 'SP1', type: 'WINDOWS', architecture: 'x64', edition: 'Professional', sortOrder: 9 },
    { name: 'Windows 7 Enterprise', version: 'SP1', type: 'WINDOWS', architecture: 'x64', edition: 'Enterprise', sortOrder: 10 },
    { name: 'Windows Server 2022', version: null, type: 'WINDOWS', architecture: 'x64', edition: 'Standard', sortOrder: 11 },
    { name: 'Windows Server 2019', version: null, type: 'WINDOWS', architecture: 'x64', edition: 'Standard', sortOrder: 12 },
    
    // Linux
    { name: 'Ubuntu', version: '22.04 LTS', type: 'LINUX', architecture: 'x64', edition: 'Desktop', sortOrder: 20 },
    { name: 'Ubuntu', version: '20.04 LTS', type: 'LINUX', architecture: 'x64', edition: 'Desktop', sortOrder: 21 },
    { name: 'Ubuntu Server', version: '22.04 LTS', type: 'LINUX', architecture: 'x64', edition: 'Server', sortOrder: 22 },
    { name: 'Red Hat Enterprise Linux', version: '9', type: 'LINUX', architecture: 'x64', edition: 'Workstation', sortOrder: 23 },
    { name: 'CentOS', version: '7', type: 'LINUX', architecture: 'x64', edition: null, sortOrder: 24 },
    { name: 'Debian', version: '12', type: 'LINUX', architecture: 'x64', edition: null, sortOrder: 25 },
    { name: 'Fedora', version: '39', type: 'LINUX', architecture: 'x64', edition: 'Workstation', sortOrder: 26 },
    
    // macOS
    { name: 'macOS Sonoma', version: '14', type: 'MACOS', architecture: 'ARM64', edition: null, sortOrder: 30 },
    { name: 'macOS Ventura', version: '13', type: 'MACOS', architecture: 'ARM64', edition: null, sortOrder: 31 },
    { name: 'macOS Monterey', version: '12', type: 'MACOS', architecture: 'x64', edition: null, sortOrder: 32 },
    { name: 'macOS Big Sur', version: '11', type: 'MACOS', architecture: 'x64', edition: null, sortOrder: 33 },
  ];

  for (const os of osTypes) {
    try {
      // Check if already exists
      const existing = await prisma.operatingSystem.findFirst({
        where: {
          name: os.name,
          version: os.version
        }
      });

      if (!existing) {
        await prisma.operatingSystem.create({
          data: {
            ...os,
            isActive: true,
            description: null
          }
        });
        console.log(`✅ Created OS type: ${os.name} ${os.version || ''}`);
      } else {
        console.log(`⏭️  OS type already exists: ${os.name} ${os.version || ''}`);
      }
    } catch (error) {
      console.error(`❌ Failed to create OS type ${os.name}:`, error);
    }
  }
}

async function seedOfficeTypes() {
  console.log('\nSeeding Office Product types...');
  
  const officeTypes = [
    // Microsoft 365
    { name: 'Microsoft 365 Business', version: '365', type: 'MICROSOFT_365', edition: 'Business Premium', sortOrder: 1 },
    { name: 'Microsoft 365 Enterprise', version: '365', type: 'MICROSOFT_365', edition: 'E3', sortOrder: 2 },
    { name: 'Microsoft 365 Enterprise', version: '365', type: 'MICROSOFT_365', edition: 'E5', sortOrder: 3 },
    { name: 'Microsoft 365 Apps', version: '365', type: 'MICROSOFT_365', edition: 'Business', sortOrder: 4 },
    
    // Office LTSC
    { name: 'Office LTSC 2024', version: '2024', type: 'OFFICE_LTSC', edition: 'Professional Plus', sortOrder: 10 },
    { name: 'Office LTSC 2024', version: '2024', type: 'OFFICE_LTSC', edition: 'Standard', sortOrder: 11 },
    { name: 'Office LTSC 2021', version: '2021', type: 'OFFICE_LTSC', edition: 'Professional Plus', sortOrder: 12 },
    { name: 'Office LTSC 2021', version: '2021', type: 'OFFICE_LTSC', edition: 'Standard', sortOrder: 13 },
    { name: 'Office 2019', version: '2019', type: 'OFFICE_LTSC', edition: 'Professional Plus', sortOrder: 14 },
    { name: 'Office 2019', version: '2019', type: 'OFFICE_LTSC', edition: 'Standard', sortOrder: 15 },
    { name: 'Office 2016', version: '2016', type: 'OFFICE_LTSC', edition: 'Professional Plus', sortOrder: 16 },
    { name: 'Office 2013', version: '2013', type: 'OFFICE_LTSC', edition: 'Professional Plus', sortOrder: 17 },
    { name: 'Office 2010', version: '2010', type: 'OFFICE_LTSC', edition: 'Professional Plus', sortOrder: 18 },
    
    // LibreOffice
    { name: 'LibreOffice', version: '7.6', type: 'LIBRE_OFFICE', edition: 'Fresh', sortOrder: 20 },
    { name: 'LibreOffice', version: '7.5', type: 'LIBRE_OFFICE', edition: 'Still', sortOrder: 21 },
    
    // OpenOffice
    { name: 'Apache OpenOffice', version: '4.1.14', type: 'OPEN_OFFICE', edition: null, sortOrder: 25 },
    
    // WPS Office
    { name: 'WPS Office', version: '2023', type: 'WPS_OFFICE', edition: 'Business', sortOrder: 30 },
    { name: 'WPS Office', version: '2023', type: 'WPS_OFFICE', edition: 'Free', sortOrder: 31 },
    
    // Google Workspace
    { name: 'Google Workspace', version: null, type: 'GOOGLE_WORKSPACE', edition: 'Business Standard', sortOrder: 35 },
    { name: 'Google Workspace', version: null, type: 'GOOGLE_WORKSPACE', edition: 'Business Plus', sortOrder: 36 },
    { name: 'Google Workspace', version: null, type: 'GOOGLE_WORKSPACE', edition: 'Enterprise', sortOrder: 37 },
  ];

  for (const office of officeTypes) {
    try {
      // Check if already exists
      const existing = await prisma.officeProduct.findFirst({
        where: {
          name: office.name,
          version: office.version,
          edition: office.edition
        }
      });

      if (!existing) {
        await prisma.officeProduct.create({
          data: {
            ...office,
            isActive: true,
            description: null
          }
        });
        console.log(`✅ Created Office type: ${office.name} ${office.version || ''} ${office.edition || ''}`);
      } else {
        console.log(`⏭️  Office type already exists: ${office.name} ${office.version || ''} ${office.edition || ''}`);
      }
    } catch (error) {
      console.error(`❌ Failed to create Office type ${office.name}:`, error);
    }
  }
}

async function main() {
  console.log('Starting OS and Office types seeding...\n');
  
  try {
    await seedOSTypes();
    await seedOfficeTypes();
    
    // Get statistics
    const osCount = await prisma.operatingSystem.count();
    const officeCount = await prisma.officeProduct.count();
    
    console.log('\n📊 Seeding Summary:');
    console.log(`   - Operating Systems: ${osCount} types`);
    console.log(`   - Office Products: ${officeCount} types`);
    console.log('\n✅ Seeding completed successfully!');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();