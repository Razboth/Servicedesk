#!/usr/bin/env node

const nodemailer = require('nodemailer');
require('dotenv').config();

// Test email configuration
const TEST_EMAIL = 'razboth14@gmail.com';

async function testDirectEmailSending() {
  console.log('='.repeat(60));
  console.log('TESTING DIRECT EMAIL SENDING');
  console.log('='.repeat(60));

  try {
    // Create transporter with the same config as the app
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_SERVER_HOST,
      port: parseInt(process.env.EMAIL_SERVER_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.EMAIL_SERVER_USER,
        pass: process.env.EMAIL_SERVER_PASSWORD,
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    console.log('\n1. Testing transporter configuration...');
    console.log('   Host:', process.env.EMAIL_SERVER_HOST);
    console.log('   Port:', process.env.EMAIL_SERVER_PORT);
    console.log('   User:', process.env.EMAIL_SERVER_USER);
    console.log('   From:', process.env.EMAIL_FROM);

    // Verify transporter
    console.log('\n2. Verifying SMTP connection...');
    await transporter.verify();
    console.log('✅ SMTP connection verified successfully');

    // Send test email
    console.log('\n3. Sending test email to:', TEST_EMAIL);

    const testToken = 'test-token-' + Date.now();
    const resetUrl = `https://localhost/auth/reset-password?token=${testToken}`;

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: TEST_EMAIL,
      subject: 'Test: Password Reset Request - Bank SulutGo ServiceDesk',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Password Reset Request (TEST)</h2>

          <p>Hi Test User,</p>

          <p>This is a test email to verify the password reset functionality.</p>

          <div style="background: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <p style="margin: 0 0 15px 0;">Click the button below to reset your password:</p>
            <a href="${resetUrl}" style="display: inline-block; background: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
              Reset Password
            </a>
          </div>

          <p style="color: #666; font-size: 14px;">
            Or copy and paste this link into your browser:<br>
            <span style="color: #007bff; word-break: break-all;">${resetUrl}</span>
          </p>

          <div style="background: #fff3cd; border: 1px solid #ffc107; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p style="margin: 0; color: #856404;">
              <strong>⚠️ This is a test email</strong><br>
              • Token: ${testToken}<br>
              • Sent at: ${new Date().toLocaleString()}<br>
              • This link would expire in 1 hour in production
            </p>
          </div>

          <hr style="margin-top: 30px; border: none; border-top: 1px solid #ddd;">
          <p style="color: #666; font-size: 12px;">
            This is a test message from Bank SulutGo ServiceDesk.
          </p>
        </div>
      `,
      text: `Password Reset Request (TEST)\n\nClick this link to reset your password: ${resetUrl}\n\nThis is a test email.`
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent successfully!');
    console.log('   Message ID:', result.messageId);
    console.log('   Response:', result.response);

  } catch (error) {
    console.error('❌ Failed to send email:', error.message);
    console.error('   Error details:', error);
  }
}

async function testPasswordResetFlow() {
  console.log('\n' + '='.repeat(60));
  console.log('TESTING COMPLETE PASSWORD RESET FLOW');
  console.log('='.repeat(60));

  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();

  try {
    // Step 1: Create or find test user
    console.log('\n1. Setting up test user...');

    let user = await prisma.user.findUnique({
      where: { email: TEST_EMAIL }
    });

    if (!user) {
      // Create test user if doesn't exist
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash('TestPassword123!', 10);

      user = await prisma.user.create({
        data: {
          email: TEST_EMAIL,
          name: 'Test User',
          password: hashedPassword,
          role: 'USER',
          isActive: true,
          branchId: (await prisma.branch.findFirst())?.id || null
        }
      });
      console.log('✅ Created test user:', user.email);
    } else {
      console.log('✅ Found existing test user:', user.email);
    }

    // Step 2: Test API endpoint
    console.log('\n2. Testing forgot-password API endpoint...');

    const response = await fetch('http://localhost:3000/api/auth/forgot-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: TEST_EMAIL
      })
    });

    const result = await response.json();
    console.log('   API Response:', result);
    console.log('   Status:', response.status);

    // Step 3: Check if token was created in database
    console.log('\n3. Checking database for reset token...');

    const tokens = await prisma.passwordResetToken.findMany({
      where: {
        email: TEST_EMAIL,
        usedAt: null,
        expiresAt: {
          gt: new Date()
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 1
    });

    if (tokens.length > 0) {
      console.log('✅ Reset token found in database:');
      console.log('   Token ID:', tokens[0].id);
      console.log('   Created:', tokens[0].createdAt);
      console.log('   Expires:', tokens[0].expiresAt);
      console.log('   User ID:', tokens[0].userId);
    } else {
      console.log('❌ No reset token found in database');
    }

    // Step 4: Test the email service directly
    console.log('\n4. Testing email service module...');

    const { sendPasswordResetEmail } = require('../lib/services/email.service');

    try {
      const testToken = 'direct-test-token-' + Date.now();
      await sendPasswordResetEmail(
        TEST_EMAIL,
        user.name || 'Test User',
        testToken
      );
      console.log('✅ Email service called successfully');
    } catch (emailError) {
      console.error('❌ Email service error:', emailError.message);
      console.error('   Stack:', emailError.stack);
    }

  } catch (error) {
    console.error('❌ Test flow error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

async function testEmailTemplate() {
  console.log('\n' + '='.repeat(60));
  console.log('TESTING EMAIL TEMPLATE GENERATION');
  console.log('='.repeat(60));

  try {
    const { getEmailTemplate } = require('../lib/services/email.service');

    const testToken = 'template-test-token';
    const template = await getEmailTemplate('password_reset_request', {
      userName: 'Test User',
      resetToken: testToken
    });

    console.log('\n✅ Template generated successfully:');
    console.log('   Subject:', template.subject);
    console.log('   HTML length:', template.html.length, 'characters');
    console.log('   Contains reset URL:', template.html.includes('reset-password?token='));

  } catch (error) {
    console.error('❌ Template generation error:', error);
  }
}

// Run all tests
async function runAllTests() {
  console.log('Starting password reset email tests...\n');
  console.log('Target email:', TEST_EMAIL);
  console.log('Environment:', process.env.NODE_ENV || 'development');
  console.log('Time:', new Date().toLocaleString());

  // Test 1: Direct email sending
  await testDirectEmailSending();

  // Test 2: Email template
  await testEmailTemplate();

  // Test 3: Complete flow
  await testPasswordResetFlow();

  console.log('\n' + '='.repeat(60));
  console.log('TESTS COMPLETED');
  console.log('='.repeat(60));
  console.log('\nPlease check your email at:', TEST_EMAIL);
  console.log('If you received the test email, the SMTP configuration is working.');
  console.log('If not, check the error messages above for issues.');
}

// Run tests
runAllTests().catch(console.error);