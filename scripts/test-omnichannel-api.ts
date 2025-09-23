import fetch from 'node-fetch';

// Configuration
const API_BASE_URL = 'http://localhost:3002/api/omnichannel';
const API_KEY = process.argv[2]; // Pass API key as command line argument

if (!API_KEY) {
  console.error('Please provide an API key as command line argument');
  console.error('Usage: npx tsx scripts/test-omnichannel-api.ts <API_KEY>');
  process.exit(1);
}

// Test data
const testTicketData = {
  channel: 'WHATSAPP',
  channelReferenceId: `WA-TEST-${Date.now()}`,
  serviceType: 'CLAIM',

  customer: {
    name: 'Test Customer',
    email: 'test@example.com',
    phone: '+6281234567890',
    identifier: 'CIF-TEST-001',
    branchCode: '001',
    department: 'Retail Banking',
    preferredLanguage: 'id'
  },

  ticket: {
    title: 'Test ATM Card Claim Request',
    description: 'This is a test ticket created via omnichannel API',
    priority: 'HIGH',
    category: 'SERVICE_REQUEST',

    metadata: {
      claimType: 'ATM_CARD_RETAINED',
      claimAmount: 500000,
      claimCurrency: 'IDR',
      claimDate: new Date().toISOString(),
      claimReason: 'Card retained by ATM during test',
      atmId: 'ATM-TEST-001',
      transactionId: `TRX-TEST-${Date.now()}`,
      referenceNumber: `REF-TEST-${Date.now()}`,

      customFields: {
        retentionTime: '10:30 AM',
        witnessPresent: 'Yes'
      }
    }
  },

  attachments: [],

  integration: {
    // webhookUrl is optional, so we can omit it
    apiVersion: '1.0',
    partnerId: 'TEST-PARTNER',
    requestId: `REQ-TEST-${Date.now()}`
  }
};

async function testCreateTicket() {
  console.log('🚀 Testing Create Ticket Endpoint...');
  console.log('=====================================');

  try {
    const response = await fetch(`${API_BASE_URL}/tickets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY
      },
      body: JSON.stringify(testTicketData)
    });

    const data = await response.json();

    if (response.ok && data.success) {
      console.log('✅ Ticket created successfully!');
      console.log('Ticket Number:', data.ticketNumber);
      console.log('Ticket ID:', data.ticketId);
      console.log('Status:', data.status);
      console.log('Tracking URL:', data.trackingUrl);
      console.log('');
      return data.ticketNumber;
    } else {
      console.error('❌ Failed to create ticket:');
      console.error('Status:', response.status);
      console.error('Error:', data);
      return null;
    }
  } catch (error) {
    console.error('❌ Error creating ticket:', error);
    return null;
  }
}

async function testGetTicketStatus(ticketNumber: string) {
  console.log('🔍 Testing Get Ticket Status...');
  console.log('=====================================');

  try {
    const response = await fetch(`${API_BASE_URL}/tickets/${ticketNumber}`, {
      method: 'GET',
      headers: {
        'X-API-Key': API_KEY
      }
    });

    const data = await response.json();

    if (response.ok) {
      console.log('✅ Ticket status retrieved successfully!');
      console.log('Ticket Number:', data.ticketNumber);
      console.log('Status:', data.status);
      console.log('Priority:', data.priority);
      console.log('Created At:', data.createdAt);
      console.log('Current Assignee:', data.currentAssignee);
      console.log('SLA Response Deadline:', data.sla?.responseDeadline);
      console.log('SLA Resolution Deadline:', data.sla?.resolutionDeadline);
      console.log('');
      return true;
    } else {
      console.error('❌ Failed to get ticket status:');
      console.error('Status:', response.status);
      console.error('Error:', data);
      return false;
    }
  } catch (error) {
    console.error('❌ Error getting ticket status:', error);
    return false;
  }
}

async function testAddComment(ticketNumber: string) {
  console.log('💬 Testing Add Comment...');
  console.log('=====================================');

  try {
    const response = await fetch(`${API_BASE_URL}/tickets/${ticketNumber}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY
      },
      body: JSON.stringify({
        action: 'ADD_COMMENT',
        comment: 'This is a test comment added via the omnichannel API'
      })
    });

    const data = await response.json();

    if (response.ok && data.success) {
      console.log('✅ Comment added successfully!');
      console.log('Comment ID:', data.result?.comment?.id);
      console.log('Comment Content:', data.result?.comment?.content);
      console.log('');
      return true;
    } else {
      console.error('❌ Failed to add comment:');
      console.error('Status:', response.status);
      console.error('Error:', data);
      return false;
    }
  } catch (error) {
    console.error('❌ Error adding comment:', error);
    return false;
  }
}

async function testBatchStatusCheck(channelReferenceId: string) {
  console.log('📋 Testing Batch Status Check...');
  console.log('=====================================');

  try {
    const response = await fetch(`${API_BASE_URL}/tickets?channelReferenceId=${channelReferenceId}`, {
      method: 'GET',
      headers: {
        'X-API-Key': API_KEY
      }
    });

    const data = await response.json();

    if (response.ok) {
      console.log('✅ Batch status check successful!');
      console.log('Response:', JSON.stringify(data, null, 2));
      console.log('');
      return true;
    } else {
      console.error('❌ Failed to check batch status:');
      console.error('Status:', response.status);
      console.error('Error:', data);
      return false;
    }
  } catch (error) {
    console.error('❌ Error in batch status check:', error);
    return false;
  }
}

async function runAllTests() {
  console.log('');
  console.log('🧪 Starting Omnichannel API Tests');
  console.log('=====================================');
  console.log(`API Base URL: ${API_BASE_URL}`);
  console.log(`API Key: ${API_KEY.substring(0, 20)}...`);
  console.log('');

  // Test 1: Create a ticket
  const ticketNumber = await testCreateTicket();

  if (ticketNumber) {
    // Wait a bit for the ticket to be fully processed
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Test 2: Get ticket status
    await testGetTicketStatus(ticketNumber);

    // Test 3: Add a comment
    await testAddComment(ticketNumber);

    // Test 4: Batch status check
    await testBatchStatusCheck(testTicketData.channelReferenceId);

    console.log('');
    console.log('✅ All tests completed!');
    console.log('=====================================');
    console.log('Summary:');
    console.log(`- Created ticket: ${ticketNumber}`);
    console.log(`- Channel Reference: ${testTicketData.channelReferenceId}`);
    console.log('');
  } else {
    console.log('');
    console.log('❌ Tests failed - could not create initial ticket');
    console.log('');
  }
}

// Run the tests
runAllTests().catch(console.error);