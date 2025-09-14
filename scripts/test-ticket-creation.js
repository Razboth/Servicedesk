require('dotenv').config();
const fetch = require('node-fetch');

async function testTicketCreation() {
  try {
    console.log('🎯 Testing ticket creation...\n');

    // Test data
    const ticketData = {
      title: 'Test Ticket - Email Notification Test',
      description: 'This is a test ticket to verify email notifications are working',
      serviceId: 'cmekrqijx00p5hlus9ba8gmop',
      priority: 'MEDIUM',
      category: 'SERVICE_REQUEST',
      issueClassification: 'HUMAN_ERROR',
      categoryId: 'cmekrqi49001uhlus03cgs3me',
      subcategoryId: 'cmekrqi660057hlusiuavjsxv',
      itemId: 'cmekrqib600dxhlus1ifhyt6o',
      branchId: 'cmeuqjejg00bl28904yzqos50',
      fieldValues: [],
      attachments: [],
      isConfidential: false
    };

    // Get session (you'll need to replace this with a valid session token)
    console.log('📋 Ticket data:', JSON.stringify(ticketData, null, 2));
    console.log('\n⚠️  Note: This test requires a valid session.');
    console.log('Please create the ticket through the UI to test with authentication.\n');

    // For testing without authentication, we can check if the email service itself works
    console.log('Testing email service configuration...');
    const { verifyEmailConfiguration } = require('../lib/services/email.service');
    const emailConfigured = await verifyEmailConfiguration();

    if (emailConfigured) {
      console.log('✅ Email service is properly configured');
    } else {
      console.log('❌ Email service is not configured');
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testTicketCreation();