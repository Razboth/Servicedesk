import { NextRequest, NextResponse } from 'next/server';
import { validateResetToken } from '@/lib/password-reset';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        {
          valid: false,
          error: 'Token is required'
        },
        { status: 400 }
      );
    }

    // Validate token
    const tokenData = await validateResetToken(token);

    if (!tokenData) {
      return NextResponse.json({
        valid: false,
        error: 'Invalid or expired token'
      });
    }

    return NextResponse.json({
      valid: true,
      email: tokenData.email,
      expiresAt: tokenData.expiresAt
    });

  } catch (error) {
    console.error('Token validation error:', error);

    return NextResponse.json(
      {
        valid: false,
        error: 'Error validating token'
      },
      { status: 500 }
    );
  }
}