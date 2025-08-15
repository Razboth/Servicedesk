// Simple test to verify logout redirect configuration
require('dotenv').config();

async function testLogoutRedirect() {
  console.log('🔍 Testing logout redirect configuration...');
  
  // Check environment variables
  console.log('\n📋 Environment Variables:');
  console.log(`   NEXTAUTH_URL: ${process.env.NEXTAUTH_URL || 'Not set'}`);
  console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'Not set'}`);
  
  // Check next.config.js env settings
  try {
    const nextConfig = require('./next.config.js');
    console.log('\n⚙️  Next.js Config Environment:');
    console.log(`   NEXTAUTH_URL: ${nextConfig.env?.NEXTAUTH_URL || 'Not set in config'}`);
    
    // Test the actual URL that would be used
    const expectedUrl = process.env.NEXTAUTH_URL || nextConfig.env?.NEXTAUTH_URL || 'http://localhost:3000';
    console.log(`\n✅ Expected logout redirect base URL: ${expectedUrl}`);
    console.log(`   Full logout redirect URL: ${expectedUrl}/auth/signin`);
    
    // Verify this matches the current server
    if (expectedUrl.includes('localhost:3000')) {
      console.log('\n✅ Configuration is correct for localhost:3000');
    } else if (expectedUrl.includes('localhost:3002')) {
      console.log('\n❌ Configuration still points to localhost:3002 - needs fixing');
    } else {
      console.log(`\n⚠️  Configuration points to: ${expectedUrl}`);
    }
  } catch (error) {
    console.log('\n❌ Error reading next.config.js:', error.message);
  }
  
  console.log('\n🧪 Test completed!');
}

testLogoutRedirect().catch(console.error);