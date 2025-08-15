const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function cleanupDatabase() {
  console.log('🧹 Cleaning up existing database data...');
  
  try {
    // Delete in reverse order to respect foreign key constraints
    console.log('🗑️  Deleting tickets and related data...');
    await prisma.ticketTask.deleteMany();
    await prisma.ticketFieldValue.deleteMany();
    await prisma.ticketComment.deleteMany();
    await prisma.ticketApproval.deleteMany();
    await prisma.ticketAttachment.deleteMany();
    await prisma.ticket.deleteMany();
    
    console.log('🗑️  Deleting ATM data...');
    await prisma.aTMIncident.deleteMany();
    await prisma.aTMMonitoringLog.deleteMany();
    await prisma.aTM.deleteMany();
    
    console.log('🗑️  Deleting service data...');
    await prisma.serviceFieldTemplate.deleteMany();
    await prisma.serviceField.deleteMany();
    await prisma.service.deleteMany();
    await prisma.serviceCategory.deleteMany();
    
    console.log('🗑️  Deleting 3-tier category data...');
    await prisma.item.deleteMany();
    await prisma.subcategory.deleteMany();
    await prisma.category.deleteMany();
    
    console.log('🗑️  Deleting field templates...');
    await prisma.fieldTemplate.deleteMany();
    
    console.log('🗑️  Deleting task templates...');
    await prisma.taskTemplateItem.deleteMany();
    await prisma.taskTemplate.deleteMany();
    
    console.log('🗑️  Deleting user sessions and accounts...');
    await prisma.session.deleteMany();
    await prisma.account.deleteMany();
    await prisma.auditLog.deleteMany();
    
    console.log('🗑️  Deleting users...');
    await prisma.user.deleteMany();
    
    console.log('🗑️  Deleting support groups...');
    await prisma.supportGroup.deleteMany();
    
    console.log('🗑️  Deleting branches...');
    await prisma.branch.deleteMany();
    
    console.log('✅ Database cleanup completed successfully!');
    console.log('📊 All tables have been cleared and are ready for fresh data.');
    
  } catch (error) {
    console.error('❌ Error during database cleanup:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

cleanupDatabase()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });