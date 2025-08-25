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

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: {
      db: {
        url: getDatabaseUrl()
      }
    },
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma