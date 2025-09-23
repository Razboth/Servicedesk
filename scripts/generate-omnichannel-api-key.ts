import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function generateOmnichannelApiKey() {
  try {
    // Generate a secure API key
    const apiKeyRaw = `omni_${crypto.randomBytes(32).toString('hex')}`;
    const hashedApiKey = await bcrypt.hash(apiKeyRaw, 10);

    // Get the admin user (or create a system user for API)
    const adminUser = await prisma.user.findFirst({
      where: {
        role: 'ADMIN'
      }
    });

    if (!adminUser) {
      console.error('No admin user found. Please create an admin user first.');
      process.exit(1);
    }

    // Create the API key with omnichannel permissions
    const apiKey = await prisma.apiKey.create({
      data: {
        name: 'Omnichannel Integration Key',
        description: 'API key for omnichannel partner integration',
        key: apiKeyRaw,
        hashedKey: hashedApiKey,
        permissions: {
          actions: [
            'omnichannel:create',
            'omnichannel:read',
            'omnichannel:update'
          ],
          serviceScope: [
            'OMNICHANNEL',
            'TICKET_CREATE',
            'TICKET_STATUS'
          ],
          rateLimit: 1000, // 1000 requests per hour
          metadata: {
            purpose: 'Omnichannel partner integration',
            createdAt: new Date().toISOString(),
            allowedChannels: [
              'WHATSAPP',
              'EMAIL',
              'CHAT',
              'PHONE',
              'SMS',
              'FACEBOOK',
              'INSTAGRAM',
              'TWITTER',
              'TELEGRAM',
              'WEB_PORTAL'
            ],
            webhookEnabled: true
          }
        },
        isActive: true,
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
        createdById: adminUser.id
      }
    });

    console.log('✅ Omnichannel API Key created successfully!');
    console.log('=====================================');
    console.log('API Key Details:');
    console.log('----------------');
    console.log(`Key ID: ${apiKey.id}`);
    console.log(`Name: ${apiKey.name}`);
    console.log(`API Key: ${apiKeyRaw}`);
    console.log('');
    console.log('⚠️  IMPORTANT: Save this API key securely!');
    console.log('This is the only time you will see the raw API key.');
    console.log('');
    console.log('Permissions:', JSON.stringify(apiKey.permissions, null, 2));
    console.log('Expires:', apiKey.expiresAt?.toISOString());
    console.log('=====================================');
    console.log('');
    console.log('Use this API key in the X-API-Key header when calling:');
    console.log('- POST /api/omnichannel/tickets (Create ticket)');
    console.log('- GET /api/omnichannel/tickets (Check status)');
    console.log('- GET /api/omnichannel/tickets/[ticketNumber] (Get details)');
    console.log('- PATCH /api/omnichannel/tickets/[ticketNumber] (Update ticket)');

  } catch (error) {
    console.error('Error creating API key:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
generateOmnichannelApiKey();