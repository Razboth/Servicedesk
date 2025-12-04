import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { createAuditLog } from '@/lib/audit-logger';
import { getClientIp } from '@/lib/utils/ip-utils';
import bcrypt from 'bcryptjs';

// Generate a simple random password (6 characters: letters and numbers)
function generateTempPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Excluded confusing chars like 0,O,1,I
  let password = '';
  for (let i = 0; i < 6; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

// Email sending function for temporary password
async function sendTempPasswordEmail(email: string, name: string, tempPassword: string) {
  const nodemailer = await import('nodemailer');

  const transporter = nodemailer.default.createTransport({
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

  const loginUrl = `${process.env.NEXTAUTH_URL}/auth/signin`;

  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Password Reset - Bank SulutGo ServiceDesk</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 28px;">Password Sementara</h1>
      </div>

      <div style="background: #f9f9f9; padding: 30px; border: 1px solid #ddd; border-top: none; border-radius: 0 0 10px 10px;">
        <p style="font-size: 16px; margin-bottom: 20px;">Halo ${name},</p>

        <p style="font-size: 16px; margin-bottom: 20px;">
          Kami telah menerima permintaan reset password untuk akun Bank SulutGo ServiceDesk Anda.
          Berikut adalah password sementara Anda:
        </p>

        <div style="text-align: center; margin: 30px 0;">
          <div style="display: inline-block; padding: 20px 40px; background: #f0f0f0; border: 2px dashed #667eea; border-radius: 10px;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 4px; color: #333; font-family: monospace;">
              ${tempPassword}
            </span>
          </div>
        </div>

        <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 5px;">
          <p style="margin: 0; color: #856404; font-size: 14px;">
            <strong>⚠️ Penting:</strong> Anda akan diminta untuk mengganti password setelah login menggunakan password sementara ini.
          </p>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${loginUrl}"
             style="display: inline-block; padding: 14px 30px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white; text-decoration: none; border-radius: 50px; font-size: 16px; font-weight: bold;
                    box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);">
            Login Sekarang
          </a>
        </div>

        <p style="font-size: 14px; color: #666; margin-top: 20px;">
          Jika Anda tidak meminta reset password ini, silakan abaikan email ini dan hubungi tim IT Support.
        </p>

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
Password Sementara - Bank SulutGo ServiceDesk
==============================================

Halo ${name},

Kami telah menerima permintaan reset password untuk akun Bank SulutGo ServiceDesk Anda.

Password Sementara Anda: ${tempPassword}

Silakan login di: ${loginUrl}

PENTING: Anda akan diminta untuk mengganti password setelah login menggunakan password sementara ini.

Jika Anda tidak meminta reset password ini, silakan abaikan email ini.

Bank SulutGo ServiceDesk
IT Support Portal
`;

  const info = await transporter.sendMail({
    from: process.env.EMAIL_FROM || process.env.EMAIL_SERVER_USER,
    to: email,
    subject: 'Password Sementara - Bank SulutGo ServiceDesk',
    html: emailHtml,
    text: emailText,
  });

  console.log('✅ Temporary password email sent successfully');
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
          message: 'Jika email terdaftar, password sementara akan dikirimkan ke email Anda.'
        },
        { status: 200 }
      );
    }

    const { email } = validationResult.data;
    const ipAddress = getClientIp(request);

    // Find user by email
    const user = await prisma.user.findUnique({
      where: {
        email: email.toLowerCase(),
        isActive: true
      },
      select: {
        id: true,
        email: true,
        name: true,
        username: true
      }
    });

    if (user) {
      try {
        console.log('User found:', { id: user.id, email: user.email });

        // Generate simple temp password
        const tempPassword = generateTempPassword();
        console.log('Generated temp password for user');

        // Hash the temp password
        const hashedPassword = await bcrypt.hash(tempPassword, 12);

        // Update user with temp password and set mustChangePassword = true
        await prisma.user.update({
          where: { id: user.id },
          data: {
            password: hashedPassword,
            mustChangePassword: true,
            isFirstLogin: true
          }
        });
        console.log('User password updated with temp password');

        // Send email with temp password
        try {
          await sendTempPasswordEmail(user.email, user.name || user.email, tempPassword);
          console.log('Temp password email sent successfully');
        } catch (emailError) {
          console.error('Failed to send temp password email:', emailError);
          // Continue even if email fails - password is already set
        }

        // Log successful request
        try {
          await createAuditLog({
            userId: user.id,
            action: 'PASSWORD_RESET_TEMP_GENERATED',
            entity: 'USER',
            entityId: user.id,
            metadata: {
              email: user.email,
              method: 'temp_password'
            },
            request
          });
          console.log('Audit log created');
        } catch (auditError) {
          console.error('Failed to create audit log:', auditError);
        }

      } catch (error) {
        console.error('Error in password reset process:', error);
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
        message: 'Jika email terdaftar, password sementara akan dikirimkan ke email Anda.'
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Forgot password error:', error);

    // Return generic success even on error to prevent information leakage
    return NextResponse.json(
      {
        success: true,
        message: 'Jika email terdaftar, password sementara akan dikirimkan ke email Anda.'
      },
      { status: 200 }
    );
  }
}
