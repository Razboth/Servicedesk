const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function addUsernames() {
  try {
    // Get all users without usernames
    const users = await prisma.user.findMany({
      where: {
        username: null
      }
    })

    console.log(`Found ${users.length} users without usernames`)

    // Update each user with a username based on their email
    for (const user of users) {
      const username = user.email.split('@')[0] // Use part before @ as username
      
      try {
        await prisma.user.update({
          where: { id: user.id },
          data: { username: username }
        })
        console.log(`Updated user ${user.email} with username: ${username}`)
      } catch (error) {
        // If username already exists, add a number
        let counter = 1
        let uniqueUsername = `${username}${counter}`
        
        while (true) {
          try {
            await prisma.user.update({
              where: { id: user.id },
              data: { username: uniqueUsername }
            })
            console.log(`Updated user ${user.email} with username: ${uniqueUsername}`)
            break
          } catch (error) {
            counter++
            uniqueUsername = `${username}${counter}`
            if (counter > 100) { // Safety break
              console.error(`Failed to find unique username for ${user.email}`)
              break
            }
          }
        }
      }
    }

    console.log('Username assignment completed!')
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

addUsernames()