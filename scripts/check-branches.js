const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkBranches() {
  try {
    const branches = await prisma.branch.findMany({
      where: { isActive: true }
    });
    
    console.log(`Found ${branches.length} active branches:`);
    branches.forEach(branch => {
      console.log(`- ${branch.code}: ${branch.name}`);
    });
    
    if (branches.length === 0) {
      console.log('\nNo branches found. Creating sample branches...');
      
      const sampleBranches = [
        { code: 'HO', name: 'Head Office', city: 'Manado', province: 'North Sulawesi', address: 'Jl. Sam Ratulangi No. 9' },
        { code: 'BR001', name: 'Manado Main Branch', city: 'Manado', province: 'North Sulawesi', address: 'Jl. Pierre Tendean' },
        { code: 'BR002', name: 'Bitung Branch', city: 'Bitung', province: 'North Sulawesi', address: 'Jl. Yos Sudarso' },
        { code: 'BR003', name: 'Tomohon Branch', city: 'Tomohon', province: 'North Sulawesi', address: 'Jl. Raya Tomohon' },
        { code: 'BR004', name: 'Kotamobagu Branch', city: 'Kotamobagu', province: 'North Sulawesi', address: 'Jl. Ahmad Yani' },
        { code: 'BR005', name: 'Minahasa Branch', city: 'Tondano', province: 'North Sulawesi', address: 'Jl. Raya Tondano' }
      ];
      
      for (const branch of sampleBranches) {
        await prisma.branch.create({ data: branch });
      }
      
      console.log('Sample branches created successfully!');
      
      // Check again
      const newBranches = await prisma.branch.findMany();
      console.log(`\nNow have ${newBranches.length} branches in database.`);
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkBranches();