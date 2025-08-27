import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function updateApiKeyPermissions() {
  try {
    // Find the ATM Claim API key
    const apiKey = await prisma.apiKey.findFirst({
      where: {
        name: 'ATM Claim API Key'
      }
    })
    
    if (!apiKey) {
      console.error('API Key not found')
      process.exit(1)
    }
    
    // Update permissions to include tickets:read
    const updatedApiKey = await prisma.apiKey.update({
      where: { id: apiKey.id },
      data: {
        permissions: [
          'tickets:create:atm-claim',
          'tickets:create',
          'tickets:read',  // Add read permission
          'atm:read'
        ]
      }
    })
    
    console.log('✅ API Key permissions updated successfully!')
    console.log('Current permissions:', updatedApiKey.permissions)
    
  } catch (error) {
    console.error('Error updating API key permissions:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Run if called directly
if (require.main === module) {
  updateApiKeyPermissions()
}

export { updateApiKeyPermissions }