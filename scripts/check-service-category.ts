import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkServiceCategory() {
  try {
    const service = await prisma.service.findUnique({
      where: { id: 'cmew33vqa00ou28nsi10oslpx' }, // BSG QRIS - Klaim Gagal Transaksi
      include: {
        category: true,           // OLD ServiceCategory relationship
        tier1Category: true,      // NEW 3-tier system
        tier2Subcategory: true,
        tier3Item: true
      }
    });

    if (!service) {
      console.log('❌ Service not found');
      return;
    }

    console.log('\n📋 Service Details:');
    console.log('=====================================');
    console.log('Service Name:', service.name);
    console.log('Service ID:', service.id);
    console.log('\nOLD System (ServiceCategory):');
    console.log('  categoryId:', service.categoryId);
    console.log('  category name:', service.category?.name || 'N/A');
    console.log('\nNEW 3-Tier System:');
    console.log('  tier1CategoryId:', service.tier1CategoryId);
    console.log('  tier1 name:', service.tier1Category?.name || 'N/A');
    console.log('  tier2 name:', service.tier2Subcategory?.name || 'N/A');
    console.log('  tier3 name:', service.tier3Item?.name || 'N/A');
    console.log('=====================================\n');

    // Now check what the "Transaction Claims" category ID is
    const transactionClaimsCategory = await prisma.category.findFirst({
      where: {
        name: {
          contains: 'Transaction Claim',
          mode: 'insensitive'
        }
      }
    });

    if (transactionClaimsCategory) {
      console.log('📊 Transaction Claims Category:');
      console.log('  ID:', transactionClaimsCategory.id);
      console.log('  Name:', transactionClaimsCategory.name);
      console.log('\n🔍 Does service.categoryId match Transaction Claims?',
        service.categoryId === transactionClaimsCategory.id ? '✅ YES' : '❌ NO');
      console.log('🔍 Does service.tier1CategoryId match Transaction Claims?',
        service.tier1CategoryId === transactionClaimsCategory.id ? '✅ YES' : '❌ NO');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkServiceCategory();
