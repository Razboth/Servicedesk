import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyApiKey } from '@/lib/api-key';

export interface ApiKeyData {
  id: string;
  name: string;
  permissions: any;
  createdById: string;
}

export async function authenticateApiKey(request: NextRequest): Promise<{
  authenticated: boolean;
  apiKey?: ApiKeyData;
  error?: string;
}> {
  try {
    // Check for API key in headers
    const authHeader = request.headers.get('authorization');
    const apiKeyHeader = request.headers.get('x-api-key');
    
    let providedKey: string | null = null;
    
    // Check Authorization header (Bearer format)
    if (authHeader && authHeader.startsWith('Bearer ')) {
      providedKey = authHeader.substring(7);
    }
    // Check X-API-Key header
    else if (apiKeyHeader) {
      providedKey = apiKeyHeader;
    }
    
    if (!providedKey) {
      return { 
        authenticated: false, 
        error: 'No API key provided. Include in Authorization header as "Bearer YOUR_KEY" or in X-API-Key header' 
      };
    }
    
    // Find the API key in database
    const apiKeyRecord = await prisma.apiKey.findUnique({
      where: { key: providedKey },
      select: {
        id: true,
        name: true,
        hashedKey: true,
        permissions: true,
        isActive: true,
        expiresAt: true,
        createdById: true
      }
    });
    
    if (!apiKeyRecord) {
      return { authenticated: false, error: 'Invalid API key' };
    }
    
    // Check if key is active
    if (!apiKeyRecord.isActive) {
      return { authenticated: false, error: 'API key is inactive' };
    }
    
    // Check if key has expired
    if (apiKeyRecord.expiresAt && new Date() > apiKeyRecord.expiresAt) {
      return { authenticated: false, error: 'API key has expired' };
    }
    
    // Verify the API key against the hash
    const isValid = await verifyApiKey(providedKey, apiKeyRecord.hashedKey);
    if (!isValid) {
      return { authenticated: false, error: 'Invalid API key' };
    }
    
    // Update usage statistics
    await prisma.apiKey.update({
      where: { id: apiKeyRecord.id },
      data: {
        lastUsedAt: new Date(),
        usageCount: { increment: 1 }
      }
    });
    
    return {
      authenticated: true,
      apiKey: {
        id: apiKeyRecord.id,
        name: apiKeyRecord.name,
        permissions: apiKeyRecord.permissions,
        createdById: apiKeyRecord.createdById
      }
    };
  } catch (error) {
    console.error('API key authentication error:', error);
    return { authenticated: false, error: 'Authentication error' };
  }
}

export function checkApiPermission(apiKey: ApiKeyData, requiredPermission: string): boolean {
  if (!apiKey.permissions) return false;
  
  const permissions = Array.isArray(apiKey.permissions) ? apiKey.permissions : [];
  
  // Check for wildcard permission
  if (permissions.includes('*')) return true;
  
  // Check for specific permission
  if (permissions.includes(requiredPermission)) return true;
  
  // Check for partial wildcard (e.g., 'tickets:*' for 'tickets:create')
  const permissionParts = requiredPermission.split(':');
  if (permissionParts.length > 1) {
    const wildcardPermission = `${permissionParts[0]}:*`;
    if (permissions.includes(wildcardPermission)) return true;
  }
  
  return false;
}

export function createApiErrorResponse(message: string, status: number = 400) {
  return NextResponse.json(
    {
      error: message,
      timestamp: new Date().toISOString(),
      status
    },
    { status }
  );
}

export function createApiSuccessResponse(data: any, status: number = 200) {
  return NextResponse.json(
    {
      success: true,
      data,
      timestamp: new Date().toISOString()
    },
    { status }
  );
}