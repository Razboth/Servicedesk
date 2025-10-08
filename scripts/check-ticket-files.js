const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkTicketFiles() {
  try {
    // Find ticket with number 3804
    const ticket = await prisma.ticket.findFirst({
      where: {
        ticketNumber: '3804'
      },
      include: {
        fieldValues: {
          include: {
            field: true
          }
        }
      }
    });

    if (!ticket) {
      console.log('Ticket 3804 not found');
      return;
    }

    console.log('Ticket found:', {
      id: ticket.id,
      ticketNumber: ticket.ticketNumber,
      title: ticket.title,
      createdAt: ticket.createdAt
    });

    console.log('\n=== Field Values ===');

    // Check all field values, especially FILE type
    for (const fieldValue of ticket.fieldValues) {
      if (fieldValue.field.type === 'FILE') {
        console.log('\nFile Field Found:');
        console.log('- Field ID:', fieldValue.id);
        console.log('- Field Label:', fieldValue.field.label);
        console.log('- Field Type:', fieldValue.field.type);
        console.log('- Has Value:', !!fieldValue.value);

        if (fieldValue.value) {
          // Check the format of the value
          const value = fieldValue.value;
          console.log('- Value Length:', value.length);
          console.log('- Value Preview (first 200 chars):', value.substring(0, 200));

          // Check if it's in the expected format
          if (value.includes('|')) {
            const parts = value.split('|');
            console.log('- Format: Pipe-separated');
            console.log('- Filename:', parts[0]);
            console.log('- MIME Type:', parts[1]);
            console.log('- Base64 Length:', parts[2]?.length || 0);
          } else if (value.startsWith('data:')) {
            console.log('- Format: Data URL');
            const matches = value.match(/^data:([^;]+);base64,(.+)$/);
            if (matches) {
              console.log('- MIME Type:', matches[1]);
              console.log('- Base64 Length:', matches[2].length);
            }
          } else {
            console.log('- Format: Unknown/Raw');
          }
        } else {
          console.log('- No file data stored');
        }
      } else {
        console.log(`\n${fieldValue.field.label} (${fieldValue.field.type}):`,
          fieldValue.value ? fieldValue.value.substring(0, 100) : 'null');
      }
    }

    // Also check attachments
    const attachments = await prisma.attachment.findMany({
      where: {
        ticketId: ticket.id
      }
    });

    if (attachments.length > 0) {
      console.log('\n=== Attachments ===');
      for (const attachment of attachments) {
        console.log(`- ${attachment.filename} (${attachment.mimeType}): ${attachment.size} bytes`);
      }
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkTicketFiles();