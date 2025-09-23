import fetch from 'node-fetch';

// Configuration
const API_BASE_URL = 'http://localhost:3002/api/omnichannel/claims';
const API_KEY = process.argv[2]; // Pass API key as command line argument

if (!API_KEY) {
  console.error('Please provide an API key as command line argument');
  console.error('Usage: npx tsx scripts/test-simplified-claim-api.ts <API_KEY>');
  process.exit(1);
}

// Test data for different claim types
const claimExamples = [
  {
    name: 'ATM PEMBELIAN',
    data: {
      namaNasabah: 'Ahmad Santoso',
      mediaTransaksi: 'ATM',
      jenisTransaksi: 'PEMBELIAN',
      nominal: 100000,
      nomorRekening: '1234567890',
      nomorKartu: '****1234',
      claimReason: 'Pulsa tidak masuk tetapi saldo terpotong',
      atmId: 'ATM001',
      transactionId: `TRX-${Date.now()}`,
      referenceNumber: `REF-${Date.now()}`,
      description: 'Saya melakukan pembelian pulsa melalui ATM tetapi pulsa tidak masuk dan saldo terpotong'
    }
  },
  {
    name: 'BSGTouch TRANSFER',
    data: {
      namaNasabah: 'Siti Rahayu',
      mediaTransaksi: 'TOUCH',
      jenisTransaksi: 'TRANSFER',
      nominal: 5000000,
      nomorRekening: '9876543210',
      nomorKartu: '****5678',
      claimReason: 'Transfer gagal, saldo terpotong',
      description: 'Transfer melalui BSGTouch gagal tetapi saldo sudah terpotong'
    }
  },
  {
    name: 'QRIS Payment',
    data: {
      namaNasabah: 'Budi Pratama',
      mediaTransaksi: 'QRIS',
      nominal: 250000,
      nomorRekening: '5555666677',
      transactionId: `QRIS-${Date.now()}`,
      description: 'Pembayaran melalui QRIS gagal'
    }
  },
  {
    name: 'SMS Banking PEMBAYARAN',
    data: {
      namaNasabah: 'Dewi Lestari',
      mediaTransaksi: 'SMS',
      jenisTransaksi: 'PEMBAYARAN',
      nominal: 750000,
      nomorRekening: '9999888877',
      description: 'Pembayaran tagihan PLN via SMS Banking gagal'
    }
  },
  {
    name: 'Debit Card',
    data: {
      namaNasabah: 'Andi Wijaya',
      mediaTransaksi: 'DEBIT',
      nominal: 1500000,
      nomorRekening: '1111222233',
      nomorKartu: '****9876',
      description: 'Transaksi debit card di merchant gagal'
    }
  }
];

async function testClaimCreation(claimData: any, claimName: string) {
  console.log(`\n🧪 Testing ${claimName}...`);
  console.log('=====================================');

  try {
    const response = await fetch(API_BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY
      },
      body: JSON.stringify(claimData)
    });

    const data = await response.json();

    if (response.ok && data.success) {
      console.log(`✅ ${claimName} claim created successfully!`);
      console.log(`   Main Ticket: #${data.ticketNumber}`);
      console.log(`   KLAIM-OMNI Ticket: #${data.klaimOmniTicket}`);
      console.log(`   Status: ${data.status}`);
      console.log(`   Tracking URL: ${data.trackingUrl}`);

      // Expected KLAIM-OMNI title
      const mediaType = claimData.mediaTransaksi;
      const transType = claimData.jenisTransaksi || '';
      console.log(`   Expected Title: KLAIM - OMNI - ${mediaType}${transType ? ' - ' + transType : ''}`);

      return { success: true, ticketNumber: data.ticketNumber, klaimOmniTicket: data.klaimOmniTicket };
    } else {
      console.error(`❌ Failed to create ${claimName} claim:`);
      console.error(`   Status: ${response.status}`);
      console.error(`   Error:`, data.error || data);
      if (data.errors) {
        console.error(`   Validation Errors:`, data.errors);
      }
      return { success: false, error: data.error };
    }
  } catch (error) {
    console.error(`❌ Error creating ${claimName} claim:`, error);
    return { success: false, error: error };
  }
}

async function testGetClaimStatus(ticketNumber: string) {
  console.log(`\n📊 Fetching status for ticket #${ticketNumber}...`);

  try {
    const response = await fetch(`${API_BASE_URL}/${ticketNumber}`, {
      method: 'GET',
      headers: {
        'X-API-Key': API_KEY
      }
    });

    const data = await response.json();

    if (response.ok && data.success) {
      console.log(`   Status: ${data.status}`);
      console.log(`   Priority: ${data.priority}`);
      console.log(`   Created: ${new Date(data.createdAt).toLocaleString()}`);
      if (data.sla) {
        console.log(`   SLA Resolution: ${new Date(data.sla.resolutionDeadline).toLocaleString()}`);
      }
      return true;
    } else {
      console.error(`   Failed to fetch status: ${data.error}`);
      return false;
    }
  } catch (error) {
    console.error(`   Error fetching status:`, error);
    return false;
  }
}

async function runAllTests() {
  console.log('');
  console.log('🧪 Starting Simplified Claim API Tests');
  console.log('=====================================');
  console.log(`API Base URL: ${API_BASE_URL}`);
  console.log(`API Key: ${API_KEY.substring(0, 20)}...`);
  console.log('');
  console.log('This tests the simplified claim API that only requires claim data');
  console.log('without channel, customer, or service type information.');

  const results = [];

  for (const example of claimExamples) {
    const result = await testClaimCreation(example.data, example.name);
    results.push({ name: example.name, ...result });

    // Test GET status for successful tickets
    if (result.success && result.ticketNumber) {
      await testGetClaimStatus(result.ticketNumber);
    }

    // Wait a bit between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('\n=====================================');
  console.log('📊 Test Summary');
  console.log('=====================================');

  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  console.log(`Total Tests: ${results.length}`);
  console.log(`✅ Successful: ${successful}`);
  console.log(`❌ Failed: ${failed}`);
  console.log('');

  console.log('Test Results:');
  results.forEach(result => {
    const icon = result.success ? '✅' : '❌';
    const tickets = result.ticketNumber ?
      ` (Main #${result.ticketNumber}, KLAIM-OMNI #${result.klaimOmniTicket})` : '';
    console.log(`  ${icon} ${result.name}${tickets}`);
  });

  console.log('\n💡 Note: Each claim creates two tickets:');
  console.log('  1. Main claim ticket');
  console.log('  2. KLAIM-OMNI ticket in Transaction Claims category');
}

// Run the tests
runAllTests().catch(console.error);