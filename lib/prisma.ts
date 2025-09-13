import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Get database URL from environment
// Supports both SERVICEDESK_ prefix and regular DATABASE_URL
const getDatabaseUrl = (): string => {
  const url = process.env.SERVICEDESK_DATABASE_URL || process.env.DATABASE_URL
  
  if (!url) {
    throw new Error(
      'Database connection string not found. Please set SERVICEDESK_DATABASE_URL or DATABASE_URL environment variable.'
    )
  }
  
  return url
}

// Create singleton Prisma client with lazy connection
const createPrismaClient = () => {
  const client = new PrismaClient({
    datasources: {
      db: {
        url: getDatabaseUrl()
      }
    },
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })

  // Lazy connect on first query
  const originalConnect = client.$connect.bind(client)
  let connectPromise: Promise<void> | null = null

  client.$connect = async () => {
    if (!connectPromise) {
      connectPromise = (async () => {
        let retries = 3
        while (retries > 0) {
          try {
            await originalConnect()
            console.log('✅ Prisma client connected successfully')
            return
          } catch (error) {
            retries--
            if (retries === 0) {
              console.error('❌ Failed to connect Prisma client after all retries:', error)
              throw error
            }
            console.warn(`⚠️ Prisma connection failed, retrying... (${retries} retries left)`)
            await new Promise(resolve => setTimeout(resolve, 1000))
          }
        }
      })()
    }
    return connectPromise
  }

  return client
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

// Graceful shutdown handling
if (process.env.NODE_ENV === 'production') {
  process.on('beforeExit', async () => {
    await prisma.$disconnect()
  })
}

export default prisma