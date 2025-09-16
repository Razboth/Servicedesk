#!/usr/bin/env node

const nodemailer = require('nodemailer');
require('dotenv').config();

async function sendPasswordResetEmail(email, name, resetToken) {
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

  const resetUrl = `${process.env.NEXTAUTH_URL}/auth/reset-password?token=${resetToken}`;

  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Password Reset - Bank SulutGo ServiceDesk</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 28px;">Password Reset Request</h1>
      </div>

      <div style="background: #f9f9f9; padding: 30px; border: 1px solid #ddd; border-top: none; border-radius: 0 0 10px 10px;">
        <p style="font-size: 16px; margin-bottom: 20px;">Hello ${name},</p>

        <p style="font-size: 16px; margin-bottom: 20px;">
          We received a request to reset your password for your Bank SulutGo ServiceDesk account.
          If you didn't make this request, you can safely ignore this email.
        </p>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}"
             style="display: inline-block; padding: 14px 30px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white; text-decoration: none; border-radius: 50px; font-size: 16px; font-weight: bold;
                    box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);">
            Reset My Password
          </a>
        </div>

        <p style="font-size: 14px; color: #666; margin-top: 30px;">
          Or copy and paste this link into your browser:
        </p>
        <div style="background: #fff; padding: 15px; border: 1px solid #ddd; border-radius: 5px; word-break: break-all; margin: 10px 0;">
          <code style="font-size: 14px;">${resetUrl}</code>
        </div>

        <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 5px;">
          <p style="margin: 0; color: #856404; font-size: 14px;">
            <strong>⚠️ Important:</strong> This password reset link will expire in 1 hour for security reasons.
          </p>
        </div>

        <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">

        <p style="font-size: 12px; color: #999; text-align: center;">
          Bank SulutGo ServiceDesk<br>
          IT Support Portal<br>
          © ${new Date().getFullYear()} Bank SulutGo. All rights reserved.
        </p>
      </div>
    </body>
    </html>
  `;

  const emailText = `
Password Reset Request
======================

Hello ${name},

We received a request to reset your password for your Bank SulutGo ServiceDesk account.

To reset your password, click the link below:
${resetUrl}

This link will expire in 1 hour.

If you didn't request this password reset, you can safely ignore this email.

Bank SulutGo ServiceDesk
IT Support Portal
`;

  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || process.env.EMAIL_SERVER_USER,
      to: email,
      subject: 'Password Reset - Bank SulutGo ServiceDesk',
      html: emailHtml,
      text: emailText,
    });

    console.log('✅ Password reset email sent successfully');
    console.log('   Message ID:', info.messageId);
    console.log('   To:', email);
    console.log('   Reset URL:', resetUrl);

    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Failed to send password reset email:', error);
    return { success: false, error: error.message };
  }
}

// Get arguments from command line
const args = process.argv.slice(2);
if (args.length < 3) {
  console.log('Usage: node send-password-reset.js <email> <name> <resetToken>');
  process.exit(1);
}

const [email, name, resetToken] = args;

// Send the email
sendPasswordResetEmail(email, name, resetToken).then(result => {
  if (result.success) {
    process.exit(0);
  } else {
    process.exit(1);
  }
});