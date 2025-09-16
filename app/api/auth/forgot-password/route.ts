import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import {
  createPasswordResetToken,
  checkResetRateLimit
} from '@/lib/password-reset';
import { createAuditLog } from '@/lib/audit-logger';
import { getClientIp } from '@/lib/utils/ip-utils';

// Email sending function (inline to avoid module issues)
async function sendResetEmail(email: string, name: string, resetToken: string) {
  const nodemailer = await import('nodemailer');

  const transporter = nodemailer.default.createTransporter({
    host: process.env.EMAIL_SERVER_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_SERVER_PORT || '587'),
    secure: false,
    auth: {
      user: process.env.EMAIL_SERVER_USER,
      pass: process.env.EMAIL_SERVER_PASSWORD,
    },
    tls: {
      rejectUnauthorized: false,
    },
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
}

// Validation schema
const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address')
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const validationResult = forgotPasswordSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: true,
          message: 'If an account exists with this email, you will receive password reset instructions.'
        },
        { status: 200 }
      );
    }

    const { email } = validationResult.data;
    const ipAddress = getClientIp(request);
    const userAgent = request.headers.get('user-agent') || undefined;

    // Check rate limiting
    const canProceed = await checkResetRateLimit(email, ipAddress);
    if (!canProceed) {
      // Log rate limit attempt
      await createAuditLog({
        action: 'PASSWORD_RESET_RATE_LIMITED',
        entity: 'USER',
        metadata: {
          email,
          reason: 'Rate limit exceeded'
        },
        request
      });

      // Return generic success to prevent email enumeration
      return NextResponse.json(
        {
          success: true,
          message: 'If an account exists with this email, you will receive password reset instructions.'
        },
        { status: 200 }
      );
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: {
        email: email.toLowerCase(),
        isActive: true // Only allow reset for active users
      },
      select: {
        id: true,
        email: true,
        name: true
      }
    });

    if (user) {
      try {
        console.log('User found:', { id: user.id, email: user.email });

        // Create reset token
        const resetToken = await createPasswordResetToken(
          user.id,
          user.email,
          ipAddress,
          userAgent
        );
        console.log('Reset token created successfully');

        // Send reset email via external script to avoid bundling issues
        try {
          const { exec } = require('child_process');
          const { promisify } = require('util');
          const execAsync = promisify(exec);

          const scriptPath = require('path').join(process.cwd(), 'scripts', 'send-password-reset.js');
          const command = `node "${scriptPath}" "${user.email}" "${user.name || user.email}" "${resetToken}"`;

          const { stdout, stderr } = await execAsync(command);

          if (stderr) {
            console.error('Email script error:', stderr);
          }
          if (stdout) {
            console.log('Email script output:', stdout);
          }

          console.log('Password reset email sent successfully');
        } catch (emailError) {
          console.error('Failed to send password reset email:', emailError);
          // Continue even if email fails - token is created
        }

        // Log successful request
        try {
          await createAuditLog({
            userId: user.id,
            action: 'PASSWORD_RESET_REQUESTED',
            entity: 'USER',
            entityId: user.id,
            metadata: {
              email: user.email
            },
            request
          });
          console.log('Audit log created');
        } catch (auditError) {
          console.error('Failed to create audit log:', auditError);
          // Continue even if audit log fails
        }

      } catch (error) {
        console.error('Error in password reset process:', error);
        // Still return success to prevent enumeration
      }
    } else {
      // Log failed attempt (user not found)
      await createAuditLog({
        action: 'PASSWORD_RESET_FAILED',
        entity: 'USER',
        metadata: {
          email,
          reason: 'User not found or inactive'
        },
        request
      });
    }

    // Always return success to prevent email enumeration
    return NextResponse.json(
      {
        success: true,
        message: 'If an account exists with this email, you will receive password reset instructions.'
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Forgot password error:', error);

    // Return generic success even on error to prevent information leakage
    return NextResponse.json(
      {
        success: true,
        message: 'If an account exists with this email, you will receive password reset instructions.'
      },
      { status: 200 }
    );
  }
}