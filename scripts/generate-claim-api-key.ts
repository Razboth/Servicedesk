import { PrismaClient } from '@prisma/client';
import { generateApiKey, hashApiKey } from '../lib/api-key';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const prisma = new PrismaClient();

async function generateClaimApiKey() {
  try {
    // Find or create a system user for API operations
    let systemUser = await prisma.user.findFirst({
      where: { 
        email: 'api@system.local'
      }
    });
    
    if (!systemUser) {
      console.log('Creating system user for API operations...');
      
      // Find a default branch
      const defaultBranch = await prisma.branch.findFirst({
        where: { isActive: true },
        select: { id: true }
      });
      
      systemUser = await prisma.user.create({
        data: {
          username: 'api_system',
          email: 'api@system.local',
          name: 'API System User',
          password: null, // No password for system user
          role: 'AGENT',
          branchId: defaultBranch?.id,
          isActive: true,
          mustChangePassword: false,
          isFirstLogin: false
        }
      });
      
      console.log('System user created:', systemUser.id);
    }
    
    // Generate the API key
    const apiKey = generateApiKey();
    const hashedKey = await hashApiKey(apiKey);
    
    // Create the API key record
    const apiKeyRecord = await prisma.apiKey.create({
      data: {
        name: 'Claim API Key',
        key: apiKey,
        hashedKey: hashedKey,
        description: 'API key for automated claim ticket creation',
        permissions: [
          'claims:create',
          'claims:read',
          'tickets:create',
          'tickets:read'
        ],
        isActive: true,
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
        createdById: systemUser.id
      }
    });
    
    console.log('\n========================================');
    console.log('CLAIM API KEY GENERATED SUCCESSFULLY');
    console.log('========================================');
    console.log('\nAPI Key Details:');
    console.log('Name:', apiKeyRecord.name);
    console.log('Description:', apiKeyRecord.description);
    console.log('Expires:', apiKeyRecord.expiresAt?.toISOString());
    console.log('Permissions:', apiKeyRecord.permissions);
    console.log('\n🔑 API KEY (save this securely):');
    console.log(apiKey);
    console.log('\n⚠️  WARNING: This key will not be shown again!');
    console.log('========================================\n');
    
    console.log('Example usage with cURL:\n');
    console.log('Create a claim ticket:');
    console.log(`curl -X POST http://localhost:3000/api/public/claims \\
  -H "X-API-Key: ${apiKey}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "claimType": "REIMBURSEMENT",
    "claimAmount": 5000000,
    "claimCurrency": "IDR",
    "claimReason": "Business travel expenses for client meeting",
    "claimantName": "John Doe",
    "claimantEmail": "john.doe@example.com",
    "claimantPhone": "081234567890",
    "claimantDepartment": "Sales",
    "referenceNumber": "REF-2024-001"
  }'`);
    
    console.log('\n\nGet claim status:');
    console.log(`curl -X GET "http://localhost:3000/api/public/claims?ticketNumber=CLM-2024-000001" \\
  -H "X-API-Key: ${apiKey}"`);
    
    console.log('\n========================================\n');
    
  } catch (error) {
    console.error('Error generating API key:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
generateClaimApiKey();