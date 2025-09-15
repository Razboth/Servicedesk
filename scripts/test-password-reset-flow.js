#!/usr/bin/env node

async function testPasswordResetFlow() {
  try {
    console.log('Testing password reset flow...\n');

    // Test the API endpoint directly
    const response = await fetch('http://localhost:3000/api/auth/forgot-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'cabang.melonguane@banksulutgo.co.id'
      })
    });

    const result = await response.json();
    console.log('API Response:', result);
    console.log('Status:', response.status);

    if (response.ok) {
      console.log('\n✅ API call successful');
    } else {
      console.log('\n❌ API call failed');
    }

  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Also test the individual components
async function testIndividualComponents() {
  console.log('\n--- Testing Individual Components ---\n');

  try {
    // Test Prisma connection
    console.log('1. Testing Prisma connection...');
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();

    await prisma.$connect();
    console.log('✅ Prisma connected\n');

    // Test finding a user
    console.log('2. Testing user lookup...');
    const user = await prisma.user.findFirst({
      where: {
        email: 'cabang.melonguane@banksulutgo.co.id',
        isActive: true
      }
    });

    if (user) {
      console.log(`✅ User found: ${user.email} (ID: ${user.id})\n`);

      // Test password reset token creation
      console.log('3. Testing token creation logic...');
      const crypto = require('crypto');
      const bcrypt = require('bcryptjs');

      const token = crypto.randomBytes(32).toString('hex');
      const hashedToken = await bcrypt.hash(token, 10);

      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 1);

      // Clean up old tokens
      await prisma.passwordResetToken.deleteMany({
        where: {
          userId: user.id,
          usedAt: null
        }
      });

      // Create new token
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

      console.log(`✅ Token created with ID: ${resetToken.id}\n`);

      // Clean up test token
      await prisma.passwordResetToken.delete({
        where: { id: resetToken.id }
      });
      console.log('✅ Test token cleaned up\n');

    } else {
      console.log('❌ User not found\n');
    }

    await prisma.$disconnect();

  } catch (error) {
    console.error('Component test failed:', error);
  }
}

// Run tests
console.log('='.repeat(50));
testPasswordResetFlow().then(() => {
  console.log('='.repeat(50));
  testIndividualComponents();
});