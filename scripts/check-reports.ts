import puppeteer from 'puppeteer';

const BASE_URL = 'http://localhost:3000';

// Report URLs to check
const reportUrls = [
  { path: '/reports', name: 'Reports Dashboard' },
  { path: '/reports/tickets/all-tickets', name: 'All Tickets Master Report' },
  { path: '/reports/operations/daily', name: 'Daily Operations Report' },
  { path: '/reports/services/performance', name: 'Service Performance Analytics' },
  { path: '/reports/services/usage', name: 'Service Usage Insights' },
  { path: '/reports/services/sla-compliance', name: 'Service SLA Compliance' },
  { path: '/reports/technician/performance', name: 'Technician Performance' },
  { path: '/reports/technician/technical-issues', name: 'Technical Issues' },
  { path: '/reports/manager/branch-operations', name: 'Branch Operations' },
  { path: '/reports/admin/service-catalog', name: 'Service Catalog' },
  { path: '/reports/admin/sla-performance', name: 'SLA Performance' },
  { path: '/reports/analytics/requests-by-category', name: 'Requests by Category' },
  { path: '/reports/business/customer-experience', name: 'Customer Experience' },
  { path: '/reports/compliance/security', name: 'Security Compliance' },
  { path: '/reports/infrastructure/atm-intelligence', name: 'ATM Intelligence' }
];

async function checkReports() {
  console.log('🔍 Starting Report Pages Check...\n');
  
  const browser = await puppeteer.launch({
    headless: false, // Keep browser visible
    defaultViewport: { width: 1280, height: 800 },
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  try {
    
    // First, sign in
    console.log('📝 Navigating to login page...');
    await page.goto(`${BASE_URL}/auth/signin`, { 
      waitUntil: 'networkidle0',
      timeout: 30000 
    });
    
    // Wait a bit for page to fully load
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check if we can find the email input with various selectors
    console.log('Looking for login form...');
    
    try {
      // Try to wait for the username input (not email)
      await page.waitForSelector('input[name="username"], input#username', { 
        timeout: 5000 
      });
      
      // Fill in login credentials
      const usernameSelector = await page.$('input[name="username"], input#username');
      const passwordSelector = await page.$('input[type="password"], input[name="password"], input#password');
      
      if (usernameSelector && passwordSelector) {
        console.log('Found login form, entering credentials...');
        await usernameSelector.type('superadmin');
        await passwordSelector.type('password123');
        
        // Find and click submit button
        const submitButton = await page.$('button[type="submit"]');
        if (submitButton) {
          await submitButton.click();
          console.log('Clicked login button, waiting for navigation...');
        } else {
          // Try pressing Enter
          await passwordSelector.press('Enter');
          console.log('Pressed Enter to submit...');
        }
        
        // Wait for navigation after login
        await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 10000 });
        console.log('✅ Logged in successfully\n');
      } else {
        console.log('❌ Could not find username or password input fields');
        console.log('Page URL:', page.url());
        
        // Take a screenshot to see what's on the page
        await page.screenshot({ path: 'login-page-debug.png' });
        console.log('Screenshot saved as login-page-debug.png');
        
        throw new Error('Login form not found');
      }
    } catch (error) {
      console.log('❌ Error finding login form:', error);
      
      // Take a screenshot for debugging
      await page.screenshot({ path: 'login-error-debug.png' });
      console.log('Debug screenshot saved as login-error-debug.png');
      
      // Log the current page content for debugging
      const pageTitle = await page.title();
      console.log('Page title:', pageTitle);
      console.log('Current URL:', page.url());
      
      throw error;
    }
    
    const results: { report: string; status: string; error?: string }[] = [];
    
    // Check each report
    for (const report of reportUrls) {
      console.log(`Checking: ${report.name}...`);
      
      try {
        const response = await page.goto(`${BASE_URL}${report.path}`, {
          waitUntil: 'networkidle0',
          timeout: 30000
        });
        
        if (!response) {
          results.push({
            report: report.name,
            status: '❌ Failed',
            error: 'No response'
          });
          continue;
        }
        
        const status = response.status();
        
        if (status === 200) {
          // Check for error messages on the page
          const hasError = await page.evaluate(() => {
            const errorTexts = ['Error', 'Failed to fetch', '500', '404'];
            const bodyText = document.body.innerText;
            return errorTexts.some(error => bodyText.includes(error));
          });
          
          // Check if page has content
          const hasContent = await page.evaluate(() => {
            const mainContent = document.querySelector('main') || document.querySelector('[role="main"]') || document.body;
            return mainContent && mainContent.innerText.trim().length > 100;
          });
          
          if (hasError) {
            results.push({
              report: report.name,
              status: '⚠️ Has Errors',
              error: 'Page loaded but contains error messages'
            });
          } else if (!hasContent) {
            results.push({
              report: report.name,
              status: '⚠️ No Content',
              error: 'Page loaded but has minimal content'
            });
          } else {
            results.push({
              report: report.name,
              status: '✅ OK'
            });
            
            // Take a screenshot of successful pages
            await page.screenshot({
              path: `screenshots/report-${report.path.replace(/\//g, '-')}.png`,
              fullPage: false
            });
          }
        } else {
          results.push({
            report: report.name,
            status: `❌ HTTP ${status}`,
            error: `Server returned status ${status}`
          });
        }
        
        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        results.push({
          report: report.name,
          status: '❌ Error',
          error: (error as Error).message
        });
      }
    }
    
    // Print summary
    console.log('\n📊 REPORT CHECK SUMMARY:');
    console.log('========================\n');
    
    const successCount = results.filter(r => r.status.includes('OK')).length;
    const warningCount = results.filter(r => r.status.includes('⚠️')).length;
    const failureCount = results.filter(r => r.status.includes('❌')).length;
    
    console.log(`✅ Successful: ${successCount}/${reportUrls.length}`);
    console.log(`⚠️ Warnings: ${warningCount}/${reportUrls.length}`);
    console.log(`❌ Failures: ${failureCount}/${reportUrls.length}\n`);
    
    console.log('DETAILED RESULTS:');
    console.log('-----------------');
    results.forEach(result => {
      console.log(`${result.status} ${result.report}`);
      if (result.error) {
        console.log(`   └─ ${result.error}`);
      }
    });
    
    // Check for data in reports
    console.log('\n📈 CHECKING FOR DATA:');
    console.log('---------------------');
    
    // Go to a report with data visualization
    await page.goto(`${BASE_URL}/reports/services/performance`, { waitUntil: 'networkidle0' });
    
    // Check for charts/data
    const hasCharts = await page.evaluate(() => {
      return document.querySelector('svg') !== null || 
             document.querySelector('canvas') !== null ||
             document.querySelector('[class*="recharts"]') !== null;
    });
    
    const hasTable = await page.evaluate(() => {
      return document.querySelector('table') !== null;
    });
    
    console.log(`Charts present: ${hasCharts ? '✅ Yes' : '❌ No'}`);
    console.log(`Tables present: ${hasTable ? '✅ Yes' : '❌ No'}`);
    
  } catch (error) {
    console.error('❌ Error during report check:', error);
  } finally {
    // Keep browser open for 10 seconds to see results
    console.log('\n⏰ Keeping browser open for 10 seconds...');
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    await browser.close();
    console.log('\n✅ Report check completed!');
  }
}

// Create screenshots directory if it doesn't exist
import fs from 'fs';
if (!fs.existsSync('screenshots')) {
  fs.mkdirSync('screenshots');
}

// Run the check
checkReports()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });