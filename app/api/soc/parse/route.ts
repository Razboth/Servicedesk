import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { parseSOCNotification, validateSOCData } from '@/lib/soc-parser';
import { z } from 'zod';

// Schema for the request
const parseRequestSchema = z.object({
  text: z.string().min(1, 'SOC notification text is required')
});

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
    const authHeader = request.headers.get('Authorization');
    const apiKey = authHeader?.replace('Bearer ', '');

    // Validate access
    if (!session && !apiKey) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // If using session, must be SECURITY_ANALYST or ADMIN
    if (session && !['SECURITY_ANALYST', 'ADMIN'].includes(session.user.role)) {
      // Check if user is in SECURITY_OPS support group
      const userWithGroup = await prisma.user.findUnique({
        where: { id: session.user.id },
        include: { supportGroup: true }
      });

      if (userWithGroup?.supportGroup?.code !== 'SECURITY_OPS') {
        return NextResponse.json(
          { error: 'Only security analysts can parse SOC notifications' },
          { status: 403 }
        );
      }
    }

    // Parse request body
    const body = await request.json();
    const validation = parseRequestSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { text } = validation.data;

    // Parse the SOC notification
    const parsedData = parseSOCNotification(text);
    
    // Validate the parsed data
    const dataValidation = validateSOCData(parsedData);

    // Return the parsed data along with validation status
    // Even if validation fails, we return the parsed data so user can fix it
    return NextResponse.json({
      success: true,
      parsed: parsedData,
      validation: {
        valid: dataValidation.valid,
        errors: dataValidation.errors
      }
    });

  } catch (error) {
    console.error('SOC parse error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to parse SOC notification',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}