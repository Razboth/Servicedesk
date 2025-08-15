#!/usr/bin/env node

// Simple test without database dependency
const NetworkChecker = require('./lib/network-checker');

// Simple console logger for testing
const logger = {
  info: console.log,
  debug: console.log,
  error: console.error,
  warn: console.warn
};

async function simpleTest() {
  console.log('🚀 Starting Network Monitor Simple Test');
  console.log('=====================================');
  
  try {
    const checker = new NetworkChecker(logger);
    
    // Test with common public DNS servers
    const testHosts = [
      '8.8.8.8',     // Google DNS
      '1.1.1.1',     // Cloudflare DNS
      '192.168.1.1', // Common router IP (might not respond)
    ];
    
    console.log('Testing network connectivity...\n');
    
    for (const host of testHosts) {
      console.log(`Testing ${host}:`);
      console.log('-'.repeat(20));
      
      try {
        const result = await checker.pingHost(host);
        console.log(`✅ Status: ${result.status}`);
        console.log(`📡 Alive: ${result.alive}`);
        console.log(`⏱️  Response Time: ${result.responseTime || 'N/A'}ms`);
        console.log(`📊 Packet Loss: ${result.packetLoss || 0}%`);
        
        if (result.errorMessage) {
          console.log(`❌ Error: ${result.errorMessage}`);
        }
        
      } catch (error) {
        console.log(`❌ Error testing ${host}: ${error.message}`);
      }
      
      console.log(''); // Empty line
    }
    
    console.log('🎉 Simple test completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Ensure PostgreSQL database is running');
    console.log('2. Run database migration: npx prisma db push');
    console.log('3. Configure IP addresses in database');
    console.log('4. Run full test: node monitor.js test');
    
  } catch (error) {
    console.error('❌ Simple test failed:', error.message);
    console.error('\nTroubleshooting:');
    console.error('1. Install dependencies: npm install');
    console.error('2. Check network connectivity');
    console.error('3. Verify ping command is available');
    
    process.exit(1);
  }
}

simpleTest();