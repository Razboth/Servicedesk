// Test script for ATM incident creation with the new service
const http = require('http');

// Test data for ATM incident
const incidentData = {
  atmCode: '0136',  // Using actual ATM code from database
  type: 'NETWORK_DOWN',
  severity: 'HIGH',
  description: 'ATM network connectivity lost. Unable to process transactions.',
  externalReferenceId: 'MON-2025-001',
  autoCreateTicket: true,
  metrics: {
    downtime: '15 minutes',
    lastPing: new Date().toISOString(),
    errorCode: 'NET_TIMEOUT'
  }
};

// Test POST request to create incident
const postData = JSON.stringify(incidentData);

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/monitoring/atms/incidents',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

console.log('Testing ATM Incident Creation API');
console.log('==================================\n');
console.log('Endpoint: POST http://localhost:3000/api/monitoring/atms/incidents');
console.log('\nRequest Data:');
console.log(JSON.stringify(incidentData, null, 2));
console.log('\nMaking POST request...\n');

const req = http.request(options, (res) => {
  console.log(`Status Code: ${res.statusCode}`);
  console.log(`Status Message: ${res.statusMessage}`);
  
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('\nResponse:');
    
    // Check if response is JSON
    if (res.headers['content-type']?.includes('application/json')) {
      try {
        const json = JSON.parse(data);
        console.log(JSON.stringify(json, null, 2));
        
        if (json.success) {
          console.log('\n✅ ATM Incident created successfully!');
          if (json.incident?.ticket) {
            console.log(`📋 Ticket Number: ${json.incident.ticket.ticketNumber}`);
            console.log(`🎫 Ticket ID: ${json.incident.ticket.id}`);
            console.log(`📝 Ticket Title: ${json.incident.ticket.title}`);
          }
        } else {
          console.log('\n❌ Failed to create incident');
        }
      } catch (e) {
        console.log('Failed to parse JSON:', e.message);
        console.log('Raw response:', data);
      }
    } else {
      console.log('Raw response:', data);
    }
    
    // Test GET request to fetch incidents
    console.log('\n\n==================================');
    console.log('Testing GET incidents endpoint...');
    console.log('==================================\n');
    
    const getOptions = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/monitoring/atms/incidents?limit=5',
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    const getReq = http.request(getOptions, (getRes) => {
      console.log(`Status Code: ${getRes.statusCode}`);
      
      let getData = '';
      
      getRes.on('data', (chunk) => {
        getData += chunk;
      });
      
      getRes.on('end', () => {
        if (getRes.headers['content-type']?.includes('application/json')) {
          try {
            const json = JSON.parse(getData);
            console.log('\nRecent Incidents:');
            if (json.incidents && json.incidents.length > 0) {
              json.incidents.forEach((incident, idx) => {
                console.log(`\n${idx + 1}. ATM: ${incident.atmCode}`);
                console.log(`   Type: ${incident.type}`);
                console.log(`   Severity: ${incident.severity}`);
                console.log(`   Created: ${incident.createdAt}`);
                console.log(`   Ticket ID: ${incident.ticketId || 'No ticket'}`);
              });
            } else {
              console.log('No incidents found');
            }
          } catch (e) {
            console.log('Failed to parse response:', e.message);
          }
        }
      });
    });
    
    getReq.on('error', (e) => {
      console.error(`GET request error: ${e.message}`);
    });
    
    getReq.end();
  });
});

req.on('error', (e) => {
  console.error(`Problem with request: ${e.message}`);
});

// Write data to request body
req.write(postData);
req.end();