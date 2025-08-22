const { chromium } = require('playwright');

async function debugModules() {
  const browser = await chromium.launch({ headless: false, slowMo: 1000 });
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on('console', msg => {
    console.log('🖥️ CONSOLE:', msg.type(), msg.text());
  });

  try {
    console.log('🔍 Debugging Module Selection...\n');
    
    await page.goto('http://localhost:3005/reports/builder');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Fill title first
    const titleInput = await page.locator('input[type="text"]').first();
    await titleInput.fill('Debug Test');
    
    // Select TABULAR first
    console.log('Selecting TABULAR report type...');
    await page.locator('label:has-text("TABULAR")').click();
    await page.waitForTimeout(1000);

    // Look for any text containing module names
    console.log('\n🔍 Searching for module-related text...');
    const moduleTexts = ['TICKETS', 'TIME_SPENT', 'USERS', 'BRANCHES', 'SERVICES', 'ticket', 'user', 'branch', 'service'];
    
    for (const text of moduleTexts) {
      const elements = await page.locator(`text=${text}`).all();
      if (elements.length > 0) {
        console.log(`✅ Found "${text}" - ${elements.length} occurrences`);
      }
    }

    // Look for all radio inputs
    console.log('\n🔘 All radio inputs:');
    const radios = await page.locator('input[type="radio"]').all();
    for (let i = 0; i < radios.length; i++) {
      const name = await radios[i].getAttribute('name');
      const value = await radios[i].getAttribute('value');
      const id = await radios[i].getAttribute('id');
      console.log(`  Radio ${i}: name="${name}" value="${value}" id="${id}"`);
    }

    // Look for all labels
    console.log('\n🏷️ All label elements:');
    const labels = await page.locator('label').all();
    for (let i = 0; i < Math.min(labels.length, 20); i++) {
      const text = await labels[i].textContent();
      const htmlFor = await labels[i].getAttribute('for');
      console.log(`  Label ${i}: "${text}" for="${htmlFor}"`);
    }

    // Check the page HTML structure around forms
    console.log('\n📄 Form structures:');
    const forms = await page.locator('form').all();
    for (let i = 0; i < forms.length; i++) {
      const formHtml = await forms[i].innerHTML();
      console.log(`Form ${i} HTML (first 200 chars):`, formHtml.substring(0, 200));
    }

    // Try different report types to see if modules appear
    console.log('\n🔄 Testing different report types...');
    const types = ['MATRIX', 'METRICS', 'QUERY'];
    
    for (const type of types) {
      console.log(`\nTrying ${type}...`);
      await page.locator(`label:has-text("${type}")`).click();
      await page.waitForTimeout(1500);
      
      // Check for any new elements
      const allText = await page.textContent('body');
      const hasTickets = allText.includes('TICKETS') || allText.includes('tickets');
      const hasUsers = allText.includes('USERS') || allText.includes('users');
      console.log(`  Contains TICKETS: ${hasTickets}`);
      console.log(`  Contains USERS: ${hasUsers}`);
    }

    // Take screenshot
    await page.screenshot({ path: 'debug-modules.png', fullPage: true });
    console.log('\n📸 Screenshot saved as debug-modules.png');

  } catch (error) {
    console.error('❌ Debug failed:', error);
  } finally {
    await page.waitForTimeout(3000);
    await browser.close();
  }
}

debugModules();