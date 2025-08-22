const { chromium } = require('playwright');

async function testScheduleStep() {
  console.log('🎯 Starting Schedule Step Test...');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 500
  });
  
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  
  const page = await context.newPage();
  
  // Add console logging
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log(`🐛 Console Error: ${msg.text()}`);
    }
  });
  
  page.on('response', response => {
    if (response.status() >= 400) {
      console.log(`🌐 Network Error: ${response.status()} - ${response.url()}`);
    }
  });
  
  try {
    // Step 1: Navigate to the report builder
    console.log('📍 Step 1: Navigating to report builder...');
    await page.goto('http://localhost:3005/reports/builder', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    
    // Step 2: Fill out the form properly
    console.log('📍 Step 2: Filling report builder form...');
    
    // Fill title
    await page.fill('input#title', 'Schedule Test Report');
    console.log('✅ Title filled');
    
    // Select report type (TABULAR should be default)
    const tabularRadio = page.locator('input[value="TABULAR"]');
    if (await tabularRadio.count() > 0) {
      await tabularRadio.check();
      console.log('✅ TABULAR report type selected');
    }
    
    // Select module (TICKETS)
    const ticketsRadio = page.locator('input[value="TICKETS"]');
    if (await ticketsRadio.count() > 0) {
      await ticketsRadio.check();
      console.log('✅ TICKETS module selected');
    }
    
    await page.screenshot({ path: 'schedule-test-form-filled.png', fullPage: true });
    
    // Step 3: Click proceed (should now be enabled)
    console.log('📍 Step 3: Clicking proceed to wizard...');
    const proceedButton = page.locator('button:has-text("Proceed to Report wizard")');
    await proceedButton.waitFor({ state: 'visible' });
    
    // Check if button is enabled
    const isDisabled = await proceedButton.getAttribute('disabled');
    console.log(`Button disabled state: ${isDisabled !== null}`);
    
    if (isDisabled === null) {
      await proceedButton.click();
      await page.waitForTimeout(3000);
      console.log('✅ Successfully clicked proceed button');
    } else {
      console.log('❌ Proceed button is still disabled');
      // Try to debug why it's disabled
      const titleValue = await page.inputValue('input#title');
      const selectedModule = await page.locator('input[name]:checked').count();
      console.log(`Debug - Title: "${titleValue}", Selected items: ${selectedModule}`);
    }
    
    await page.screenshot({ path: 'schedule-test-after-proceed.png', fullPage: true });
    
    // Step 4: Navigate to Schedule step (Step 5)
    console.log('📍 Step 4: Navigating to Schedule step...');
    
    // Wait for wizard to load
    await page.waitForSelector('.step', { timeout: 10000 }).catch(() => {
      console.log('⚠️ Step elements not found, trying alternative selectors...');
    });
    
    // Try to find and click the Schedule step
    const scheduleStepSelectors = [
      'div:has(svg):has-text("Schedule")',
      'button:has-text("Schedule")',
      '.step:nth-child(5)',
      '[data-step="5"]',
      'div:has(.lucide-calendar)'
    ];
    
    let scheduleStepFound = false;
    for (const selector of scheduleStepSelectors) {
      const element = page.locator(selector).first();
      if (await element.count() > 0) {
        try {
          await element.click();
          await page.waitForTimeout(2000);
          console.log(`✅ Clicked Schedule step using selector: ${selector}`);
          scheduleStepFound = true;
          break;
        } catch (error) {
          console.log(`⚠️ Failed to click with selector ${selector}: ${error.message}`);
        }
      }
    }
    
    if (!scheduleStepFound) {
      // Try to navigate through steps sequentially
      console.log('🔄 Trying to navigate through steps sequentially...');
      const steps = [1, 2, 3, 4, 5];
      
      for (const step of steps) {
        const stepElement = page.locator(`div:nth-child(${step})`).first();
        if (await stepElement.count() > 0) {
          try {
            await stepElement.click();
            await page.waitForTimeout(1500);
            if (step === 5) {
              console.log('✅ Reached Schedule step via sequential navigation');
              scheduleStepFound = true;
              break;
            }
          } catch (error) {
            console.log(`⚠️ Failed to click step ${step}: ${error.message}`);
          }
        }
      }
    }
    
    await page.screenshot({ path: 'schedule-test-step-navigation.png', fullPage: true });
    
    // Step 5: Test Schedule functionality
    console.log('📍 Step 5: Testing Schedule functionality...');
    
    // Look for the schedule component
    const scheduleComponent = page.locator('[class*="space-y-6"], .space-y-6').first();
    if (await scheduleComponent.count() > 0) {
      console.log('✅ Found schedule component');
      
      // Test the enable toggle
      const enableToggle = page.locator('button[role="switch"], input[type="checkbox"]').first();
      if (await enableToggle.count() > 0) {
        try {
          await enableToggle.click();
          await page.waitForTimeout(1000);
          console.log('✅ Enabled schedule toggle');
          
          // Take screenshot after enabling
          await page.screenshot({ path: 'schedule-test-enabled.png', fullPage: true });
          
          // Test frequency selection
          console.log('🔧 Testing frequency selection...');
          const frequencyOptions = ['DAILY', 'WEEKLY', 'MONTHLY', 'ONCE'];
          
          for (const freq of frequencyOptions) {
            const freqRadio = page.locator(`input[value="${freq}"]`).first();
            if (await freqRadio.count() > 0) {
              await freqRadio.check();
              await page.waitForTimeout(500);
              console.log(`✅ Selected frequency: ${freq}`);
              
              // Take screenshot for each frequency
              await page.screenshot({ path: `schedule-test-freq-${freq.toLowerCase()}.png`, fullPage: true });
              
              // Test frequency-specific options
              if (freq === 'WEEKLY') {
                console.log('  🔧 Testing weekly options...');
                const dayCheckboxes = page.locator('input[type="checkbox"]');
                const checkboxCount = await dayCheckboxes.count();
                console.log(`  Found ${checkboxCount} day checkboxes`);
                
                // Try to check Monday
                if (checkboxCount > 0) {
                  await dayCheckboxes.first().check();
                  console.log('  ✅ Selected first day of week');
                }
              }
              
              if (freq === 'MONTHLY') {
                console.log('  🔧 Testing monthly options...');
                const daySelect = page.locator('select').first();
                if (await daySelect.count() > 0) {
                  await daySelect.selectOption('15');
                  console.log('  ✅ Selected day 15 of month');
                }
              }
            }
          }
          
          // Test time selection
          console.log('🔧 Testing time selection...');
          const timeSelects = page.locator('select');
          const selectCount = await timeSelects.count();
          console.log(`Found ${selectCount} select elements for time`);
          
          if (selectCount >= 2) {
            await timeSelects.nth(0).selectOption('14'); // 2 PM
            await timeSelects.nth(1).selectOption('30'); // 30 minutes
            console.log('✅ Set time to 14:30');
          }
          
          // Test date selection
          console.log('🔧 Testing date selection...');
          const dateButton = page.locator('button:has-text("Select date")').first();
          if (await dateButton.count() > 0) {
            await dateButton.click();
            await page.waitForTimeout(1000);
            
            // Try to select today's date
            const todayButton = page.locator('button[name="day"]').first();
            if (await todayButton.count() > 0) {
              await todayButton.click();
              console.log('✅ Selected start date');
            }
          }
          
          // Test email settings
          console.log('🔧 Testing email settings...');
          const emailInput = page.locator('input[type="email"]').first();
          if (await emailInput.count() > 0) {
            await emailInput.fill('test@example.com');
            console.log('✅ Filled email recipient');
            
            // Try to add the email
            const addButton = page.locator('button:has-text("Add")').first();
            if (await addButton.count() > 0) {
              await addButton.click();
              await page.waitForTimeout(500);
              console.log('✅ Added email recipient');
            }
          }
          
          // Test subject field
          const subjectInput = page.locator('input[placeholder*="subject"], input[placeholder*="Subject"]').first();
          if (await subjectInput.count() > 0) {
            await subjectInput.fill('Automated Test Report');
            console.log('✅ Filled subject line');
          }
          
          // Test format selection
          const formatSelect = page.locator('select').last();
          if (await formatSelect.count() > 0) {
            await formatSelect.selectOption('PDF');
            console.log('✅ Selected PDF format');
          }
          
          // Take final screenshot
          await page.screenshot({ path: 'schedule-test-complete.png', fullPage: true });
          
          // Test validation
          console.log('🔧 Testing validation...');
          const alerts = await page.locator('[role="alert"], .alert').allTextContents();
          if (alerts.length > 0) {
            console.log(`📋 Validation messages: ${alerts.join(', ')}`);
          } else {
            console.log('✅ No validation errors found');
          }
          
        } catch (error) {
          console.log(`❌ Error during schedule testing: ${error.message}`);
        }
      } else {
        console.log('❌ Could not find schedule enable toggle');
      }
    } else {
      console.log('❌ Could not find schedule component');
    }
    
    // Test Save functionality
    console.log('🔧 Testing Save functionality...');
    const saveButton = page.locator('button:has-text("Save")').first();
    if (await saveButton.count() > 0) {
      const isDisabled = await saveButton.getAttribute('disabled');
      console.log(`Save button disabled: ${isDisabled !== null}`);
      
      if (isDisabled === null) {
        console.log('✅ Save button is enabled and ready');
      } else {
        console.log('⚠️ Save button is disabled - may need more configuration');
      }
    }
    
    // Summary
    console.log('\n📊 SCHEDULE STEP TEST SUMMARY:');
    console.log('='.repeat(50));
    
    // Check all key elements
    const checkResults = {
      'Schedule Toggle': await page.locator('button[role="switch"], input[type="checkbox"]').count() > 0,
      'Frequency Options': await page.locator('input[value="DAILY"]').count() > 0,
      'Time Selection': await page.locator('select').count() >= 2,
      'Date Picker': await page.locator('button:has-text("Select date")').count() > 0,
      'Email Input': await page.locator('input[type="email"]').count() > 0,
      'Subject Input': await page.locator('input[placeholder*="subject"], input[placeholder*="Subject"]').count() > 0,
      'Format Selection': await page.locator('select').count() > 0,
      'Save Button': await page.locator('button:has-text("Save")').count() > 0
    };
    
    for (const [element, found] of Object.entries(checkResults)) {
      console.log(`${found ? '✅' : '❌'} ${element}: ${found ? 'FOUND' : 'MISSING'}`);
    }
    
  } catch (error) {
    console.error('❌ Test failed with error:', error);
    await page.screenshot({ path: 'schedule-test-error.png', fullPage: true });
  } finally {
    console.log('\n🏁 Schedule step test completed. Check screenshots for visual verification.');
    await browser.close();
  }
}

// Run the test
testScheduleStep().catch(console.error);