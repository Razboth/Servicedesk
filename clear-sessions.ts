import { cookies } from 'next/headers';

async function clearAllSessions() {
  console.log('🔒 Clearing all authentication sessions...');
  
  // List of potential cookie names to clear
  const cookieNames = [
    'next-auth.session-token',
    '__Secure-next-auth.session-token',
    'bsg-auth.session-token',
    '__Secure-bsg-auth.session-token',
    'bsg-auth.session-token-3000',
    'bsg-auth.session-token-3002',
    '__Secure-bsg-auth.session-token-3000',
    '__Secure-bsg-auth.session-token-3002',
    'next-auth.callback-url',
    'next-auth.csrf-token',
    'bsg-auth.callback-url',
    'bsg-auth.csrf-token',
  ];
  
  console.log('Cookie names to clear:', cookieNames);
  console.log('\n📝 Instructions to clear sessions:');
  console.log('1. In your browser, open Developer Tools (F12)');
  console.log('2. Go to Application/Storage tab');
  console.log('3. Click on Cookies for your domain');
  console.log('4. Delete all auth-related cookies listed above');
  console.log('5. Or use Clear Site Data option');
  console.log('\nAlternatively, use incognito/private browsing mode for testing');
}

clearAllSessions();
