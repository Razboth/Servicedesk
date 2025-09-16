import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Get database URL from environment
const getDatabaseUrl = (): string => {
  const url = process.env.SERVICEDESK_DATABASE_URL || process.env.DATABASE_URL

  if (!url) {
    throw new Error(
      'Database connection string not found. Please set SERVICEDESK_DATABASE_URL or DATABASE_URL environment variable.'
    )
  }

  return url
}

// Create Prisma client instance
const createPrismaClient = () => {
  try {
    const client = new PrismaClient({
      datasources: {
        db: {
          url: getDatabaseUrl()
        }
      },
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    })

    return client
  } catch (error) {
    console.error('Failed to create Prisma client:', error)
    // Return a basic client without custom config as fallback
    return new PrismaClient()
  }
}

// Initialize Prisma client
let prisma: PrismaClient

if (process.env.NODE_ENV === 'production') {
  prisma = createPrismaClient()
} else {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrismaClient()
  }
  prisma = globalForPrisma.prisma
}

export { prisma }

// Graceful shutdown handling
if (process.env.NODE_ENV === 'production') {
  process.on('beforeExit', async () => {
    await prisma.$disconnect()
  })
}

export default prisma