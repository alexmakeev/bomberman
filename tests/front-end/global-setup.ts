/**
 * Playwright Global Setup
 * Configures the test environment before running UI tests
 */

import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  console.log('🎭 Setting up Playwright test environment...');
  
  // Check if we're running in Docker
  const isDocker = process.env.PLAYWRIGHT_BROWSERS_PATH === '/ms-playwright';
  console.log(`Environment: ${isDocker ? 'Docker' : 'Local'}`);
  
  // Wait for the dev server to be ready if needed
  if (config.webServer) {
    console.log(`Waiting for web server at ${config.webServer.url}...`);
  }
  
  // Skip browser verification when using remote browsers
  if (process.env.PW_TEST_CONNECT_WS_ENDPOINT) {
    console.log('✅ Using remote browser server, skipping local verification');
  } else {
    // Verify browser availability
    try {
      const browser = await chromium.launch({ headless: true });
      const context = await browser.newContext();
      const page = await context.newPage();
      
      // Test basic functionality
      await page.goto('data:text/html,<h1>Test</h1>');
      const title = await page.textContent('h1');
      
      if (title !== 'Test') {
        throw new Error('Browser test failed');
      }
      
      await browser.close();
      console.log('✅ Browser verification successful');
    } catch (error) {
      console.error('❌ Browser verification failed:', error);
      throw error;
    }
  }
  
  console.log('🚀 Global setup completed');
}

export default globalSetup;