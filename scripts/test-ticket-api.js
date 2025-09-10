// Test the ticket status endpoint
const https = require('https');

// Ignore self-signed certificate errors for local testing
process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0;

const ticketNumber = 'TKT-2025-001107';

// Test GET request
const options = {
  hostname: 'localhost',
  port: 443,
  path: `/api/tickets/by-number/${ticketNumber}/status`,
  method: 'GET',
  headers: {
    'Content-Type': 'application/json'
  }
};

console.log(`Testing API endpoint: https://localhost:443/api/tickets/by-number/${ticketNumber}/status`);
console.log('Making GET request...\n');

const req = https.request(options, (res) => {
  console.log(`Status Code: ${res.statusCode}`);
  console.log(`Status Message: ${res.statusMessage}`);
  console.log('Headers:', res.headers);
  
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('\nResponse Body:');
    
    // Check if response is JSON or HTML
    if (res.headers['content-type']?.includes('application/json')) {
      try {
        const json = JSON.parse(data);
        console.log(JSON.stringify(json, null, 2));
      } catch (e) {
        console.log('Failed to parse JSON:', e.message);
        console.log('Raw response:', data.substring(0, 500));
      }
    } else if (res.headers['content-type']?.includes('text/html')) {
      console.log('Received HTML response (likely 404 or error page)');
      console.log('First 200 chars:', data.substring(0, 200));
      console.log('\n❌ The endpoint is not recognized. This usually means:');
      console.log('1. The route file is in the wrong location');
      console.log('2. The app needs to be rebuilt');
      console.log('3. There\'s a syntax error in the route file');
    } else {
      console.log('Raw response:', data);
    }
  });
});

req.on('error', (e) => {
  console.error(`Problem with request: ${e.message}`);
});

req.end();