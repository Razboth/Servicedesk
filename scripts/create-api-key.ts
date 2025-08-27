import { PrismaClient } from '@prisma/client'
import { generateApiKey, hashApiKey } from '../lib/api-key'

const prisma = new PrismaClient()

async function createApiKey() {
  try {
    // Generate a new API key
    const apiKey = generateApiKey()
    const hashedKey = await hashApiKey(apiKey)
    
    // Find a user to associate with the API key
    let user = await prisma.user.findFirst({
      where: {
        email: 'user@banksulutgo.co.id'
      }
    })
    
    // If not found, try to find any admin user
    if (!user) {
      user = await prisma.user.findFirst({
        where: {
          role: 'ADMIN'
        }
      })
    }
    
    // If still not found, find any user
    if (!user) {
      user = await prisma.user.findFirst()
    }
    
    if (!user) {
      console.error('User not found. Please run seed first.')
      process.exit(1)
    }
    
    // Create the API key in database
    const apiKeyRecord = await prisma.apiKey.create({
      data: {
        name: 'ATM Claim API Key',
        key: apiKey,
        hashedKey: hashedKey,
        description: 'API key for creating ATM claim tickets',
        permissions: ['tickets:create:atm-claim', 'tickets:create', 'atm:read'],
        isActive: true,
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
        createdById: user.id
      }
    })
    
    console.log('✅ API Key created successfully!')
    console.log('=====================================')
    console.log('API Key Details:')
    console.log('Name:', apiKeyRecord.name)
    console.log('Key:', apiKey)
    console.log('=====================================')
    console.log('⚠️  IMPORTANT: Save this API key securely. You won\'t be able to see it again!')
    console.log('')
    console.log('Usage in headers:')
    console.log('X-API-Key:', apiKey)
    console.log('OR')
    console.log('Authorization: Bearer', apiKey)
    
    return apiKey
  } catch (error) {
    console.error('Error creating API key:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Run if called directly
if (require.main === module) {
  createApiKey()
}

export { createApiKey }