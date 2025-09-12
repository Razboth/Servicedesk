#!/usr/bin/env node

/**
 * Convert Base64 stored attachments to file system storage
 * Run this on the target server after database migration
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs').promises;
const path = require('path');

async function convertBase64ToFiles() {
  const prisma = new PrismaClient();
  let processed = 0;
  let errors = 0;
  
  try {
    console.log('🚀 Starting Base64 to File conversion...\n');
    
    // Ensure uploads directory exists
    const uploadsDir = path.join(process.cwd(), 'uploads', 'tickets');
    await fs.mkdir(uploadsDir, { recursive: true });
    console.log(`📁 Created uploads directory: ${uploadsDir}\n`);
    
    // Get all attachments with Base64 data
    const attachments = await prisma.ticketAttachment.findMany({
      where: {
        path: {
          not: null
        }
      },
      select: {
        id: true,
        filename: true,
        originalName: true,
        mimeType: true,
        size: true,
        path: true,
        ticketId: true
      }
    });
    
    console.log(`📎 Found ${attachments.length} attachments to process\n`);
    
    for (const attachment of attachments) {
      try {
        // Check if it's Base64 data (long string, base64 characters)
        const isBase64 = attachment.path.length > 100 && /^[A-Za-z0-9+/=]+$/.test(attachment.path);
        
        if (!isBase64) {
          console.log(`⏭️  Skipping ${attachment.filename} - not Base64 data`);
          continue;
        }
        
        // Generate secure filename
        const timestamp = Date.now();
        const ext = path.extname(attachment.originalName);
        const safeName = attachment.originalName.replace(/[^a-zA-Z0-9.-]/g, '_');
        const filename = `${timestamp}_${safeName}`;
        const filePath = path.join(uploadsDir, filename);
        
        // Convert Base64 to buffer and write to file
        const fileBuffer = Buffer.from(attachment.path, 'base64');
        await fs.writeFile(filePath, fileBuffer);
        
        // Update database record with file path
        await prisma.ticketAttachment.update({
          where: { id: attachment.id },
          data: {
            path: `tickets/${filename}`,
            filename: filename
          }
        });
        
        processed++;
        console.log(`✅ Converted: ${attachment.originalName} → ${filename} (${fileBuffer.length} bytes)`);
        
        // Verify file was written correctly
        const stats = await fs.stat(filePath);
        if (stats.size !== attachment.size) {
          console.log(`⚠️  Size mismatch: expected ${attachment.size}, got ${stats.size}`);
        }
        
      } catch (error) {
        errors++;
        console.error(`❌ Error processing ${attachment.filename}:`, error.message);
      }
    }
    
    console.log(`\n📊 Conversion Summary:`);
    console.log(`✅ Successfully converted: ${processed}`);
    console.log(`❌ Errors: ${errors}`);
    console.log(`📁 Files location: ${uploadsDir}`);
    
    if (processed > 0) {
      console.log(`\n🔧 Next steps:`);
      console.log(`1. Verify files in uploads/tickets/`);
      console.log(`2. Test file downloads through the API`);
      console.log(`3. Update backup procedures to include uploads/ directory`);
      console.log(`4. Consider updating file upload logic to use file system storage`);
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the conversion
convertBase64ToFiles().catch(console.error);