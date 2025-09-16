#!/usr/bin/env node

const nodemailer = require('nodemailer');
require('dotenv').config();

async function testEmail() {
  console.log('Testing email to your banksulutgo address...\n');

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

  try {
    // Verify connection
    await transporter.verify();
    console.log('✅ SMTP connection verified\n');

    // Send to banksulutgo email
    const testEmail = 'razaan.botutihe@banksulutgo.co.id';

    console.log('Sending test email to:', testEmail);

    const result = await transporter.sendMail({
      from: process.env.EMAIL_FROM || process.env.EMAIL_SERVER_USER,
      to: testEmail,
      subject: 'Test: Password Reset - Bank SulutGo ServiceDesk',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Password Reset Test</h2>
          <p>Hi Razaan,</p>
          <p>This is a test email to verify that password reset emails can be sent to your Bank SulutGo email address.</p>
          <p>If you receive this email, the email system is working correctly.</p>
          <div style="background: #f5f5f5; padding: 20px; margin: 20px 0; border-radius: 5px;">
            <p><strong>Test Details:</strong></p>
            <ul>
              <li>Sent at: ${new Date().toLocaleString()}</li>
              <li>From: ${process.env.EMAIL_FROM || process.env.EMAIL_SERVER_USER}</li>
              <li>To: ${testEmail}</li>
              <li>SMTP Server: ${process.env.EMAIL_SERVER_HOST}</li>
            </ul>
          </div>
          <p>This is a test message from Bank SulutGo ServiceDesk.</p>
        </div>
      `,
      text: 'This is a test email for password reset functionality.'
    });

    console.log('✅ Email sent successfully!');
    console.log('   Message ID:', result.messageId);
    console.log('   Response:', result.response);
    console.log('\n📧 Please check your email at:', testEmail);

  } catch (error) {
    console.error('❌ Failed to send email:', error.message);
    console.error('\nError details:', error);
  }
}

testEmail();