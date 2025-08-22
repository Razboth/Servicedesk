const { chromium } = require('playwright');

async function manualTest() {
  console.log('🔍 Manual Report Builder Test...');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 1000,
    devtools: true
  });
  
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  
  const page = await context.newPage();
  
  try {
    console.log('📍 Navigating to report builder...');
    await page.goto('http://localhost:3005/reports/builder', { waitUntil: 'networkidle' });
    
    console.log('⏳ Waiting 10 seconds for manual interaction...');
    await page.waitForTimeout(10000);
    
    // Check current page content
    const pageContent = await page.content();
    console.log('📄 Page title:', await page.title());
    console.log('🔗 Current URL:', page.url());
    
    // Try to find form elements
    const titleInput = await page.locator('input#title').count();
    const radioButtons = await page.locator('input[type="radio"]').count();
    const buttons = await page.locator('button').count();
    
    console.log(`📋 Form elements found:`);
    console.log(`  Title input: ${titleInput}`);
    console.log(`  Radio buttons: ${radioButtons}`);
    console.log(`  Buttons: ${buttons}`);
    
    // Get all radio button values
    if (radioButtons > 0) {
      const radioValues = await page.locator('input[type="radio"]').evaluateAll(inputs => 
        inputs.map(input => ({ value: input.value, name: input.name, checked: input.checked }))
      );
      console.log('📻 Radio buttons:', radioValues);
    }
    
    // Try manual form filling
    console.log('📝 Attempting to fill form...');
    
    if (titleInput > 0) {
      await page.fill('input#title', 'Manual Test Report');
      console.log('✅ Title filled');
    }
    
    // Try to select report type radio
    const tabularRadio = page.locator('input[value="TABULAR"]');
    if (await tabularRadio.count() > 0) {
      await tabularRadio.check();
      console.log('✅ TABULAR selected');
    }
    
    // Try to select module radio
    const ticketsRadio = page.locator('input[value="TICKETS"]');
    if (await ticketsRadio.count() > 0) {
      await ticketsRadio.check();
      console.log('✅ TICKETS selected');
    }
    
    // Check if proceed button is now enabled
    const proceedButton = page.locator('button:has-text("Proceed")');
    if (await proceedButton.count() > 0) {
      const isDisabled = await proceedButton.getAttribute('disabled');
      console.log(`🚀 Proceed button disabled: ${isDisabled !== null}`);
      
      if (isDisabled === null) {
        console.log('⏳ Clicking proceed button...');
        await proceedButton.click();
        await page.waitForTimeout(3000);
        
        console.log('📍 Current URL after proceed:', page.url());
        
        // Check if we're in the wizard
        const wizardTitle = await page.locator('h1').textContent();
        console.log('📄 Wizard title:', wizardTitle);
        
        // Look for step navigation
        const steps = await page.locator('.step, [data-step], button[role="tab"]').count();
        console.log(`📊 Wizard steps found: ${steps}`);
        
        // Try to navigate to step 5 (Schedule)
        console.log('🎯 Attempting to navigate to Schedule step...');
        
        // Try various methods to get to step 5
        const scheduleSelectors = [
          'button:has-text("Schedule")',
          '[data-step="5"]',
          '.step:nth-child(5)',
          'div:has-text("Schedule")',
          'button:nth-child(5)'
        ];
        
        for (const selector of scheduleSelectors) {
          const element = page.locator(selector).first();
          if (await element.count() > 0) {
            try {
              await element.click();
              await page.waitForTimeout(2000);
              console.log(`✅ Clicked schedule using: ${selector}`);
              break;
            } catch (error) {
              console.log(`❌ Failed with ${selector}: ${error.message}`);
            }
          }
        }
        
        // Check what's visible on the schedule step
        console.log('🔍 Checking Schedule step content...');
        
        const scheduleElements = {
          'Switch/Toggle': await page.locator('button[role="switch"], input[type="checkbox"]').count(),
          'Select elements': await page.locator('select').count(),
          'Input elements': await page.locator('input').count(),
          'Button elements': await page.locator('button').count(),
          'ReportScheduler text': await page.locator('text="Schedule Report"').count(),
          'Frequency text': await page.locator('text="Frequency"').count(),
          'Email text': await page.locator('text="Email"').count()
        };
        
        console.log('📋 Schedule step elements:');
        for (const [name, count] of Object.entries(scheduleElements)) {
          console.log(`  ${name}: ${count}`);
        }
        
        // Get page content for debugging
        await page.screenshot({ path: 'manual-test-schedule-step.png', fullPage: true });
        
        // Wait for manual inspection
        console.log('⏳ Waiting 30 seconds for manual inspection...');
        await page.waitForTimeout(30000);
      }
    }
    
  } catch (error) {
    console.error('❌ Test error:', error);
    await page.screenshot({ path: 'manual-test-error.png', fullPage: true });
  } finally {
    await browser.close();
  }
}

manualTest().catch(console.error);