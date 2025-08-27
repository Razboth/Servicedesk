import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const prisma = new PrismaClient();

async function seedATMClaimTemplates() {
  console.log('🏦 Starting ATM Claim Templates seeding...\n');

  try {
    // 1. Create Field Templates for ATM Claims
    console.log('📝 Creating Field Templates...');

    const fieldTemplates = [
      // ATM Information
      {
        name: 'atm_code',
        label: 'Kode ATM / Terminal ID',
        description: 'Pilih kode ATM tempat transaksi',
        type: 'SELECT' as const,
        isRequired: true,
        category: 'ATM Information',
        helpText: 'Pilih ATM dari daftar dropdown',
        isActive: true
      },
      {
        name: 'atm_location',
        label: 'Lokasi ATM',
        description: 'Lokasi ATM akan terisi otomatis',
        type: 'TEXT' as const,
        isRequired: false,
        category: 'ATM Information',
        helpText: 'Terisi otomatis berdasarkan ATM yang dipilih',
        isActive: true
      },
      
      // Transaction Details
      {
        name: 'transaction_date',
        label: 'Tanggal & Jam Transaksi',
        description: 'Waktu kejadian transaksi',
        type: 'DATETIME' as const,
        isRequired: true,
        category: 'Transaction Details',
        helpText: 'Masukkan tanggal dan jam transaksi sesuai struk/bukti',
        isActive: true
      },
      {
        name: 'transaction_amount',
        label: 'Nominal Transaksi (Rp)',
        description: 'Jumlah uang yang diklaim',
        type: 'NUMBER' as const,
        isRequired: true,
        category: 'Transaction Details',
        validation: {
          min: 50000,
          max: 50000000
        },
        helpText: 'Masukkan nominal tanpa tanda titik atau koma',
        isActive: true
      },
      {
        name: 'transaction_ref',
        label: 'Nomor Referensi/Jurnal',
        description: 'Nomor referensi dari struk ATM',
        type: 'TEXT' as const,
        isRequired: false,
        category: 'Transaction Details',
        placeholder: 'Contoh: 123456789',
        helpText: 'Jika ada, masukkan nomor referensi dari struk',
        isActive: true
      },
      {
        name: 'card_last_4',
        label: 'Kartu ATM (4 digit terakhir)',
        description: '4 digit terakhir nomor kartu ATM',
        type: 'TEXT' as const,
        isRequired: true,
        category: 'Transaction Details',
        placeholder: 'XXXX',
        validation: {
          pattern: '^[0-9]{4}$',
          maxLength: 4
        },
        helpText: 'Masukkan 4 digit terakhir kartu ATM',
        isActive: true
      },
      
      // Customer Information
      {
        name: 'customer_name',
        label: 'Nama Nasabah',
        description: 'Nama lengkap nasabah sesuai KTP',
        type: 'TEXT' as const,
        isRequired: true,
        category: 'Customer Information',
        helpText: 'Nama lengkap sesuai identitas',
        isActive: true
      },
      {
        name: 'customer_account',
        label: 'Nomor Rekening',
        description: 'Nomor rekening nasabah',
        type: 'TEXT' as const,
        isRequired: true,
        category: 'Customer Information',
        placeholder: 'Contoh: 1234567890',
        helpText: 'Nomor rekening yang terkait dengan kartu ATM',
        isActive: true
      },
      {
        name: 'customer_phone',
        label: 'Nomor HP Nasabah',
        description: 'Nomor HP yang bisa dihubungi',
        type: 'PHONE' as const,
        isRequired: true,
        category: 'Customer Information',
        placeholder: '08xxxxxxxxxx',
        helpText: 'Nomor HP aktif untuk update status klaim',
        isActive: true
      },
      {
        name: 'customer_email',
        label: 'Email Nasabah',
        description: 'Email nasabah (opsional)',
        type: 'EMAIL' as const,
        isRequired: false,
        category: 'Customer Information',
        placeholder: 'email@example.com',
        helpText: 'Email untuk notifikasi status klaim',
        isActive: true
      },
      
      // Claim Details
      {
        name: 'claim_type',
        label: 'Jenis Klaim',
        description: 'Pilih jenis permasalahan',
        type: 'SELECT' as const,
        isRequired: true,
        category: 'Claim Details',
        options: [
          { value: 'CARD_CAPTURED', label: 'Kartu Tertelan' },
          { value: 'CASH_NOT_DISPENSED', label: 'Uang Tidak Keluar' },
          { value: 'WRONG_AMOUNT', label: 'Nominal Tidak Sesuai' },
          { value: 'DOUBLE_DEBIT', label: 'Terdebet Ganda' },
          { value: 'TIMEOUT', label: 'Transaksi Timeout' },
          { value: 'OTHER', label: 'Lainnya' }
        ],
        helpText: 'Pilih jenis klaim yang sesuai',
        isActive: true
      },
      {
        name: 'claim_description',
        label: 'Kronologi Kejadian',
        description: 'Jelaskan detail kronologi kejadian',
        type: 'TEXTAREA' as const,
        isRequired: true,
        category: 'Claim Details',
        placeholder: 'Jelaskan kronologi kejadian secara detail...',
        helpText: 'Tuliskan kronologi lengkap untuk membantu investigasi',
        isActive: true
      },
      {
        name: 'evidence_file',
        label: 'Bukti Transaksi/Struk',
        description: 'Upload bukti transaksi atau struk ATM',
        type: 'FILE' as const,
        isRequired: false,
        category: 'Claim Details',
        validation: {
          accept: 'image/*,application/pdf',
          maxSize: '10MB'
        },
        helpText: 'Upload foto struk atau bukti transaksi (JPG/PNG/PDF, max 10MB)',
        isActive: true
      },
      
      // Reporting Information
      {
        name: 'reporting_branch',
        label: 'Cabang Pelapor',
        description: 'Cabang tempat pelaporan klaim',
        type: 'TEXT' as const,
        isRequired: true,
        category: 'Reporting Information',
        helpText: 'Terisi otomatis dengan cabang Anda',
        isActive: true
      },
      {
        name: 'owner_branch',
        label: 'Cabang Pemilik ATM',
        description: 'Cabang yang memiliki ATM',
        type: 'TEXT' as const,
        isRequired: false,
        category: 'Reporting Information',
        helpText: 'Terisi otomatis berdasarkan ATM yang dipilih',
        isActive: true
      },
      {
        name: 'reporting_channel',
        label: 'Channel Pelaporan',
        description: 'Dari mana klaim dilaporkan',
        type: 'SELECT' as const,
        isRequired: true,
        category: 'Reporting Information',
        options: [
          { value: 'BRANCH', label: 'Walk-in Cabang' },
          { value: 'CALL_CENTER', label: 'Call Center' },
          { value: 'EMAIL', label: 'Email' },
          { value: 'MOBILE', label: 'Mobile Banking' }
        ],
        defaultValue: 'BRANCH',
        helpText: 'Pilih channel pelaporan',
        isActive: true
      }
    ];

    // Create field templates
    const createdTemplates = [];
    for (const template of fieldTemplates) {
      const existing = await prisma.fieldTemplate.findUnique({
        where: { name: template.name }
      });

      if (!existing) {
        const created = await prisma.fieldTemplate.create({
          data: template as any
        });
        createdTemplates.push(created);
        console.log(`  ✅ Created field template: ${template.label}`);
      } else {
        console.log(`  ⏭️  Field template already exists: ${template.label}`);
      }
    }

    console.log(`\n✅ Created ${createdTemplates.length} field templates`);

    // 2. Create Service Category for Banking Services (if not exists)
    console.log('\n📁 Creating Service Category...');
    
    let bankingCategory = await prisma.serviceCategory.findFirst({
      where: { name: 'Banking Services' }
    });

    if (!bankingCategory) {
      bankingCategory = await prisma.serviceCategory.create({
        data: {
          name: 'Banking Services',
          description: 'Layanan perbankan termasuk klaim ATM',
          level: 1,
          isActive: true
        }
      });
      console.log('  ✅ Created category: Banking Services');
    } else {
      console.log('  ⏭️  Category already exists: Banking Services');
    }

    // 3. Create Support Group for Branch Operations (if not exists)
    console.log('\n👥 Creating Support Group...');
    
    let supportGroup = await prisma.supportGroup.findUnique({
      where: { code: 'BRANCH_OPS' }
    });

    if (!supportGroup) {
      supportGroup = await prisma.supportGroup.create({
        data: {
          name: 'Branch Operations',
          code: 'BRANCH_OPS',
          description: 'Tim operasional cabang untuk penanganan klaim dan layanan nasabah',
          isActive: true
        }
      });
      console.log('  ✅ Created support group: Branch Operations');
    } else {
      console.log('  ⏭️  Support group already exists: Branch Operations');
    }

    // 4. Create Service Template for ATM Claims
    console.log('\n🎯 Creating Service Template...');
    
    const existingService = await prisma.service.findFirst({
      where: { name: 'Penarikan Tunai Internal - ATM Claim' }
    });

    if (!existingService) {
      const service = await prisma.service.create({
        data: {
          name: 'Penarikan Tunai Internal - ATM Claim',
          description: 'Layanan penanganan klaim terkait transaksi ATM seperti kartu tertelan, uang tidak keluar, atau saldo terpotong',
          helpText: 'Gunakan layanan ini untuk melaporkan masalah transaksi ATM',
          categoryId: bankingCategory.id,
          supportGroupId: supportGroup.id,
          priority: 'HIGH',
          estimatedHours: 4,
          slaHours: 24,
          responseHours: 2,
          resolutionHours: 24,
          escalationHours: 48,
          requiresApproval: true,
          isConfidential: false,
          defaultTitle: 'Klaim ATM - ',
          defaultItilCategory: 'SERVICE_REQUEST',
          businessHoursOnly: false, // 24/7 for ATM claims
          isActive: true
        }
      });

      console.log('  ✅ Created service: Penarikan Tunai Internal - ATM Claim');

      // 5. Link Field Templates to Service
      console.log('\n🔗 Linking field templates to service...');
      
      let order = 0;
      for (const template of createdTemplates) {
        await prisma.serviceFieldTemplate.create({
          data: {
            serviceId: service.id,
            fieldTemplateId: template.id,
            order: order++,
            isRequired: template.isRequired,
            isUserVisible: true
          }
        });
        console.log(`  ✅ Linked: ${template.label}`);
      }
    } else {
      console.log('  ⏭️  Service already exists: Penarikan Tunai Internal - ATM Claim');
    }

    console.log('\n✨ ATM Claim Templates seeding completed successfully!\n');

  } catch (error) {
    console.error('❌ Error seeding ATM Claim templates:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seeding
seedATMClaimTemplates()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });