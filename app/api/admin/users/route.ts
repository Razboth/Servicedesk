import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { sanitizeSearchInput, isValidEmail, sanitizePhoneNumber, validatePasswordStrength } from '@/lib/security';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const rawSearch = searchParams.get('search') || '';
    const search = sanitizeSearchInput(rawSearch);
    const role = searchParams.get('role');
    const branchId = searchParams.get('branchId');
    const supportGroupId = searchParams.get('supportGroupId');
    const status = searchParams.get('status');

    // Build where clause
    const where: any = {};
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (role && role !== 'all') {
      // Support comma-separated roles
      if (role.includes(',')) {
        where.role = { in: role.split(',') };
      } else {
        where.role = role;
      }
    }

    if (branchId && branchId !== 'all') {
      where.branchId = branchId;
    }

    if (supportGroupId && supportGroupId !== 'all') {
      where.supportGroupId = supportGroupId;
    }

    if (status === 'active') {
      where.isActive = true;
    } else if (status === 'inactive') {
      where.isActive = false;
    }

    // Fetch users
    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        username: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        loginAttempts: true,
        lockedAt: true,
        lastActivity: true,
        createdAt: true,
        mustChangePassword: true,
        isFirstLogin: true,
        passwordChangedAt: true,
        branch: {
          select: {
            id: true,
            name: true,
            code: true
          }
        },
        supportGroup: {
          select: {
            id: true,
            name: true,
            code: true
          }
        },
        _count: {
          select: {
            createdTickets: true,
            assignedTickets: true
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    return NextResponse.json({ users });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { 
      email, 
      name, 
      password, 
      phone,
      role,
      branchId,
      supportGroupId,
      sendEmail = false 
    } = body;

    // Validate required fields
    if (!email || !name || !role) {
      return NextResponse.json(
        { error: 'Email, name, and role are required' },
        { status: 400 }
      );
    }

    // Validate email format
    if (!isValidEmail(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Validate and sanitize phone number if provided
    const sanitizedPhone = phone ? sanitizePhoneNumber(phone) : null;
    if (phone && !sanitizedPhone) {
      return NextResponse.json(
        { error: 'Invalid phone number format' },
        { status: 400 }
      );
    }

    // Validate password strength if provided
    if (password) {
      const passwordValidation = validatePasswordStrength(password);
      if (!passwordValidation.isValid) {
        return NextResponse.json(
          { error: passwordValidation.message },
          { status: 400 }
        );
      }
    }

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      );
    }

    // Generate password if not provided
    const userPassword = password || generatePassword();
    const hashedPassword = await bcrypt.hash(userPassword, 10);

    // Validate role-specific requirements
    if (role === 'TECHNICIAN' && !supportGroupId) {
      return NextResponse.json(
        { error: 'Support group is required for technicians' },
        { status: 400 }
      );
    }

    if (['MANAGER', 'USER', 'AGENT'].includes(role) && !branchId) {
      return NextResponse.json(
        { error: 'Branch is required for this role' },
        { status: 400 }
      );
    }

    // Create user with mustChangePassword flag set to true for new users
    const user = await prisma.user.create({
      data: {
        username: email.split('@')[0], // Generate username from email
        email,
        name,
        password: hashedPassword,
        phone: sanitizedPhone,
        role,
        branchId: branchId || undefined,
        supportGroupId: supportGroupId || undefined,
        isActive: true,
        mustChangePassword: true,  // Force password change on first login
        isFirstLogin: true,         // Mark as first login
        passwordChangedAt: null     // No password change yet
      },
      include: {
        branch: true,
        supportGroup: true
      }
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'CREATE',
        entity: 'User',
        entityId: user.id,
        newValues: {
          email: user.email,
          name: user.name,
          role: user.role,
          branchId: user.branchId,
          supportGroupId: user.supportGroupId
        },
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
        userAgent: request.headers.get('user-agent')
      }
    });

    // TODO: Send email with credentials if sendEmail is true
    if (sendEmail) {
      // Implement email sending logic
      console.log(`Would send email to ${email} with password: ${userPassword}`);
    }

    return NextResponse.json({
      user,
      tempPassword: sendEmail ? null : userPassword // Only return password if not sending email
    });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    );
  }
}

// Helper function to generate secure password
function generatePassword(length = 12) {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return password;
}