// Test script for ticket number-based API endpoints
// Shows how to use ticket numbers directly in URLs

const ticketNumber = 'TKT-2025-001107';

console.log('====================================');
console.log('TICKET STATUS API - Using Ticket Numbers');
console.log('====================================\n');

console.log(`📋 Working with ticket: ${ticketNumber}\n`);

console.log('1️⃣  GET TICKET STATUS');
console.log('─────────────────────');
console.log('URL: GET /api/tickets/by-number/TKT-2025-001107/status');
console.log('\nExample with cURL:');
console.log(`curl https://localhost:443/api/tickets/by-number/${ticketNumber}/status \\
  -H "Cookie: your-session-cookie"\n`);

console.log('Example with JavaScript:');
console.log(`fetch('/api/tickets/by-number/${ticketNumber}/status')
  .then(res => res.json())
  .then(data => console.log(data));\n`);

console.log('\n2️⃣  UPDATE SINGLE TICKET STATUS');
console.log('──────────────────────────────');
console.log('URL: PUT /api/tickets/by-number/TKT-2025-001107/status');
console.log('\nExample with cURL:');
console.log(`curl -X PUT https://localhost:443/api/tickets/by-number/${ticketNumber}/status \\
  -H "Content-Type: application/json" \\
  -H "Cookie: your-session-cookie" \\
  -d '{
    "status": "RESOLVED",
    "resolutionNotes": "Issue has been fixed"
  }'\n`);

console.log('Example with JavaScript:');
console.log(`fetch('/api/tickets/by-number/${ticketNumber}/status', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    status: 'RESOLVED',
    resolutionNotes: 'Issue has been fixed'
  })
});\n`);

console.log('Example with API Key:');
console.log(`curl -X PATCH https://servicedesk.banksulutgo.co.id/api/tickets/by-number/${ticketNumber}/status \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: your-api-key" \\
  -d '{
    "status": "RESOLVED",
    "reason": "Fixed via API"
  }'\n`);

console.log('\n3️⃣  BATCH UPDATE USING TICKET NUMBERS');
console.log('────────────────────────────────────');
console.log('URL: PUT /api/tickets/batch-status-by-number');
console.log('\nExample with multiple ticket numbers:');
console.log(`curl -X PUT https://localhost:443/api/tickets/batch-status-by-number \\
  -H "Content-Type: application/json" \\
  -H "Cookie: your-session-cookie" \\
  -d '{
    "ticketNumbers": ["TKT-2025-001107", "TKT-2025-001108", "TKT-2025-001109"],
    "status": "CLOSED",
    "reason": "Bulk closure of resolved tickets"
  }'\n`);

console.log('Example with JavaScript:');
console.log(`fetch('/api/tickets/batch-status-by-number', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    ticketNumbers: ['TKT-2025-001107', 'TKT-2025-001108'],
    status: 'IN_PROGRESS',
    reason: 'Starting work on these tickets'
  })
});\n`);

console.log('\n4️⃣  PYTHON EXAMPLE');
console.log('─────────────────');
console.log(`import requests

# Update single ticket
ticket_number = "${ticketNumber}"
url = f"https://servicedesk.banksulutgo.co.id/api/tickets/by-number/{ticket_number}/status"

headers = {
    "X-API-Key": "your-api-key",
    "Content-Type": "application/json"
}

data = {
    "status": "RESOLVED",
    "resolutionNotes": "Fixed the issue"
}

response = requests.patch(url, json=data, headers=headers)
print(response.json())\n`);

console.log('\n5️⃣  COMPARISON: OLD vs NEW');
console.log('──────────────────────────');
console.log('❌ OLD (using ticket ID):');
console.log('   /api/tickets/cmfdabjte00ai28cskg4q2hdl/status');
console.log('\n✅ NEW (using ticket number):');
console.log(`   /api/tickets/by-number/${ticketNumber}/status`);
console.log('\nThe new URL is much more user-friendly!');

console.log('\n====================================');
console.log('Available Status Values:');
console.log('- OPEN');
console.log('- PENDING');
console.log('- IN_PROGRESS');
console.log('- RESOLVED');
console.log('- CLOSED');
console.log('- CANCELLED');
console.log('====================================\n');