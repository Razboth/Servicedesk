const { chromium } = require('playwright');

async function testAuthAndForm() {
  console.log('🔐 Testing Authentication and Form Loading...');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 500
  });
  
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  
  const page = await context.newPage();
  
  // Add console and network monitoring
  page.on('console', msg => {
    console.log(`🟦 Console ${msg.type()}: ${msg.text()}`);
  });
  
  page.on('response', response => {
    if (response.status() >= 400) {
      console.log(`🔴 ${response.status()} Error: ${response.url()}`);
    } else if (response.url().includes('/api/')) {
      console.log(`🟢 ${response.status()} API: ${response.url()}`);
    }
  });
  
  try {
    // Step 1: Try to access report builder directly
    console.log('📍 Step 1: Accessing report builder directly...');
    await page.goto('http://localhost:3006/reports/builder', { waitUntil: 'networkidle' });
    
    let currentUrl = page.url();
    console.log(`🔗 Current URL after navigation: ${currentUrl}`);
    
    // Check if we got redirected to sign-in
    if (currentUrl.includes('/auth/signin') || currentUrl.includes('/login')) {
      console.log('🔐 Redirected to authentication - need to sign in first');
      
      // Try to sign in
      await page.fill('input[name="email"], input[type="email"]', 'admin@sulutgo.com');
      await page.fill('input[name="password"], input[type="password"]', 'admin123');
      
      const signInButton = page.locator('button[type="submit"], button:has-text("Sign"), button:has-text("Login")');
      if (await signInButton.count() > 0) {
        await signInButton.click();
        await page.waitForTimeout(3000);
        console.log('✅ Attempted sign in');
        
        // Try to navigate to report builder again
        await page.goto('http://localhost:3006/reports/builder', { waitUntil: 'networkidle' });
        currentUrl = page.url();
        console.log(`🔗 URL after sign in: ${currentUrl}`);
      }
    }
    
    // Step 2: Check page content
    console.log('📍 Step 2: Analyzing page content...');
    
    const pageTitle = await page.title();
    const hasError = await page.locator('text="Error", text="500", text="Not Found"').count();
    
    console.log(`📄 Page title: "${pageTitle}"`);
    console.log(`❌ Error indicators: ${hasError}`);
    
    if (hasError > 0) {
      const errorText = await page.locator('text="Error", text="500", text="Not Found"').first().textContent();
      console.log(`🚨 Error found: ${errorText}`);
    }
    
    // Step 3: Check for form elements with various selectors
    console.log('📍 Step 3: Looking for form elements...');
    
    const selectors = {
      'Title input (id)': 'input#title',
      'Title input (name)': 'input[name="title"]',
      'Title input (placeholder)': 'input[placeholder*="title"]',
      'Any input': 'input',
      'Report type radios': 'input[type="radio"]',
      'Tabular radio': 'input[value="TABULAR"]',
      'Module radios': 'input[name*="module"]',
      'Tickets radio': 'input[value="TICKETS"]',
      'Proceed button': 'button:has-text("Proceed")',
      'Any button': 'button',
      'Custom Reports title': 'text="Custom Reports"',
      'Report builder card': '.card, [class*="card"]'
    };
    
    for (const [name, selector] of Object.entries(selectors)) {
      const count = await page.locator(selector).count();
      console.log(`  ${count > 0 ? '✅' : '❌'} ${name}: ${count} found`);
      
      if (count > 0 && name.includes('input')) {
        // Get more details about inputs
        try {
          const details = await page.locator(selector).first().evaluate(el => ({
            type: el.type,
            name: el.name,
            id: el.id,
            placeholder: el.placeholder,
            value: el.value,
            visible: el.offsetParent !== null
          }));
          console.log(`      Details: ${JSON.stringify(details)}`);
        } catch (e) {
          // Ignore evaluation errors
        }
      }
    }
    
    // Step 4: Take screenshot and inspect source
    await page.screenshot({ path: 'auth-test-full-page.png', fullPage: true });
    
    // Check if the page has loaded the React components
    const reactElements = await page.locator('[data-react], [class*="react"], [id*="react"]').count();
    const nextElements = await page.locator('[class*="next"], [id*="__next"]').count();
    
    console.log(`⚛️ React elements: ${reactElements}`);
    console.log(`📦 Next.js elements: ${nextElements}`);
    
    // Try to wait for any dynamic content
    console.log('⏳ Waiting for dynamic content to load...');
    await page.waitForTimeout(5000);
    
    // Re-check form elements after waiting
    const titleInputAfterWait = await page.locator('input#title').count();
    const radioButtonsAfterWait = await page.locator('input[type="radio"]').count();
    
    console.log(`📝 After waiting - Title input: ${titleInputAfterWait}, Radio buttons: ${radioButtonsAfterWait}`);
    
    // Step 5: If elements found, try to interact
    if (titleInputAfterWait > 0 && radioButtonsAfterWait > 0) {
      console.log('🎯 Elements found! Testing interaction...');
      
      await page.fill('input#title', 'Authentication Test Report');
      await page.check('input[value="TABULAR"]');
      await page.check('input[value="TICKETS"]');
      
      const proceedButton = page.locator('button:has-text("Proceed")');
      const isDisabled = await proceedButton.getAttribute('disabled');
      
      console.log(`🚀 Proceed button disabled: ${isDisabled !== null}`);
      
      if (isDisabled === null) {
        await proceedButton.click();
        await page.waitForTimeout(3000);
        
        const newUrl = page.url();
        console.log(`🎉 Successfully proceeded to: ${newUrl}`);
        
        if (newUrl.includes('wizard')) {
          console.log('✅ Successfully reached the report wizard!');
          
          // Try to navigate to step 5 (Schedule)
          console.log('📍 Attempting to reach Schedule step...');
          
          const scheduleButton = page.locator('button:has-text("Schedule"), [data-step="5"]');
          if (await scheduleButton.count() > 0) {
            await scheduleButton.click();
            await page.waitForTimeout(2000);
            
            // Check for schedule elements
            const scheduleElements = {
              'Schedule toggle': 'button[role="switch"]',
              'Frequency radios': 'input[value="DAILY"]',
              'Email input': 'input[type="email"]',
              'Schedule component': 'text="Schedule Report"'
            };
            
            console.log('🎯 Schedule step elements:');
            for (const [name, selector] of Object.entries(scheduleElements)) {
              const count = await page.locator(selector).count();
              console.log(`  ${count > 0 ? '✅' : '❌'} ${name}: ${count}`);
            }
            
            await page.screenshot({ path: 'auth-test-schedule-step.png', fullPage: true });
          }
        }
      }
    } else {
      console.log('❌ Form elements still not found after waiting');
      
      // Get the full page source for debugging
      const pageSource = await page.content();
      const sourcePreview = pageSource.substring(0, 1000) + '...';
      console.log(`📄 Page source preview:\n${sourcePreview}`);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    await page.screenshot({ path: 'auth-test-error.png', fullPage: true });
  } finally {
    console.log('⏳ Waiting 10 seconds for final inspection...');
    await page.waitForTimeout(10000);
    await browser.close();
  }
}

testAuthAndForm().catch(console.error);