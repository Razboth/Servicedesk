import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Category mapping based on service name patterns
const categoryMappings = {
  'ATM Services': ['cmekrqi3t001ghlusklheksqz', [
    'ATM -', 'XMonitoring ATM', 'Xmonitoring ATM', 'Laporan Penerimaan Kartu ATM',
    'Laporan Penerimaan PIN ATM', 'Laporan Persediaan Kartu ATM',
    'Permintaan Penyelesaian Selisih ATM'
  ]],
  'Digital Banking': ['cmf57en25000928z8gqxqf2py', [
    'BSG QRIS', 'BSGTouch', 'BSG Direct', 'BSG Portal', 'BSG Qris',
    'Digital Dashboard', 'SMS Banking'
  ]],
  'Core Banking': ['cmf57en2w000i28z8og7hsbtg', [
    'OLIBs', 'Kasda', 'Payroll', 'TellerApp', 'Surrounding'
  ]],
  'Network Services': ['cmekrqi47001shlusmzk55u7l', [
    'Gangguan Internet', 'Gangguan LAN', 'Gangguan WAN', 'Gangguan Ekstranet',
    'Permintaan Pemasangan Jaringan'
  ]],
  'Hardware & Software': ['cmekrqi41001mhlusnuzfcu5i', [
    'Maintenance Komputer', 'Maintenance Printer', 'Pendaftaran Terminal Komputer',
    'Pendaftaran Terminal Baru', 'Formulir Serah Terima Komputer'
  ]],
  'Information Security': ['cmekrqi43001ohlusr8dobsl4', [
    'Keamanan Informasi', 'Permintaan Akses Flasdisk',
    'ELOS - Pendaftaran Akses VPN'
  ]],
  'User Management': ['cmekrqi4b001whlusahnzsjl1', [
    'Reset Password', 'Buka Blokir', 'Pendaftaran User', 'Mutasi User',
    'Non Aktif User', 'Perubahan User', 'Override Password'
  ]],
  'Transaction Claims': ['cmekrqi45001qhluspcsta20x', [
    'Klaim', 'Gagal Transfer', 'Transfer Bank Lain > 75', 'Penarikan ATM Bank Lain > 75'
  ]],
  'Application Errors': ['cmekrqi3z001khlusprseu9ro', [
    'Error -', 'Error Transaksi', 'Error Approval', 'Error Aplikasi',
    'Error Giro'
  ]],
  'Access Management': ['cmf57en3z000x28z8c04itv5p', [
    'MS Office -', 'SIKP -', 'SKNBI -'
  ]],
  'Service Requests': ['cmekrqi49001uhlus03cgs3me', [
    'Permintaan', 'Memo ke Divisi', 'Surat ke Divisi', 'Upload Data'
  ]],
  'Card Services': ['cmekrqi3x001ihlusp1sv2703', [
    'XCard', 'Xcard'
  ]],
  'Government Banking': ['cmf57en3a000n28z8yu2aqnc0', [
    'MPN -'
  ]]
};

async function fixGeneralServices() {
  try {
    console.log('Starting General Services categorization cleanup...\n');

    // Find the General Services category
    const generalServicesCategory = await prisma.category.findFirst({
      where: {
        name: {
          contains: 'General',
          mode: 'insensitive'
        }
      }
    });

    if (!generalServicesCategory) {
      console.log('No General Services category found');
      return;
    }

    // Get all services with General Services category
    const services = await prisma.service.findMany({
      where: {
        tier1CategoryId: generalServicesCategory.id
      },
      select: {
        id: true,
        name: true
      }
    });

    console.log(`Found ${services.length} services to recategorize\n`);

    let categorized = 0;
    let uncategorized: string[] = [];

    // Process each service
    for (const service of services) {
      let matched = false;

      // Try to match service name with category patterns
      for (const [categoryName, [categoryId, patterns]] of Object.entries(categoryMappings)) {
        for (const pattern of patterns as string[]) {
          if (service.name.includes(pattern)) {
            await prisma.service.update({
              where: { id: service.id },
              data: { tier1CategoryId: categoryId as string }
            });

            console.log(`✓ ${service.name}`);
            console.log(`  → ${categoryName}\n`);

            categorized++;
            matched = true;
            break;
          }
        }
        if (matched) break;
      }

      if (!matched) {
        uncategorized.push(service.name);
      }
    }

    console.log('\n=== Summary ===');
    console.log(`Total services: ${services.length}`);
    console.log(`Categorized: ${categorized}`);
    console.log(`Uncategorized: ${uncategorized.length}\n`);

    if (uncategorized.length > 0) {
      console.log('Services still needing categorization:');
      uncategorized.forEach((name, index) => {
        console.log(`  ${index + 1}. ${name}`);
      });
    }

    console.log('\n✅ Categorization cleanup completed!');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixGeneralServices();
