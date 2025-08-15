const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixUserBranches() {
  try {
    // First, let's check the current state
    console.log('Checking current user and branch data...\n');
    
    // Get all branches
    const branches = await prisma.branch.findMany({
      select: { id: true, name: true, code: true }
    });
    
    console.log('Available branches:');
    branches.forEach(b => console.log(`- ${b.name} (${b.code}) - ID: ${b.id}`));
    
    // Get the specific users
    const users = await prisma.user.findMany({
      where: {
        email: {
          in: ['user@banksulutgo.co.id', 'manager@banksulutgo.co.id']
        }
      },
      include: {
        branch: true
      }
    });
    
    console.log('\nCurrent user status:');
    users.forEach(u => {
      console.log(`\n${u.email}:`);
      console.log(`- Name: ${u.name}`);
      console.log(`- Role: ${u.role}`);
      console.log(`- Branch: ${u.branch ? `${u.branch.name} (${u.branch.code})` : 'NOT ASSIGNED'}`);
      console.log(`- BranchId: ${u.branchId || 'NULL'}`);
    });
    
    // Get the main branch (or create one if needed)
    let mainBranch = branches.find(b => b.code === 'HO' || b.code === 'MAIN');
    
    if (!mainBranch && branches.length > 0) {
      // Use the first available branch
      mainBranch = branches[0];
      console.log(`\nUsing branch: ${mainBranch.name} (${mainBranch.code})`);
    } else if (!mainBranch) {
      // Create a branch if none exists
      console.log('\nNo branches found. Creating Head Office branch...');
      mainBranch = await prisma.branch.create({
        data: {
          code: 'HO',
          name: 'Head Office',
          address: 'Manado',
          city: 'Manado',
          province: 'North Sulawesi'
        }
      });
      console.log(`Created branch: ${mainBranch.name} (${mainBranch.code})`);
    }
    
    // Update users to be in the same branch
    console.log(`\nAssigning both users to branch: ${mainBranch.name}`);
    
    const updateResults = await Promise.all([
      prisma.user.update({
        where: { email: 'user@banksulutgo.co.id' },
        data: { branchId: mainBranch.id }
      }),
      prisma.user.update({
        where: { email: 'manager@banksulutgo.co.id' },
        data: { branchId: mainBranch.id }
      })
    ]);
    
    console.log('\nUsers updated successfully!');
    
    // Verify the updates
    const updatedUsers = await prisma.user.findMany({
      where: {
        email: {
          in: ['user@banksulutgo.co.id', 'manager@banksulutgo.co.id']
        }
      },
      include: {
        branch: true
      }
    });
    
    console.log('\nUpdated user status:');
    updatedUsers.forEach(u => {
      console.log(`\n${u.email}:`);
      console.log(`- Branch: ${u.branch ? `${u.branch.name} (${u.branch.code})` : 'ERROR - Still not assigned'}`);
    });
    
    // Check for any pending approval tickets
    const pendingTickets = await prisma.ticket.findMany({
      where: {
        status: 'PENDING_APPROVAL'
      },
      include: {
        createdBy: {
          select: { email: true, name: true }
        },
        branch: true
      }
    });
    
    console.log(`\n\nPending approval tickets: ${pendingTickets.length}`);
    pendingTickets.forEach(t => {
      console.log(`\nTicket ${t.ticketNumber}:`);
      console.log(`- Created by: ${t.createdBy.name} (${t.createdBy.email})`);
      console.log(`- Branch: ${t.branch ? `${t.branch.name}` : 'NOT SET'}`);
      console.log(`- BranchId: ${t.branchId || 'NULL'}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixUserBranches();