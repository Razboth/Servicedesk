// Test ManageEngine ServiceDesk Plus Connection
const https = require('https');
const http = require('http');

// Configuration
const config = {
  baseUrl: 'https://127.0.0.1:8081',
  apiKey: process.argv[2] || '', // Pass API key as command line argument
  skipSSLVerification: true
};

if (!config.apiKey) {
  console.log('Usage: node scripts/test-manageengine-connection.js YOUR_API_KEY');
  console.log('\nTo get your API key from ManageEngine:');
  console.log('1. Login to ServiceDesk Plus as administrator');
  console.log('2. Go to Admin > Technicians');
  console.log('3. Edit a technician account');
  console.log('4. Generate API key under "API Key Authentication"');
  process.exit(1);
}

console.log('Testing ManageEngine ServiceDesk Plus Connection');
console.log('================================================\n');
console.log('Configuration:');
console.log('  Base URL:', config.baseUrl);
console.log('  API Key:', config.apiKey.substring(0, 10) + '...');
console.log('  Skip SSL:', config.skipSSLVerification);
console.log('');

// Parse URL
const url = new URL(config.baseUrl);
const isHttps = url.protocol === 'https:';

// Prepare request options
const options = {
  hostname: url.hostname,
  port: url.port || (isHttps ? 443 : 80),
  path: `/api/v3/requests?TECHNICIAN_KEY=${config.apiKey}&input_data=${encodeURIComponent(JSON.stringify({
    list_info: {
      row_count: 1,
      start_index: 1
    }
  }))}`,
  method: 'GET',
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json'
  }
};

// For self-signed certificates
if (isHttps && config.skipSSLVerification) {
  options.rejectUnauthorized = false;
  process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0;
}

console.log('Making request to:', `${config.baseUrl}/api/v3/requests`);
console.log('');

// Make request
const client = isHttps ? https : http;
const req = client.request(options, (res) => {
  console.log(`Status Code: ${res.statusCode}`);
  console.log(`Status Message: ${res.statusMessage}`);
  console.log('Headers:', JSON.stringify(res.headers, null, 2));
  console.log('');
  
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('Response Body:');
    
    try {
      const json = JSON.parse(data);
      console.log(JSON.stringify(json, null, 2));
      
      if (json.response_status) {
        console.log('\n=================================');
        // ManageEngine returns response_status as an array
        const statusObj = Array.isArray(json.response_status) ? json.response_status[0] : json.response_status;
        
        if (statusObj && statusObj.status_code === 2000) {
          console.log('✅ CONNECTION SUCCESSFUL!');
          console.log('=================================');
          console.log('Status:', statusObj.status);
          
          if (json.list_info) {
            console.log('Total Tickets Found:', json.list_info.row_count);
            console.log('Has More Pages:', json.list_info.has_more_rows ? 'Yes' : 'No');
          }
          
          if (json.requests && json.requests.length > 0) {
            console.log('\nSample Ticket:');
            console.log('  ID:', json.requests[0].id);
            console.log('  Subject:', json.requests[0].subject);
            console.log('  Status:', json.requests[0].status?.name);
          }
          
          console.log('\n✅ You can now use this API key in the migration dashboard.');
          console.log('   URL: https://127.0.0.1:8081');
          console.log('   API Key:', config.apiKey);
        } else {
          console.log('❌ CONNECTION FAILED');
          console.log('=================================');
          console.log('Error Code:', statusObj?.status_code);
          console.log('Error:', statusObj?.status);
          
          if (statusObj?.messages && statusObj.messages.length > 0) {
            console.log('Message:', statusObj.messages[0].message);
          }
          
          console.log('\nPossible issues:');
          console.log('1. Invalid API key');
          console.log('2. API key does not have required permissions');
          console.log('3. Technician account is disabled');
        }
      }
    } catch (e) {
      console.log('Raw response:', data);
      console.log('\n❌ Failed to parse response as JSON');
      console.log('This might indicate:');
      console.log('1. ServiceDesk Plus is not running');
      console.log('2. Wrong port or URL');
      console.log('3. ServiceDesk Plus API is not enabled');
    }
  });
});

req.on('error', (e) => {
  console.error('❌ Request failed:', e.message);
  console.log('\nPossible issues:');
  console.log('1. ServiceDesk Plus is not running on', config.baseUrl);
  console.log('2. Network/firewall blocking the connection');
  console.log('3. SSL certificate issues (if using HTTPS)');
  
  if (e.code === 'ECONNREFUSED') {
    console.log('\nConnection refused. Make sure ServiceDesk Plus is running.');
  } else if (e.code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE') {
    console.log('\nSSL certificate verification failed. This is expected for self-signed certificates.');
  }
});

req.end();