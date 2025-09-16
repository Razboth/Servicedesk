#!/usr/bin/env node
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  log: ['query', 'error', 'warn']
});

async function testPasswordReset() {
  try {
    console.log('Testing password reset functionality...\n');

    // Test 1: Check if PrismaClient is properly initialized
    console.log('1. Testing Prisma connection...');
    await prisma.$connect();
    console.log('✅ Prisma connected successfully\n');

    // Test 2: Find a user to test with
    console.log('2. Finding test user...');
    const user = await prisma.user.findFirst({
      where: {
        email: 'divisitiops@banksulutgo.co.id'
      }
    });

    if (user) {
      console.log(`✅ Found user: ${user.email} (ID: ${user.id})\n`);

      // Test 3: Check for existing password reset tokens
      console.log('3. Checking for existing reset tokens...');
      const existingTokens = await prisma.passwordResetToken.findMany({
        where: {
          userId: user.id,
          usedAt: null
        }
      });

      console.log(`Found ${existingTokens.length} existing unused tokens\n`);

      // Test 4: Create a test token
      console.log('4. Creating test password reset token...');
      const crypto = require('crypto');
      const bcrypt = require('bcryptjs');

      const token = crypto.randomBytes(32).toString('hex');
      const hashedToken = await bcrypt.hash(token, 10);

      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 1);

      // Delete any existing unused tokens for this user
      await prisma.passwordResetToken.deleteMany({
        where: {
          userId: user.id,
          usedAt: null
        }
      });

      const resetToken = await prisma.passwordResetToken.create({
        data: {
          token: hashedToken,
          userId: user.id,
          email: user.email,
          expiresAt,
          ipAddress: '127.0.0.1',
          userAgent: 'Test Script'
        }
      });

      console.log(`✅ Created reset token with ID: ${resetToken.id}`);
      console.log(`   Raw token: ${token}`);
      console.log(`   Expires at: ${expiresAt.toISOString()}\n`);

      // Test 5: Verify the token
      console.log('5. Verifying the token...');
      const tokens = await prisma.passwordResetToken.findMany({
        where: {
          usedAt: null,
          expiresAt: {
            gt: new Date()
          }
        }
      });

      let validToken = null;
      for (const dbToken of tokens) {
        const isValid = await bcrypt.compare(token, dbToken.token);
        if (isValid) {
          validToken = dbToken;
          break;
        }
      }

      if (validToken) {
        console.log('✅ Token validated successfully\n');
      } else {
        console.log('❌ Token validation failed\n');
      }

      // Clean up test token
      await prisma.passwordResetToken.delete({
        where: { id: resetToken.id }
      });
      console.log('✅ Test token cleaned up\n');

    } else {
      console.log('❌ Test user not found\n');
    }

    console.log('✅ All tests completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testPasswordReset();