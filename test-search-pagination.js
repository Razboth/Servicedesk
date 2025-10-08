const fetch = require('node-fetch');

async function testSearchPagination() {
  const baseUrl = 'https://hd.bsg.id';

  // Test search queries
  const searches = [
    { query: '5640', description: 'Ticket number search' },
    { query: 'claim', description: 'Title/description search' },
    { query: 'atm', description: 'Service search' }
  ];

  console.log('=== Testing Search Pagination ===\n');

  for (const search of searches) {
    console.log(`\nTest: ${search.description}`);
    console.log(`Search query: "${search.query}"`);
    console.log('-'.repeat(50));

    try {
      // Test page 1
      const page1Url = `${baseUrl}/api/tickets?search=${encodeURIComponent(search.query)}&page=1&limit=10`;
      const page1Response = await fetch(page1Url, {
        headers: {
          'Cookie': 'next-auth.session-token=YOUR_SESSION_TOKEN' // You'll need to replace this
        }
      });
      const page1Data = await page1Response.json();

      console.log(`Page 1 Results:`);
      console.log(`  - Tickets returned: ${page1Data.tickets?.length || 0}`);
      console.log(`  - Total matching tickets: ${page1Data.total || 0}`);
      console.log(`  - Total pages: ${page1Data.pages || 0}`);

      if (page1Data.tickets?.length > 0) {
        console.log(`  - First ticket: #${page1Data.tickets[0].ticketNumber} - ${page1Data.tickets[0].title}`);
      }

      // Test page 2 if exists
      if (page1Data.pages > 1) {
        const page2Url = `${baseUrl}/api/tickets?search=${encodeURIComponent(search.query)}&page=2&limit=10`;
        const page2Response = await fetch(page2Url, {
          headers: {
            'Cookie': 'next-auth.session-token=YOUR_SESSION_TOKEN' // You'll need to replace this
          }
        });
        const page2Data = await page2Response.json();

        console.log(`\nPage 2 Results:`);
        console.log(`  - Tickets returned: ${page2Data.tickets?.length || 0}`);
        console.log(`  - Total should still be: ${page2Data.total || 0}`);

        if (page2Data.tickets?.length > 0) {
          console.log(`  - First ticket on page 2: #${page2Data.tickets[0].ticketNumber} - ${page2Data.tickets[0].title}`);
        }

        // Verify consistency
        if (page1Data.total === page2Data.total) {
          console.log(`  ✅ Total count is consistent across pages`);
        } else {
          console.log(`  ❌ Total count mismatch! Page 1: ${page1Data.total}, Page 2: ${page2Data.total}`);
        }
      }

    } catch (error) {
      console.log(`  ❌ Error: ${error.message}`);
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('Search pagination test completed!');
  console.log('\nExpected behavior:');
  console.log('1. Search results should be paginated correctly');
  console.log('2. Total count should reflect filtered results, not all tickets');
  console.log('3. Total count should remain consistent across all pages');
  console.log('4. Each page should show the correct subset of results');
}

// Note: To run this test properly, you'll need to:
// 1. Get a valid session token from your browser's cookies
// 2. Replace YOUR_SESSION_TOKEN with the actual token
// 3. Or modify the test to use proper authentication

console.log('This is a test template. Please add authentication to run actual tests.');
console.log('You can also test directly in the browser by:');
console.log('1. Going to https://hd.bsg.id/tickets');
console.log('2. Searching for "5640" or any other term');
console.log('3. Checking if pagination shows correct page counts');
console.log('4. Navigating through pages to verify results are consistent');