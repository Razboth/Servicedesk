import fetch from 'node-fetch';

// Configuration
const API_BASE_URL = 'http://localhost:3002/api/omnichannel';
const API_KEY = process.argv[2]; // Pass API key as command line argument

if (!API_KEY) {
  console.error('Please provide an API key as command line argument');
  console.error('Usage: npx tsx scripts/test-omnichannel-claim.ts <API_KEY>');
  process.exit(1);
}

// Test data for different claim types
const claimExamples = [
  {
    name: 'ATM PEMBELIAN',
    data: {
      channel: 'WHATSAPP',
      channelReferenceId: `WA-CLAIM-${Date.now()}-1`,
      serviceType: 'CLAIM',

      customer: {
        name: 'Ahmad Santoso',
        email: 'ahmad.santoso@example.com',
        phone: '+6281234567890',
        identifier: 'CIF123456',
        branchCode: '001'
      },

      ticket: {
        title: 'Klaim Transaksi ATM - Pembelian Pulsa',
        description: 'Saya melakukan pembelian pulsa melalui ATM tetapi pulsa tidak masuk dan saldo terpotong',
        priority: 'HIGH',
        category: 'SERVICE_REQUEST',

        metadata: {
          // Required claim fields
          namaNasabah: 'Ahmad Santoso',
          mediaTransaksi: 'ATM',
          jenisTransaksi: 'PEMBELIAN',
          nominal: 100000,
          nomorRekening: '1234567890',
          nomorKartu: '****1234',

          // Additional fields
          claimDate: new Date().toISOString(),
          claimReason: 'Pulsa tidak masuk tetapi saldo terpotong',
          atmId: 'ATM001',
          transactionId: `TRX-${Date.now()}`,
          referenceNumber: `REF-${Date.now()}`
        }
      }
    }
  },
  {
    name: 'BSGTouch TRANSFER',
    data: {
      channel: 'EMAIL',
      channelReferenceId: `EMAIL-CLAIM-${Date.now()}-2`,
      serviceType: 'CLAIM',

      customer: {
        name: 'Siti Rahayu',
        email: 'siti.rahayu@example.com',
        phone: '+6289876543210',
        identifier: 'CIF789012'
      },

      ticket: {
        description: 'Transfer melalui BSGTouch gagal tetapi saldo sudah terpotong',
        priority: 'HIGH',

        metadata: {
          mediaTransaksi: 'TOUCH',
          jenisTransaksi: 'TRANSFER',
          nominal: 5000000,
          nomorRekening: '9876543210',
          nomorKartu: '****5678',
          claimReason: 'Transfer gagal, saldo terpotong'
        }
      }
    }
  },
  {
    name: 'QRIS Payment',
    data: {
      channel: 'CHAT',
      channelReferenceId: `CHAT-CLAIM-${Date.now()}-3`,
      serviceType: 'CLAIM',

      customer: {
        name: 'Budi Pratama',
        email: 'budi@example.com'
      },

      ticket: {
        description: 'Pembayaran melalui QRIS gagal',
        metadata: {
          mediaTransaksi: 'QRIS',
          nominal: 250000,
          nomorRekening: '5555666677',
          transactionId: `QRIS-${Date.now()}`
        }
      }
    }
  },
  {
    name: 'SMS Banking PEMBAYARAN',
    data: {
      channel: 'SMS',
      channelReferenceId: `SMS-CLAIM-${Date.now()}-4`,
      serviceType: 'CLAIM',

      customer: {
        name: 'Dewi Lestari',
        phone: '+6281112223333'
      },

      ticket: {
        description: 'Pembayaran tagihan PLN via SMS Banking gagal',
        metadata: {
          mediaTransaksi: 'SMS',
          jenisTransaksi: 'PEMBAYARAN',
          nominal: 750000,
          nomorRekening: '9999888877'
        }
      }
    }
  }
];

async function testClaimCreation(claimData: any, claimName: string) {
  console.log(`\n🧪 Testing ${claimName}...`);
  console.log('=====================================');

  try {
    const response = await fetch(`${API_BASE_URL}/tickets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY
      },
      body: JSON.stringify(claimData)
    });

    const data = await response.json();

    if (response.ok && data.success) {
      console.log(`✅ ${claimName} ticket created successfully!`);
      console.log(`   Main Ticket: #${data.ticketNumber}`);
      console.log(`   Status: ${data.status}`);
      console.log(`   Tracking URL: ${data.trackingUrl}`);

      // Check if KLAIM-OMNI was created (we'll see it in logs)
      const mediaType = claimData.ticket.metadata?.mediaTransaksi || 'Unknown';
      const transType = claimData.ticket.metadata?.jenisTransaksi || '';
      console.log(`   Expected KLAIM-OMNI: KLAIM - OMNI - ${mediaType}${transType ? ' - ' + transType : ''}`);

      return { success: true, ticketNumber: data.ticketNumber };
    } else {
      console.error(`❌ Failed to create ${claimName} ticket:`);
      console.error(`   Status: ${response.status}`);
      console.error(`   Error:`, data.error || data);
      if (data.errors) {
        console.error(`   Validation Errors:`, data.errors);
      }
      return { success: false, error: data.error };
    }
  } catch (error) {
    console.error(`❌ Error creating ${claimName} ticket:`, error);
    return { success: false, error: error };
  }
}

async function runAllTests() {
  console.log('');
  console.log('🧪 Starting Omnichannel CLAIM Tests');
  console.log('=====================================');
  console.log(`API Base URL: ${API_BASE_URL}`);
  console.log(`API Key: ${API_KEY.substring(0, 20)}...`);
  console.log('');
  console.log('This will test the automatic creation of KLAIM-OMNI tickets');
  console.log('when CLAIM service type is used via the omnichannel API.');

  const results = [];

  for (const example of claimExamples) {
    const result = await testClaimCreation(example.data, example.name);
    results.push({ name: example.name, ...result });

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
    const ticket = result.ticketNumber ? ` (Ticket #${result.ticketNumber})` : '';
    console.log(`  ${icon} ${result.name}${ticket}`);
  });

  console.log('\n💡 Note: Check the server logs to verify KLAIM-OMNI tickets were created.');
  console.log('Each claim should generate two tickets:');
  console.log('  1. The main omnichannel ticket');
  console.log('  2. A KLAIM-OMNI ticket in the Transaction Claims category');
}

// Run the tests
runAllTests().catch(console.error);