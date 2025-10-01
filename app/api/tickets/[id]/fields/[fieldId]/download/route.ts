import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/tickets/[id]/fields/[fieldId]/download - Download field file
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; fieldId: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: ticketId, fieldId } = params;

    // Get the field value with ticket info
    const fieldValue = await prisma.ticketFieldValue.findFirst({
      where: {
        id: fieldId,
        ticketId: ticketId
      },
      include: {
        field: true,
        ticket: {
          select: {
            id: true,
            createdById: true,
            assignedToId: true,
            branchId: true
          }
        }
      }
    });

    if (!fieldValue) {
      return NextResponse.json({ error: 'Field value not found' }, { status: 404 });
    }

    // Check if the field type is FILE
    if (fieldValue.field.type !== 'FILE') {
      return NextResponse.json({ error: 'Field is not a file type' }, { status: 400 });
    }

    // Check access permissions
    const hasAccess =
      session.user.role === 'ADMIN' ||
      session.user.id === fieldValue.ticket.createdById ||
      session.user.id === fieldValue.ticket.assignedToId ||
      (session.user.role === 'TECHNICIAN' && fieldValue.ticket.assignedToId === session.user.id) ||
      (session.user.role === 'MANAGER' && session.user.branchId === fieldValue.ticket.branchId);

    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const fileData = fieldValue.value;
    if (!fileData) {
      return NextResponse.json({ error: 'No file data found' }, { status: 404 });
    }

    // Parse the file data (expected format: "filename|mimeType|base64data")
    let filename = 'download';
    let mimeType = 'application/octet-stream';
    let base64Data = fileData;
    let hasBase64Data = false;

    // Check if the value contains metadata
    if (fileData.includes('|')) {
      const parts = fileData.split('|');
      if (parts.length >= 3) {
        filename = parts[0];
        mimeType = parts[1];
        base64Data = parts.slice(2).join('|'); // In case base64 contains |
        hasBase64Data = true;
      }
    } else if (fileData.startsWith('data:')) {
      // Handle data URL format
      const matches = fileData.match(/^data:([^;]+);base64,(.+)$/);
      if (matches) {
        mimeType = matches[1];
        base64Data = matches[2];
        // Try to get filename from field label
        filename = fieldValue.field.label.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        hasBase64Data = true;
      }
    } else {
      // Handle case where only filename is stored (legacy data)
      // This is just a filename, not base64 data
      filename = fileData;

      // Try to determine mime type from extension
      const ext = filename.split('.').pop()?.toLowerCase();
      if (ext) {
        const mimeTypes: { [key: string]: string } = {
          'pdf': 'application/pdf',
          'doc': 'application/msword',
          'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'xls': 'application/vnd.ms-excel',
          'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'png': 'image/png',
          'jpg': 'image/jpeg',
          'jpeg': 'image/jpeg',
          'gif': 'image/gif',
          'txt': 'text/plain',
          'csv': 'text/csv'
        };
        mimeType = mimeTypes[ext] || 'application/octet-stream';
      }

      // Return error message for legacy data
      return NextResponse.json({
        error: 'File not available',
        message: `The file "${filename}" was referenced but the actual file data was not uploaded. Please re-upload the file.`,
        filename: filename
      }, { status: 404 });
    }

    // Only try to decode if we have actual base64 data
    if (!hasBase64Data) {
      return NextResponse.json({
        error: 'Invalid file data',
        message: 'The file data is not in the expected format.'
      }, { status: 400 });
    }

    // Convert base64 to buffer
    let buffer: Buffer;
    try {
      buffer = Buffer.from(base64Data, 'base64');
    } catch (error) {
      return NextResponse.json({
        error: 'Invalid file encoding',
        message: 'The file data could not be decoded.'
      }, { status: 400 });
    }

    // Return the file
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': mimeType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': buffer.length.toString(),
        'Cache-Control': 'private, max-age=3600'
      }
    });

  } catch (error) {
    console.error('Error downloading field file:', error);
    return NextResponse.json(
      { error: 'Failed to download file' },
      { status: 500 }
    );
  }
}

// GET /api/tickets/[id]/fields/[fieldId]/preview - Preview field file
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; fieldId: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: ticketId, fieldId } = params;

    // Get the field value with ticket info
    const fieldValue = await prisma.ticketFieldValue.findFirst({
      where: {
        id: fieldId,
        ticketId: ticketId
      },
      include: {
        field: true,
        ticket: {
          select: {
            id: true,
            createdById: true,
            assignedToId: true,
            branchId: true
          }
        }
      }
    });

    if (!fieldValue) {
      return NextResponse.json({ error: 'Field value not found' }, { status: 404 });
    }

    // Check if the field type is FILE
    if (fieldValue.field.type !== 'FILE') {
      return NextResponse.json({ error: 'Field is not a file type' }, { status: 400 });
    }

    // Check access permissions
    const hasAccess =
      session.user.role === 'ADMIN' ||
      session.user.id === fieldValue.ticket.createdById ||
      session.user.id === fieldValue.ticket.assignedToId ||
      (session.user.role === 'TECHNICIAN' && fieldValue.ticket.assignedToId === session.user.id) ||
      (session.user.role === 'MANAGER' && session.user.branchId === fieldValue.ticket.branchId);

    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const fileData = fieldValue.value;
    if (!fileData) {
      return NextResponse.json({ error: 'No file data found' }, { status: 404 });
    }

    // Parse the file data
    let filename = 'file';
    let mimeType = 'application/octet-stream';
    let base64Data = fileData;
    let hasBase64Data = false;

    if (fileData.includes('|')) {
      const parts = fileData.split('|');
      if (parts.length >= 3) {
        filename = parts[0];
        mimeType = parts[1];
        base64Data = parts.slice(2).join('|');
        hasBase64Data = true;
      }
    } else if (fileData.startsWith('data:')) {
      const matches = fileData.match(/^data:([^;]+);base64,(.+)$/);
      if (matches) {
        mimeType = matches[1];
        base64Data = matches[2];
        filename = fieldValue.field.label.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        hasBase64Data = true;
      }
    } else {
      // Handle case where only filename is stored (legacy data)
      filename = fileData;

      // Try to determine mime type from extension
      const ext = filename.split('.').pop()?.toLowerCase();
      if (ext) {
        const mimeTypes: { [key: string]: string } = {
          'pdf': 'application/pdf',
          'doc': 'application/msword',
          'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'xls': 'application/vnd.ms-excel',
          'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'png': 'image/png',
          'jpg': 'image/jpeg',
          'jpeg': 'image/jpeg',
          'gif': 'image/gif',
          'txt': 'text/plain',
          'csv': 'text/csv'
        };
        mimeType = mimeTypes[ext] || 'application/octet-stream';
      }

      // Return error for legacy data
      return NextResponse.json({
        error: 'File not available',
        message: `The file "${filename}" was referenced but the actual file data was not uploaded. Please re-upload the file.`,
        filename: filename,
        isLegacy: true
      }, { status: 404 });
    }

    // Only return preview if we have actual base64 data
    if (!hasBase64Data) {
      return NextResponse.json({
        error: 'Invalid file data',
        message: 'The file data is not in the expected format.'
      }, { status: 400 });
    }

    // Return preview data
    let size: number;
    try {
      size = Buffer.from(base64Data, 'base64').length;
    } catch (error) {
      return NextResponse.json({
        error: 'Invalid file encoding',
        message: 'The file data could not be decoded.'
      }, { status: 400 });
    }

    return NextResponse.json({
      filename,
      mimeType,
      data: `data:${mimeType};base64,${base64Data}`,
      size
    });

  } catch (error) {
    console.error('Error getting field file preview:', error);
    return NextResponse.json(
      { error: 'Failed to get file preview' },
      { status: 500 }
    );
  }
}