const { chromium } = require('playwright');

async function testReportBuilder() {
  const browser = await chromium.launch({ headless: false, slowMo: 1000 });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Enable console logging
  page.on('console', msg => {
    console.log('🖥️ BROWSER CONSOLE:', msg.type(), msg.text());
  });

  // Enable error logging
  page.on('pageerror', error => {
    console.log('❌ PAGE ERROR:', error.message);
  });

  try {
    console.log('🚀 Starting Report Builder Test...\n');

    // Navigate to the report builder
    console.log('📍 Navigating to http://localhost:3005/reports/builder');
    await page.goto('http://localhost:3005/reports/builder');
    await page.waitForLoadState('networkidle');

    // Wait a moment for any client-side rendering
    await page.waitForTimeout(2000);

    // Check if debug box exists
    console.log('\n🔍 Looking for debug box...');
    const debugBox = await page.locator('.bg-blue-100, [class*="debug"], .debug-box').first();
    const debugBoxExists = await debugBox.count() > 0;
    
    if (debugBoxExists) {
      console.log('✅ Debug box found!');
      const debugText = await debugBox.textContent();
      console.log('📋 Initial debug box content:', debugText);
    } else {
      console.log('❌ Debug box not found');
      // Let's check all elements with blue background
      const blueElements = await page.locator('[class*="bg-blue"]').all();
      console.log(`Found ${blueElements.length} elements with blue background`);
      for (let i = 0; i < Math.min(blueElements.length, 3); i++) {
        const text = await blueElements[i].textContent();
        console.log(`  Blue element ${i}: ${text?.substring(0, 100)}...`);
      }
    }

    // Test 1: Fill in report title
    console.log('\n📝 Test 1: Filling in report title...');
    const titleInput = await page.locator('input[name="title"], input[placeholder*="title"], input[type="text"]').first();
    const titleExists = await titleInput.count() > 0;
    
    if (titleExists) {
      await titleInput.fill('Test Report Title');
      console.log('✅ Report title filled');
      
      // Check debug box update
      if (debugBoxExists) {
        await page.waitForTimeout(500);
        const updatedDebugText = await debugBox.textContent();
        console.log('📋 Debug box after title:', updatedDebugText);
      }
    } else {
      console.log('❌ Title input not found');
    }

    // Test 2: Test report type radio buttons
    console.log('\n🔘 Test 2: Testing report type radio buttons...');
    const reportTypes = ['TABULAR', 'MATRIX', 'METRICS', 'QUERY'];
    
    for (const type of reportTypes) {
      console.log(`\n  Testing ${type} radio button...`);
      
      // Try multiple selectors for radio buttons
      const radioSelectors = [
        `input[value="${type}"]`,
        `input[type="radio"][value="${type}"]`,
        `[data-value="${type}"]`,
        `label:has-text("${type}")`,
        `*:has-text("${type}"):near(input[type="radio"])`
      ];
      
      let radioFound = false;
      for (const selector of radioSelectors) {
        const radio = page.locator(selector).first();
        if (await radio.count() > 0) {
          console.log(`    Found ${type} using selector: ${selector}`);
          await radio.click();
          radioFound = true;
          
          // Check if visually selected
          const isChecked = await radio.isChecked().catch(() => false);
          console.log(`    ${type} checked status:`, isChecked);
          
          // Check debug box
          if (debugBoxExists) {
            await page.waitForTimeout(500);
            const debugText = await debugBox.textContent();
            console.log(`    Debug box after ${type}:`, debugText);
          }
          break;
        }
      }
      
      if (!radioFound) {
        console.log(`    ❌ ${type} radio button not found`);
      }
      
      await page.waitForTimeout(1000);
    }

    // Test 3: Test module radio buttons
    console.log('\n📊 Test 3: Testing module radio buttons...');
    const modules = ['TICKETS', 'TIME_SPENT', 'USERS', 'BRANCHES', 'SERVICES'];
    
    for (const module of modules) {
      console.log(`\n  Testing ${module} radio button...`);
      
      const moduleSelectors = [
        `input[value="${module}"]`,
        `input[type="radio"][value="${module}"]`,
        `[data-value="${module}"]`,
        `label:has-text("${module}")`,
        `*:has-text("${module}"):near(input[type="radio"])`
      ];
      
      let moduleFound = false;
      for (const selector of moduleSelectors) {
        const radio = page.locator(selector).first();
        if (await radio.count() > 0) {
          console.log(`    Found ${module} using selector: ${selector}`);
          await radio.click();
          moduleFound = true;
          
          // Check if visually selected
          const isChecked = await radio.isChecked().catch(() => false);
          console.log(`    ${module} checked status:`, isChecked);
          
          // Check debug box
          if (debugBoxExists) {
            await page.waitForTimeout(500);
            const debugText = await debugBox.textContent();
            console.log(`    Debug box after ${module}:`, debugText);
          }
          break;
        }
      }
      
      if (!moduleFound) {
        console.log(`    ❌ ${module} radio button not found`);
      }
      
      await page.waitForTimeout(1000);
    }

    // Test 4: Try to find and click the proceed button
    console.log('\n⏭️ Test 4: Testing proceed button...');
    const proceedSelectors = [
      'button:has-text("Proceed")',
      'button:has-text("proceed")',
      'button:has-text("wizard")',
      'button:has-text("next")',
      '[role="button"]:has-text("Proceed")',
      'button[type="submit"]'
    ];
    
    let proceedFound = false;
    for (const selector of proceedSelectors) {
      const button = page.locator(selector).first();
      if (await button.count() > 0) {
        console.log(`Found proceed button using: ${selector}`);
        const isEnabled = await button.isEnabled();
        const isVisible = await button.isVisible();
        console.log(`Button enabled: ${isEnabled}, visible: ${isVisible}`);
        
        if (isEnabled && isVisible) {
          console.log('Clicking proceed button...');
          await button.click();
          await page.waitForTimeout(2000);
          console.log('Current URL after click:', page.url());
        }
        proceedFound = true;
        break;
      }
    }
    
    if (!proceedFound) {
      console.log('❌ Proceed button not found');
    }

    // Final debug box check
    if (debugBoxExists) {
      console.log('\n📋 Final debug box content:');
      const finalDebugText = await debugBox.textContent();
      console.log(finalDebugText);
    }

    // Take a screenshot
    console.log('\n📸 Taking screenshot...');
    await page.screenshot({ path: 'report-builder-test.png', fullPage: true });
    console.log('Screenshot saved as report-builder-test.png');

    // Check for all radio buttons on the page
    console.log('\n🔍 All radio buttons found on page:');
    const allRadios = await page.locator('input[type="radio"]').all();
    for (let i = 0; i < allRadios.length; i++) {
      const value = await allRadios[i].getAttribute('value');
      const name = await allRadios[i].getAttribute('name');
      const checked = await allRadios[i].isChecked();
      console.log(`  Radio ${i}: name="${name}" value="${value}" checked=${checked}`);
    }

    // Check for all buttons on the page
    console.log('\n🔍 All buttons found on page:');
    const allButtons = await page.locator('button').all();
    for (let i = 0; i < allButtons.length; i++) {
      const text = await allButtons[i].textContent();
      const enabled = await allButtons[i].isEnabled();
      console.log(`  Button ${i}: "${text}" enabled=${enabled}`);
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    console.log('\n🏁 Test completed. Browser will close in 5 seconds...');
    await page.waitForTimeout(5000);
    await browser.close();
  }
}

testReportBuilder();