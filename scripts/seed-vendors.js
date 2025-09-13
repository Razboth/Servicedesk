const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedVendors() {
  console.log('🌱 Seeding vendors...');

  const vendors = [
    {
      code: 'VEND001',
      name: 'PT. Telkom Indonesia',
      contactName: 'Budi Santoso',
      contactEmail: 'support@telkom.co.id',
      contactPhone: '021-8090000',
      address: 'Jl. Japati No. 1, Bandung',
      website: 'https://www.telkom.co.id',
      supportHours: '24/7',
      slaResponseTime: 4,
      slaResolutionTime: 24,
      notes: 'Primary network service provider',
      isActive: true
    },
    {
      code: 'VEND002',
      name: 'PT. Indosat Ooredoo',
      contactName: 'Siti Rahayu',
      contactEmail: 'enterprise@indosat.com',
      contactPhone: '021-3000000',
      address: 'Jl. Medan Merdeka Barat No. 21, Jakarta',
      website: 'https://www.indosat.com',
      supportHours: 'Mon-Fri 08:00-17:00',
      slaResponseTime: 8,
      slaResolutionTime: 48,
      notes: 'Secondary network provider for backup lines',
      isActive: true
    },
    {
      code: 'VEND003',
      name: 'PT. NCR Indonesia',
      contactName: 'Ahmad Fauzi',
      contactEmail: 'support@ncr.co.id',
      contactPhone: '021-5795000',
      address: 'Menara Bank Danamon, Jakarta',
      website: 'https://www.ncr.com',
      supportHours: '24/7',
      slaResponseTime: 2,
      slaResolutionTime: 8,
      notes: 'ATM hardware maintenance and support',
      isActive: true
    },
    {
      code: 'VEND004',
      name: 'PT. Diebold Nixdorf',
      contactName: 'Dewi Kusuma',
      contactEmail: 'service@dieboldnixdorf.co.id',
      contactPhone: '021-2965000',
      address: 'Wisma 46 Kota BNI, Jakarta',
      website: 'https://www.dieboldnixdorf.com',
      supportHours: '24/7',
      slaResponseTime: 2,
      slaResolutionTime: 8,
      notes: 'ATM hardware and software solutions',
      isActive: true
    },
    {
      code: 'VEND005',
      name: 'PT. Sigma Cipta Caraka',
      contactName: 'Rudi Hermawan',
      contactEmail: 'helpdesk@sigma.co.id',
      contactPhone: '021-5698000',
      address: 'Telkom Landmark Tower, Jakarta',
      website: 'https://www.sigma.co.id',
      supportHours: 'Mon-Fri 08:00-17:00',
      slaResponseTime: 4,
      slaResolutionTime: 24,
      notes: 'Core banking system support',
      isActive: true
    },
    {
      code: 'VEND006',
      name: 'PT. XL Axiata',
      contactName: 'Rina Wijaya',
      contactEmail: 'enterprise@xl.co.id',
      contactPhone: '021-5795000',
      address: 'XL Axiata Tower, Jakarta',
      website: 'https://www.xl.co.id',
      supportHours: '24/7',
      slaResponseTime: 6,
      slaResolutionTime: 36,
      notes: 'Mobile network and M2M services',
      isActive: true
    },
    {
      code: 'VEND007',
      name: 'PT. Lintasarta',
      contactName: 'Hendra Gunawan',
      contactEmail: 'support@lintasarta.net',
      contactPhone: '021-2301000',
      address: 'Wisma Lintasarta, Jakarta',
      website: 'https://www.lintasarta.net',
      supportHours: '24/7',
      slaResponseTime: 4,
      slaResolutionTime: 24,
      notes: 'Data center and cloud services',
      isActive: true
    },
    {
      code: 'VEND008',
      name: 'PT. Sisindokom Lintasbuana',
      contactName: 'Yanti Susanto',
      contactEmail: 'helpdesk@sisindokom.co.id',
      contactPhone: '021-5150555',
      address: 'Menara Cakrawala, Jakarta',
      website: 'https://www.sisindokom.co.id',
      supportHours: 'Mon-Fri 08:00-17:00',
      slaResponseTime: 8,
      slaResolutionTime: 48,
      notes: 'IT infrastructure and networking',
      isActive: true
    },
    {
      code: 'VEND009',
      name: 'PT. Multipolar Technology',
      contactName: 'Agus Wijaya',
      contactEmail: 'support@multipolar.co.id',
      contactPhone: '021-7506000',
      address: 'Wisma Multipolar, Jakarta',
      website: 'https://www.multipolar.co.id',
      supportHours: 'Mon-Fri 08:00-17:00',
      slaResponseTime: 6,
      slaResolutionTime: 36,
      notes: 'IT solutions and system integration',
      isActive: true
    },
    {
      code: 'VEND010',
      name: 'PT. GRG Banking',
      contactName: 'Lina Hartono',
      contactEmail: 'service@grgbanking.co.id',
      contactPhone: '021-2961000',
      address: 'Menara Imperium, Jakarta',
      website: 'https://www.grgbanking.com',
      supportHours: '24/7',
      slaResponseTime: 3,
      slaResolutionTime: 12,
      notes: 'ATM and cash recycler maintenance',
      isActive: true
    }
  ];

  for (const vendor of vendors) {
    try {
      // Check if vendor already exists
      const existing = await prisma.vendor.findUnique({
        where: { code: vendor.code }
      });

      if (existing) {
        console.log(`✓ Vendor ${vendor.code} - ${vendor.name} already exists`);
      } else {
        await prisma.vendor.create({
          data: vendor
        });
        console.log(`✓ Created vendor ${vendor.code} - ${vendor.name}`);
      }
    } catch (error) {
      console.error(`✗ Error creating vendor ${vendor.code}:`, error.message);
    }
  }

  console.log('✅ Vendor seeding completed');
}

async function main() {
  try {
    await seedVendors();
  } catch (error) {
    console.error('Error in seeding:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();