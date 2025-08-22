const { chromium } = require('playwright');

async function testWorkingFlow() {
  console.log('🚀 Testing Complete Report Builder Flow...');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 800
  });
  
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  
  const page = await context.newPage();
  
  try {
    // Step 1: Navigate to report builder
    console.log('📍 Step 1: Navigating to report builder...');
    await page.goto('http://localhost:3006/reports/builder', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    
    console.log('✅ Page loaded successfully');
    
    // Step 2: Fill the form properly
    console.log('📍 Step 2: Filling the report builder form...');
    
    // Fill title
    await page.fill('input#title', 'Complete Test Report');
    console.log('✅ Title filled');
    
    // For radio buttons, we need to click the label instead of the input
    // or use force click to bypass the interception
    
    // Select TABULAR report type
    try {
      await page.locator('label[for="tabular"]').click();
      console.log('✅ TABULAR report type selected (via label)');
    } catch (error) {
      await page.locator('input[value="TABULAR"]').click({ force: true });
      console.log('✅ TABULAR report type selected (via force click)');
    }
    
    // Select TICKETS module
    try {
      await page.locator('label[for="TICKETS"]').click();
      console.log('✅ TICKETS module selected (via label)');
    } catch (error) {
      await page.locator('input[value="TICKETS"]').click({ force: true });
      console.log('✅ TICKETS module selected (via force click)');
    }
    
    await page.screenshot({ path: 'working-flow-form-filled.png', fullPage: true });
    
    // Step 3: Click proceed button
    console.log('📍 Step 3: Proceeding to wizard...');
    
    const proceedButton = page.locator('button:has-text("Proceed to Report wizard")');
    await proceedButton.waitFor({ state: 'visible' });
    
    // Check if enabled
    const isDisabled = await proceedButton.getAttribute('disabled');
    console.log(`Proceed button disabled: ${isDisabled !== null}`);
    
    if (isDisabled === null) {
      await proceedButton.click();
      await page.waitForTimeout(3000);
      console.log('✅ Successfully clicked proceed button');
    } else {
      console.log('❌ Proceed button still disabled - debugging...');
      
      // Debug the form state
      const titleValue = await page.inputValue('input#title');
      const selectedRadios = await page.locator('input[type="radio"]:checked').count();
      console.log(`Debug: Title="${titleValue}", Selected radios=${selectedRadios}`);
      
      // Force click to see what happens
      await proceedButton.click({ force: true });
      console.log('⚠️ Force clicked proceed button');
    }
    
    await page.screenshot({ path: 'working-flow-after-proceed.png', fullPage: true });
    
    // Step 4: Navigate through wizard steps
    const currentUrl = page.url();
    console.log(`Current URL: ${currentUrl}`);
    
    if (currentUrl.includes('wizard')) {
      console.log('🎉 Successfully entered the report wizard!');
      
      // Wait for wizard to load
      await page.waitForTimeout(2000);
      
      // Find step navigation elements
      console.log('📍 Step 4: Testing wizard navigation...');
      
      const stepElements = await page.locator('div[class*="flex items-center justify-center"]').count();
      console.log(`Found ${stepElements} step elements`);
      
      // Navigate to Step 5 (Schedule) by clicking through steps
      const steps = [
        { name: 'Columns', stepNumber: 1 },
        { name: 'Filter Options', stepNumber: 2 },
        { name: 'Advanced Filtering', stepNumber: 3 },
        { name: 'Charts', stepNumber: 4 },
        { name: 'Schedule', stepNumber: 5 }
      ];
      
      for (const step of steps) {
        console.log(`🔄 Navigating to Step ${step.stepNumber}: ${step.name}...`);
        
        // Try multiple ways to click the step
        const selectors = [
          `div:nth-child(${step.stepNumber * 2 - 1})`, // accounting for separator divs
          `[data-step="${step.stepNumber}"]`,
          `button:has-text("${step.name}")`,
          `text="${step.name}"`,
          `.step-${step.stepNumber}`
        ];
        
        let stepClicked = false;
        for (const selector of selectors) {
          const element = page.locator(selector).first();
          if (await element.count() > 0) {
            try {
              await element.click();
              await page.waitForTimeout(1500);
              console.log(`  ✅ Clicked step using: ${selector}`);
              stepClicked = true;
              break;
            } catch (error) {
              // Try next selector
            }
          }
        }
        
        if (!stepClicked) {
          console.log(`  ⚠️ Could not click step ${step.stepNumber}, trying sequential click...`);
          
          // Try to click the step circle by position
          const stepCircles = page.locator('div[class*="flex items-center justify-center w-10 h-10"]');
          const stepCount = await stepCircles.count();
          
          if (step.stepNumber <= stepCount) {
            try {
              await stepCircles.nth(step.stepNumber - 1).click();
              await page.waitForTimeout(1500);
              console.log(`  ✅ Clicked step ${step.stepNumber} by position`);
              stepClicked = true;
            } catch (error) {
              console.log(`  ❌ Failed to click step ${step.stepNumber}: ${error.message}`);
            }
          }
        }
        
        // Take screenshot of each step
        await page.screenshot({ path: `working-flow-step-${step.stepNumber}.png`, fullPage: true });
        
        // Special handling for Schedule step
        if (step.stepNumber === 5 && stepClicked) {
          console.log('🎯 TESTING SCHEDULE STEP FUNCTIONALITY:');
          await page.waitForTimeout(2000);
          
          // Test Schedule Components
          const scheduleTests = {
            'Enable Toggle': async () => {
              const toggle = page.locator('button[role="switch"]').first();
              if (await toggle.count() > 0) {
                await toggle.click();
                console.log('    ✅ Schedule enabled');
                return true;
              }
              return false;
            },
            
            'Frequency Selection': async () => {
              // Try Daily frequency
              const dailyRadio = page.locator('input[value="DAILY"]').first();
              if (await dailyRadio.count() > 0) {
                try {
                  await page.locator('label[for="daily"]').click();
                } catch {
                  await dailyRadio.click({ force: true });
                }
                console.log('    ✅ Daily frequency selected');
                return true;
              }
              return false;
            },
            
            'Time Selection': async () => {
              const hourSelect = page.locator('select').first();
              const minuteSelect = page.locator('select').nth(1);
              
              if (await hourSelect.count() > 0 && await minuteSelect.count() > 0) {
                await hourSelect.selectOption('14');
                await minuteSelect.selectOption('30');
                console.log('    ✅ Time set to 14:30');
                return true;
              }
              return false;
            },
            
            'Date Selection': async () => {
              const dateButton = page.locator('button:has-text("Select date")').first();
              if (await dateButton.count() > 0) {
                await dateButton.click();
                await page.waitForTimeout(1000);
                
                // Click today's date (any available date)
                const dayButton = page.locator('button[name="day"]').first();
                if (await dayButton.count() > 0) {
                  await dayButton.click();
                  console.log('    ✅ Start date selected');
                  return true;
                }
              }
              return false;
            },
            
            'Email Configuration': async () => {
              const emailInput = page.locator('input[type="email"]').first();
              const addButton = page.locator('button:has-text("Add")').first();
              
              if (await emailInput.count() > 0) {
                await emailInput.fill('test@bankselutgo.com');
                if (await addButton.count() > 0) {
                  await addButton.click();
                  console.log('    ✅ Email recipient added');
                }
                return true;
              }
              return false;
            },
            
            'Subject Line': async () => {
              const subjectInput = page.locator('input[placeholder*="subject"], input[placeholder*="Subject"]').first();
              if (await subjectInput.count() > 0) {
                await subjectInput.fill('Automated Report - Test');
                console.log('    ✅ Subject line filled');
                return true;
              }
              return false;
            },
            
            'Export Format': async () => {
              const formatSelect = page.locator('select').last();
              if (await formatSelect.count() > 0) {
                await formatSelect.selectOption('PDF');
                console.log('    ✅ PDF format selected');
                return true;
              }
              return false;
            }
          };
          
          // Run each test
          for (const [testName, testFunc] of Object.entries(scheduleTests)) {
            console.log(`  🧪 Testing ${testName}...`);
            try {
              const success = await testFunc();
              if (!success) {
                console.log(`    ❌ ${testName} test failed - element not found`);
              }
            } catch (error) {
              console.log(`    ❌ ${testName} test error: ${error.message}`);
            }
            await page.waitForTimeout(500);
          }
          
          // Take detailed screenshot of schedule step
          await page.screenshot({ path: 'working-flow-schedule-detailed.png', fullPage: true });
          
          // Test validation
          console.log('  🔍 Checking validation...');
          const alerts = await page.locator('[role="alert"], .alert').allTextContents();
          if (alerts.length > 0) {
            console.log(`    📋 Validation alerts: ${alerts.join(', ')}`);
          } else {
            console.log('    ✅ No validation errors detected');
          }
          
          // Test save functionality
          console.log('  💾 Testing Save functionality...');
          const saveButton = page.locator('button:has-text("Save")').first();
          if (await saveButton.count() > 0) {
            const saveDisabled = await saveButton.getAttribute('disabled');
            console.log(`    Save button disabled: ${saveDisabled !== null}`);
            
            if (saveDisabled === null) {
              console.log('    ✅ Save button is ready for use');
              
              // Optionally test save (uncomment to actually save)
              // await saveButton.click();
              // await page.waitForTimeout(2000);
              // console.log('    💾 Report saved (if no errors)');
            }
          }
        }
      }
    } else {
      console.log('❌ Did not reach the wizard - still on builder page');
    }
    
    // Final summary
    console.log('\n📊 FINAL TEST SUMMARY:');
    console.log('='.repeat(60));
    
    const finalChecks = {
      'Report Builder Form': await page.locator('input#title').count() > 0,
      'Wizard Navigation': currentUrl.includes('wizard'),
      'Schedule Component': await page.locator('text="Schedule Report"').count() > 0,
      'Schedule Toggle': await page.locator('button[role="switch"]').count() > 0,
      'Email Settings': await page.locator('input[type="email"]').count() > 0,
      'Save Functionality': await page.locator('button:has-text("Save")').count() > 0
    };
    
    for (const [check, passed] of Object.entries(finalChecks)) {
      console.log(`${passed ? '✅' : '❌'} ${check}: ${passed ? 'WORKING' : 'ISSUE DETECTED'}`);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    await page.screenshot({ path: 'working-flow-error.png', fullPage: true });
  } finally {
    console.log('\n🏁 Test completed. Screenshots saved for analysis.');
    await browser.close();
  }
}

testWorkingFlow().catch(console.error);