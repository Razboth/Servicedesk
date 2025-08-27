import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Creating test user that must change password...')
  
  try {
    // Check if test user already exists
    const existingUser = await prisma.user.findUnique({
      where: { username: 'testuser' }
    })
    
    if (existingUser) {
      console.log('Test user already exists, updating to require password change...')
      await prisma.user.update({
        where: { username: 'testuser' },
        data: {
          mustChangePassword: true,
          isFirstLogin: true,
          passwordChangedAt: null
        }
      })
    } else {
      // Create a test user that must change password
      const hashedPassword = await bcrypt.hash('Test123!', 10)
      
      await prisma.user.create({
        data: {
          username: 'testuser',
          email: 'testuser@banksulutgo.co.id',
          name: 'Test User',
          password: hashedPassword,
          role: 'USER',
          mustChangePassword: true,
          isFirstLogin: true,
          passwordChangedAt: null
        }
      })
      console.log('Test user created successfully!')
    }
    
    console.log('\n=== Test User Credentials ===')
    console.log('Username: testuser')
    console.log('Password: Test123!')
    console.log('Note: User will be forced to change password on first login')
    console.log('=============================\n')
    
  } catch (error) {
    console.error('Error creating test user:', error)
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