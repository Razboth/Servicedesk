import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkTicketFields() {
  const ticketNumber = process.argv[2] || '4587';

  console.log(`\n🔍 Checking ticket: ${ticketNumber}\n`);

  // Find the ticket
  const ticket = await prisma.ticket.findFirst({
    where: { ticketNumber },
    include: {
      fieldValues: {
        include: {
          field: true
        }
      }
    }
  });

  if (!ticket) {
    console.log(`❌ Ticket ${ticketNumber} not found`);
    await prisma.$disconnect();
    return;
  }

  console.log(`✅ Found ticket: ${ticket.title}`);
  console.log(`   ID: ${ticket.id}`);
  console.log(`   Service: ${ticket.serviceId}`);
  console.log(`\n📋 Custom Field Values (${ticket.fieldValues.length} total):\n`);

  for (const fieldValue of ticket.fieldValues) {
    const fieldName = fieldValue.field?.label || 'Unknown Field';
    const fieldType = fieldValue.field?.type || 'Unknown';

    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`Field: ${fieldName}`);
    console.log(`Type: ${fieldType}`);
    console.log(`Value Length: ${fieldValue.value?.length || 0} characters`);

    if (fieldType === 'FILE') {
      console.log(`\n📎 FILE FIELD DETAILS:`);
      console.log(`Raw value (first 200 chars):`);
      console.log(fieldValue.value?.substring(0, 200));

      // Try to parse as JSON
      try {
        const parsed = JSON.parse(fieldValue.value || '');
        console.log(`\n✅ Parses as JSON:`);
        console.log(`   Filename: ${parsed.filename || 'N/A'}`);
        console.log(`   MimeType: ${parsed.mimeType || 'N/A'}`);
        console.log(`   Size: ${parsed.size || 'N/A'} bytes`);
        console.log(`   Has Content: ${parsed.content ? 'YES' : 'NO'}`);
        if (parsed.content) {
          console.log(`   Content Length: ${parsed.content.length} chars`);
          console.log(`   Content Preview: ${parsed.content.substring(0, 50)}...`);
        }
      } catch (e) {
        console.log(`\n⚠️  Does NOT parse as JSON`);
        console.log(`   Trying pipe-separated format...`);

        if (fieldValue.value?.includes('|')) {
          const parts = fieldValue.value.split('|');
          console.log(`   Parts found: ${parts.length}`);
          console.log(`   Part 1 (filename): ${parts[0]}`);
          console.log(`   Part 2 (base64) length: ${parts[1]?.length || 0}`);
        } else {
          console.log(`   No pipe separator found`);
          console.log(`   Just a plain string: ${fieldValue.value}`);
        }
      }
    } else {
      console.log(`Value: ${fieldValue.value?.substring(0, 100) || '(empty)'}${fieldValue.value && fieldValue.value.length > 100 ? '...' : ''}`);
    }
    console.log(``);
  }

  await prisma.$disconnect();
}

checkTicketFields().catch(console.error);
