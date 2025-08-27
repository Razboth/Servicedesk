import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Updating existing users with password change flags...')
  
  try {
    // Update all existing users to not require password change
    // Since this is a new field with default value true, all users currently have mustChangePassword = true
    const result = await prisma.user.updateMany({
      where: {}, // Update all users
      data: {
        mustChangePassword: false,  // Existing users don't need to change password
        isFirstLogin: false,        // Existing users have already logged in
        passwordChangedAt: new Date() // Set to now for existing users
      }
    })
    
    console.log(`Updated ${result.count} existing users`)
    
    // For any users without passwords (shouldn't exist but just in case)
    const usersWithoutPasswords = await prisma.user.findMany({
      where: {
        password: null
      },
      select: {
        id: true,
        username: true,
        email: true
      }
    })
    
    if (usersWithoutPasswords.length > 0) {
      console.log(`Found ${usersWithoutPasswords.length} users without passwords:`)
      for (const user of usersWithoutPasswords) {
        console.log(`  - ${user.username} (${user.email})`)
        // These users would need to have passwords set and mustChangePassword = true
        await prisma.user.update({
          where: { id: user.id },
          data: {
            mustChangePassword: true,
            isFirstLogin: true
          }
        })
      }
    }
    
    console.log('Migration completed successfully!')
  } catch (error) {
    console.error('Error during migration:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })