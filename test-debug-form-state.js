const { chromium } = require('playwright');

async function debugFormState() {
  console.log('🔍 Debugging Report Builder Form State...');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 1000
  });
  
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Monitor console for alerts and logs
  page.on('console', msg => {
    console.log(`🟦 Console ${msg.type()}: ${msg.text()}`);
  });
  
  // Monitor dialogs (alerts)
  page.on('dialog', async dialog => {
    console.log(`🚨 Dialog: ${dialog.message()}`);
    await dialog.accept();
  });
  
  try {
    console.log('📍 Navigating to report builder...');
    await page.goto('http://localhost:3006/reports/builder', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    
    console.log('📍 Filling form step by step...');
    
    // Fill title
    await page.fill('input#title', 'Debug Test Report');
    console.log('✅ Title filled');
    
    // Check title value
    const titleValue = await page.inputValue('input#title');
    console.log(`🔍 Title value: "${titleValue}"`);
    
    // Select report type via label click
    await page.locator('label[for="tabular"]').click();
    console.log('✅ Clicked TABULAR label');
    
    // Verify report type selection
    const tabularChecked = await page.locator('input[value="TABULAR"]').isChecked();
    console.log(`🔍 TABULAR checked: ${tabularChecked}`);
    
    // Select module via label click
    await page.locator('label[for="TICKETS"]').click();
    console.log('✅ Clicked TICKETS label');
    
    // Verify module selection
    const ticketsChecked = await page.locator('input[value="TICKETS"]').isChecked();
    console.log(`🔍 TICKETS checked: ${ticketsChecked}`);
    
    // Wait a moment for state updates
    await page.waitForTimeout(1000);
    
    // Check all form state
    console.log('📋 Complete form state check:');
    
    const formState = await page.evaluate(() => {
      // Try to access React component state (if possible)
      const titleInput = document.getElementById('title');
      const tabularRadio = document.querySelector('input[value="TABULAR"]');
      const ticketsRadio = document.querySelector('input[value="TICKETS"]');
      const proceedButton = document.querySelector('button:contains("Proceed"), button[disabled]');
      
      return {
        titleValue: titleInput ? titleInput.value : 'NOT_FOUND',
        titleLength: titleInput ? titleInput.value.length : 0,
        tabularSelected: tabularRadio ? tabularRadio.checked : false,
        ticketsSelected: ticketsRadio ? ticketsRadio.checked : false,
        allRadios: Array.from(document.querySelectorAll('input[type="radio"]')).map(r => ({
          value: r.value,
          checked: r.checked,
          name: r.name || 'NO_NAME'
        })),
        proceedButtonDisabled: document.querySelector('button[disabled]') !== null,
        proceedButtonExists: document.querySelector('button') !== null
      };
    });
    
    console.log('Form State:', JSON.stringify(formState, null, 2));
    
    // Check if the proceed button is enabled
    const proceedButton = page.locator('button:has-text("Proceed to Report wizard")');
    const isDisabled = await proceedButton.getAttribute('disabled');
    console.log(`🚀 Proceed button disabled attribute: ${isDisabled}`);
    
    // Try clicking with verbose logging
    console.log('📍 Attempting to click proceed button...');
    
    // First, take a screenshot
    await page.screenshot({ path: 'debug-before-click.png', fullPage: true });
    
    // Add a script to log when the button is clicked
    await page.addScriptTag({
      content: `
        document.addEventListener('click', function(e) {
          if (e.target.tagName === 'BUTTON') {
            console.log('Button clicked:', e.target.textContent);
          }
        });
      `
    });
    
    // Click the proceed button
    const urlBefore = page.url();
    console.log(`URL before click: ${urlBefore}`);
    
    await proceedButton.click();
    console.log('✅ Proceed button clicked');
    
    // Wait for navigation or state change
    await page.waitForTimeout(3000);
    
    const urlAfter = page.url();
    console.log(`URL after click: ${urlAfter}`);
    
    // Check if navigation occurred
    if (urlAfter !== urlBefore) {
      console.log('🎉 Navigation successful!');
      
      // Check if we're in the wizard
      if (urlAfter.includes('wizard')) {
        console.log('🎯 Successfully reached the wizard!');
        
        // Wait for wizard to load
        await page.waitForTimeout(2000);
        
        // Check for wizard elements
        const wizardElements = {
          'Wizard title': await page.locator('h1').textContent(),
          'Step indicators': await page.locator('div[class*="flex items-center justify-center w-10 h-10"]').count(),
          'Current step': await page.locator('[class*="bg-primary text-primary-foreground"]').count()
        };
        
        console.log('Wizard Elements:', wizardElements);
        
        // Try to navigate to Schedule step
        console.log('📍 Attempting to reach Schedule step...');
        
        const scheduleStepButton = page.locator('div').nth(8); // 5th step (0-indexed, accounting for separators)
        if (await scheduleStepButton.count() > 0) {
          await scheduleStepButton.click();
          await page.waitForTimeout(2000);
          
          console.log('🎯 Checking Schedule step content...');
          
          const scheduleContent = await page.evaluate(() => {
            const scheduleText = document.body.textContent.toLowerCase();
            return {
              hasScheduleText: scheduleText.includes('schedule'),
              hasEmailText: scheduleText.includes('email'),
              hasFrequencyText: scheduleText.includes('frequency'),
              hasSwitchElements: document.querySelectorAll('button[role="switch"]').length,
              hasSelectElements: document.querySelectorAll('select').length,
              hasInputElements: document.querySelectorAll('input').length
            };
          });
          
          console.log('Schedule Content:', scheduleContent);
          
          // Test the schedule toggle
          const scheduleToggle = page.locator('button[role="switch"]').first();
          if (await scheduleToggle.count() > 0) {
            console.log('🔄 Testing schedule toggle...');
            await scheduleToggle.click();
            await page.waitForTimeout(1000);
            
            // Check if more elements appeared
            const elementsAfterToggle = await page.evaluate(() => ({
              inputs: document.querySelectorAll('input').length,
              selects: document.querySelectorAll('select').length,
              buttons: document.querySelectorAll('button').length
            }));
            
            console.log('Elements after toggle:', elementsAfterToggle);
            
            // Take screenshot of schedule step
            await page.screenshot({ path: 'debug-schedule-step.png', fullPage: true });
          }
        }
      }
    } else {
      console.log('❌ Navigation failed - URL did not change');
      
      // Check for any error messages or alerts
      const errorElements = await page.locator('[role="alert"], .error, .alert-error').allTextContents();
      if (errorElements.length > 0) {
        console.log('Error messages:', errorElements);
      }
      
      // Take screenshot for debugging
      await page.screenshot({ path: 'debug-navigation-failed.png', fullPage: true });
    }
    
  } catch (error) {
    console.error('❌ Debug test failed:', error);
    await page.screenshot({ path: 'debug-error.png', fullPage: true });
  } finally {
    console.log('⏳ Waiting 5 seconds for final inspection...');
    await page.waitForTimeout(5000);
    await browser.close();
  }
}

debugFormState().catch(console.error);