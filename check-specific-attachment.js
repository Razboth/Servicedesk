const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkAttachment() {
  try {
    console.log('Checking attachment cmdwkko9n000chls855sh804t in ticket TKT-2025-0022...');
    
    // Find the ticket first
    const ticket = await prisma.ticket.findFirst({
      where: {
        ticketNumber: 'TKT-2025-0022'
      },
      select: {
        id: true,
        ticketNumber: true
      }
    });
    
    if (!ticket) {
      console.log('Ticket TKT-2025-0022 not found');
      return;
    }
    
    console.log('Found ticket:', ticket);
    
    // Find the specific attachment
    const attachment = await prisma.ticketAttachment.findUnique({
      where: {
        id: 'cmdwkko9n000chls855sh804t'
      },
      select: {
        id: true,
        ticketId: true,
        filename: true,
        originalName: true,
        mimeType: true,
        size: true,
        path: true,
        createdAt: true
      }
    });
    
    if (!attachment) {
      console.log('Attachment cmdwkko9n000chls855sh804t not found');
      return;
    }
    
    console.log('\nAttachment details:');
    console.log('ID:', attachment.id);
    console.log('Ticket ID:', attachment.ticketId);
    console.log('Filename:', attachment.filename);
    console.log('Original Name:', attachment.originalName);
    console.log('MIME Type:', attachment.mimeType);
    console.log('Size:', attachment.size);
    console.log('Created At:', attachment.createdAt);
    console.log('Path length:', attachment.path?.length || 0);
    console.log('Path starts with "data:":', attachment.path?.startsWith('data:') || false);
    console.log('Path starts with "iVBORw":', attachment.path?.startsWith('iVBORw') || false);
    console.log('Looks like base64:', attachment.path && attachment.path.length > 100 && /^[A-Za-z0-9+/=]+$/.test(attachment.path));
    
    if (attachment.path) {
      console.log('\nFirst 100 characters of path:');
      console.log(attachment.path.substring(0, 100));
      
      console.log('\nLast 50 characters of path:');
      console.log(attachment.path.substring(attachment.path.length - 50));
      
      // Try to decode as base64 and check if it's valid
      try {
        const buffer = Buffer.from(attachment.path, 'base64');
        console.log('\nBase64 decode successful!');
        console.log('Decoded buffer size:', buffer.length);
        console.log('First 20 bytes as hex:', buffer.subarray(0, 20).toString('hex'));
        
        // Check PNG signature
        const pngSignature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
        if (buffer.subarray(0, 8).equals(pngSignature)) {
          console.log('✓ Valid PNG file signature detected!');
        } else {
          console.log('✗ PNG signature not found');
        }
      } catch (error) {
        console.log('\nBase64 decode failed:', error.message);
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAttachment();