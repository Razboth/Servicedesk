import { PrismaClient } from '@prisma/client';
import { generateApiKey, hashApiKey, maskApiKey } from '../lib/api-key';

const prisma = new PrismaClient();

async function generateSOCApiKey() {
  try {
    console.log('🔑 Generating SOC API Key...\n');

    // Generate the API key
    const apiKey = generateApiKey();
    const hashedKey = await hashApiKey(apiKey);

    // For now, we'll store it in a simple way
    // In production, you'd store this in the database
    console.log('======================== SOC API KEY ========================');
    console.log('');
    console.log('API Key (save this securely, it won\'t be shown again):');
    console.log(`  ${apiKey}`);
    console.log('');
    console.log('Masked Key (for display):');
    console.log(`  ${maskApiKey(apiKey)}`);
    console.log('');
    console.log('To use this API key:');
    console.log('1. Add to your .env file:');
    console.log(`   SOC_API_KEY=${apiKey}`);
    console.log('');
    console.log('2. Or use in API requests:');
    console.log('   Authorization: Bearer ' + apiKey);
    console.log('');
    console.log('3. Test with curl:');
    console.log(`   curl -X POST http://localhost:3000/api/soc/parse-and-create \\
     -H "Authorization: Bearer ${apiKey}" \\
     -H "Content-Type: application/json" \\
     -d '{"text": "SOC notification content..."}'`);
    console.log('');
    console.log('=============================================================');

    // If ApiKey model exists in schema, uncomment this:
    /*
    const dbApiKey = await prisma.apiKey.create({
      data: {
        name: 'SOC Integration API Key',
        key: maskApiKey(apiKey), // Store masked version for display
        hashedKey: hashedKey,    // Store hashed version for verification
        description: 'API key for external SOC tool integration',
        permissions: {
          endpoints: ['/api/soc/parse-and-create'],
          roles: ['SOC_INTEGRATION']
        },
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
        createdById: 'system' // You might want to use an actual admin user ID
      }
    });
    
    console.log('\\nAPI Key saved to database with ID:', dbApiKey.id);
    */

  } catch (error) {
    console.error('Error generating API key:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
generateSOCApiKey();