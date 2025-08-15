async function testATMIncident() {
  const payload = {
    "atmCode": "0136",
    "type": "NETWORK_DOWN", 
    "severity": "HIGH",
    "description": "ATM connection timeout detected at test time. No response from terminal for 5 minutes.",
    "externalReferenceId": "TEST-ATM-0136-20250806-091500",
    "metrics": {
      "lastResponseTime": 5000,
      "connectionAttempts": 5,
      "networkLatency": "timeout",
      "errorCode": "CONN_TIMEOUT"
    },
    "autoCreateTicket": true
  };

  try {
    console.log('🧪 Testing ATM incident creation...');
    console.log('Payload:', JSON.stringify(payload, null, 2));

    const response = await fetch('http://localhost:3000/api/monitoring/atms/incidents', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    
    console.log('📊 Response Status:', response.status);
    console.log('📊 Response Body:', JSON.stringify(result, null, 2));

    if (response.ok) {
      console.log('✅ Test successful!');
      if (result.incident?.ticket) {
        console.log(`🎫 Ticket created: ${result.incident.ticket.ticketNumber}`);
      } else {
        console.log('⚠️  No ticket was created (ticket: null)');
      }
    } else {
      console.log('❌ Test failed:', result.error);
    }
  } catch (error) {
    console.error('❌ Test error:', error.message);
  }
}

// Run the test
testATMIncident();