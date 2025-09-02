import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { saveFile } from '@/lib/file-storage';
import { z } from 'zod';

// Validation schema for file upload
const uploadSchema = z.object({
  filename: z.string().min(1).max(255),
  mimeType: z.string().min(1),
  size: z.number().min(1).max(52428800), // 50MB limit
  content: z.string().min(1) // base64 encoded content
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validatedData = uploadSchema.parse(body);

    // Decode base64 content
    let fileBuffer: Buffer;
    try {
      fileBuffer = Buffer.from(validatedData.content, 'base64');
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid file content encoding' },
        { status: 400 }
      );
    }

    // Verify file size matches
    if (fileBuffer.length !== validatedData.size) {
      return NextResponse.json(
        { error: 'File size mismatch' },
        { status: 400 }
      );
    }

    // Save file using secure storage
    const result = await saveFile(
      fileBuffer,
      validatedData.filename,
      validatedData.mimeType,
      session.user.id
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to save file' },
        { status: 400 }
      );
    }

    // Return file information
    return NextResponse.json({
      filename: result.filename,
      originalName: validatedData.filename,
      mimeType: validatedData.mimeType,
      size: validatedData.size,
      uploadedAt: new Date().toISOString()
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid file data', details: error.errors },
        { status: 400 }
      );
    }

    console.error('File upload error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}