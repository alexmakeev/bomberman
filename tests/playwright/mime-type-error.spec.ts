import { test, expect, Page } from '@playwright/test';

test.describe('MIME Type Error Reproduction', () => {
  test('should reproduce CREATE GAME MIME type error', async ({ page }) => {
    // Capture console errors
    const consoleErrors: string[] = [];
    const networkErrors: string[] = [];
    
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
        console.log('❌ Console Error:', msg.text());
      }
    });

    page.on('response', (response) => {
      // Check for failed module loads
      if (response.url().includes('.js') && response.status() !== 200) {
        networkErrors.push(`${response.url()} - ${response.status()}`);
        console.log('❌ Network Error:', response.url(), response.status());
      }
      
      // Check for HTML responses when expecting JS
      if (response.url().includes('.js') && response.headers()['content-type']?.includes('text/html')) {
        networkErrors.push(`${response.url()} - HTML instead of JS`);
        console.log('❌ MIME Type Error:', response.url(), 'returned HTML instead of JS');
      }
    });

    console.log('🚀 Starting test - navigating to home page...');
    
    // Navigate to the home page
    try {
      await page.goto('http://localhost:3000', { 
        waitUntil: 'networkidle',
        timeout: 30000 
      });
      console.log('✅ Successfully loaded home page');
    } catch (error) {
      console.log('❌ Failed to load home page:', error);
      throw error;
    }

    // Wait for page to be ready
    await page.waitForLoadState('domcontentloaded');
    console.log('✅ DOM content loaded');

    // Check if CREATE GAME button exists
    const createButton = page.locator('button:has-text("Create Game")').first();
    await expect(createButton).toBeVisible({ timeout: 10000 });
    console.log('✅ CREATE GAME button is visible');

    // Take screenshot before clicking
    await page.screenshot({ path: 'before-create-game.png' });

    console.log('🔄 Clicking CREATE GAME button...');
    
    // Click the CREATE GAME button
    await createButton.click();
    
    // Wait a bit for any errors to manifest
    await page.waitForTimeout(3000);
    
    // Take screenshot after clicking
    await page.screenshot({ path: 'after-create-game.png' });

    console.log('\n📊 Test Results:');
    console.log('Console Errors:', consoleErrors.length);
    consoleErrors.forEach((error, i) => {
      console.log(`  ${i + 1}. ${error}`);
    });
    
    console.log('Network Errors:', networkErrors.length);
    networkErrors.forEach((error, i) => {
      console.log(`  ${i + 1}. ${error}`);
    });

    // Check for MIME type errors specifically
    const mimeTypeErrors = consoleErrors.filter(error => 
      error.includes('Expected a JavaScript-or-Wasm module script but the server responded with a MIME type of "text/html"')
    );

    if (mimeTypeErrors.length > 0) {
      console.log('🎯 MIME Type Errors Found:', mimeTypeErrors.length);
      mimeTypeErrors.forEach((error, i) => {
        console.log(`  ${i + 1}. ${error}`);
      });
      
      // Log the specific modules that are failing
      mimeTypeErrors.forEach(error => {
        const match = error.match(/at (\w+)/);
        if (match) {
          console.log(`🔍 Failed module: ${match[1]}`);
        }
      });
    } else {
      console.log('✅ No MIME type errors found');
    }

    // The test should fail if there are MIME type errors
    expect(mimeTypeErrors.length).toBe(0);
  });

  test('should check server response for module files', async ({ page }) => {
    console.log('🔍 Testing individual module responses...');
    
    const modules = [
      '/src/stores/playerStore.ts',
      '/src/stores/gameStore.ts', 
      '/src/stores/uiStore.ts',
      '/src/stores/notificationStore.ts'
    ];

    for (const module of modules) {
      const url = `http://localhost:3000${module}`;
      console.log(`Testing: ${url}`);
      
      try {
        const response = await page.request.get(url);
        const contentType = response.headers()['content-type'];
        const text = await response.text();
        
        console.log(`  Status: ${response.status()}`);
        console.log(`  Content-Type: ${contentType}`);
        console.log(`  Response preview: ${text.substring(0, 100)}...`);
        
        if (response.status() !== 200) {
          console.log(`❌ ${module} returned ${response.status()}`);
        }
        
        if (contentType?.includes('text/html')) {
          console.log(`❌ ${module} returned HTML instead of TypeScript/JS`);
        }
        
      } catch (error) {
        console.log(`❌ Failed to fetch ${module}:`, error);
      }
    }
  });
});