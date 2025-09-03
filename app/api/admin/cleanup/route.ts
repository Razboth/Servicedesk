import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function DELETE(request: NextRequest) {
  try {
    // Check authentication and admin role
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { role: true }
    });

    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Perform cleanup in a transaction
    const result = await prisma.$transaction(async (tx: any) => {
      const deleteCounts: Record<string, number> = {};

      // Delete in order to respect foreign key constraints
      // Start with dependent records first

      // 1. Delete ticket-related dependent records
      deleteCounts.ticketTasks = await tx.ticketTask.deleteMany({}).then((r: any) => r.count);
      deleteCounts.ticketFieldValues = await tx.ticketFieldValue.deleteMany({}).then((r: any) => r.count);
      deleteCounts.commentAttachments = await tx.commentAttachment.deleteMany({}).then((r: any) => r.count);
      deleteCounts.ticketComments = await tx.ticketComment.deleteMany({}).then((r: any) => r.count);
      deleteCounts.ticketAttachments = await tx.ticketAttachment.deleteMany({}).then((r: any) => r.count);
      deleteCounts.ticketApprovals = await tx.ticketApproval.deleteMany({}).then((r: any) => r.count);
      deleteCounts.slaTracking = await tx.sLATracking.deleteMany({}).then((r: any) => r.count);
      deleteCounts.vendorTickets = await tx.vendorTicket.deleteMany({}).then((r: any) => r.count);
      deleteCounts.auditLogs = await tx.auditLog.deleteMany({}).then((r: any) => r.count);

      // 2. Delete tickets
      deleteCounts.tickets = await tx.ticket.deleteMany({}).then((r: any) => r.count);

      // 3. Delete service-related records
      deleteCounts.serviceFields = await tx.serviceField.deleteMany({}).then((r: any) => r.count);
      deleteCounts.taskTemplateItems = await tx.taskTemplateItem.deleteMany({}).then((r: any) => r.count);
      deleteCounts.taskTemplates = await tx.taskTemplate.deleteMany({}).then((r: any) => r.count);
      deleteCounts.slaTemplates = await tx.sLATemplate.deleteMany({}).then((r: any) => r.count);
      deleteCounts.services = await tx.service.deleteMany({}).then((r: any) => r.count);

      // 4. Delete category hierarchy (bottom-up)
      deleteCounts.items = await tx.item.deleteMany({}).then((r: any) => r.count);
      deleteCounts.subcategories = await tx.subcategory.deleteMany({}).then((r: any) => r.count);
      deleteCounts.categories = await tx.category.deleteMany({}).then((r: any) => r.count);
      deleteCounts.serviceCategories = await tx.serviceCategory.deleteMany({}).then((r: any) => r.count);

      // 5. Delete ATM-related records
      deleteCounts.atmMonitoringLogs = await tx.aTMMonitoringLog.deleteMany({}).then((r: any) => r.count);
      deleteCounts.atmIncidents = await tx.aTMIncident.deleteMany({}).then((r: any) => r.count);
      deleteCounts.atms = await tx.aTM.deleteMany({}).then((r: any) => r.count);

      // 6. Delete vendor records
      deleteCounts.vendors = await tx.vendor.deleteMany({}).then((r: any) => r.count);

      // 7. Delete knowledge base
      deleteCounts.knowledgeArticles = await tx.knowledgeArticle.deleteMany({}).then((r: any) => r.count);

      // 8. Delete branches (but keep users)
      deleteCounts.branches = await tx.branch.deleteMany({}).then((r: any) => r.count);

      return deleteCounts;
    });

    // Calculate total deleted records
    const totalDeleted = Object.values(result).reduce((sum, count) => (sum as any) + (count as number), 0);

    return NextResponse.json({
      success: true,
      message: `Successfully deleted ${totalDeleted} records from the database`,
      details: result,
      totalDeleted
    });

  } catch (error) {
    console.error('Database cleanup error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to cleanup database', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      }, 
      { status: 500 }
    );
  }
}