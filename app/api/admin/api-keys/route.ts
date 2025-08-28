import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { generateApiKey, hashApiKey, maskApiKey } from '@/lib/api-key';
import { z } from 'zod';

// Schema for creating API key
const createApiKeySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  permissions: z.array(z.string()).optional(),
  expiresIn: z.number().optional() // Days until expiration
});

// GET: List all API keys
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN')) {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 401 }
      );
    }

    const apiKeys = await prisma.apiKey.findMany({
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Mask the API keys for security
    const sanitizedKeys = apiKeys.map(key => ({
      id: key.id,
      name: key.name,
      key: maskApiKey(key.key), // Mask the key for display
      description: key.description,
      permissions: key.permissions,
      isActive: key.isActive,
      expiresAt: key.expiresAt,
      lastUsedAt: key.lastUsedAt,
      usageCount: key.usageCount,
      createdAt: key.createdAt,
      createdBy: key.createdBy,
      isExpired: key.expiresAt ? new Date() > key.expiresAt : false
    }))

    return NextResponse.json(sanitizedKeys);
  } catch (error) {
    console.error('API key list error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch API keys' },
      { status: 500 }
    );
  }
}

// POST: Create new API key
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN')) {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validation = createApiKeySchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { name, description, permissions, expiresIn } = validation.data;

    // Generate the API key
    const apiKey = generateApiKey();
    const hashedKey = await hashApiKey(apiKey);

    // Calculate expiration date
    let expiresAt = null;
    if (expiresIn && expiresIn > 0) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiresIn);
    }

    // Create the API key in database
    const dbApiKey = await prisma.apiKey.create({
      data: {
        name,
        key: apiKey, // Store the actual key (will be masked when displayed)
        hashedKey,
        description,
        permissions: permissions || ['soc'],
        expiresAt,
        createdById: session.user.id
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'CREATE',
        entity: 'ApiKey',
        entityId: dbApiKey.id,
        newValues: {
          name: dbApiKey.name,
          permissions: dbApiKey.permissions
        },
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
        userAgent: request.headers.get('user-agent')
      }
    });

    // Return the full key only on creation
    return NextResponse.json({
      ...dbApiKey,
      fullKey: apiKey, // Send the full key only once
      message: 'Save this API key securely. It will not be shown again.'
    });

  } catch (error) {
    console.error('API key creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create API key' },
      { status: 500 }
    );
  }
}