/**
 * Frontend UI Inspector Test
 * Uses Playwright to examine current frontend state and take screenshots
 */

import { test, expect, Page } from '@playwright/test';

test.describe('Frontend UI Inspection', () => {
  test('Inspect current frontend state and missing elements', async ({ page }) => {
    // Navigate to frontend
    console.log('🔍 Inspecting frontend UI at http://localhost:3000');
    await page.goto('/');
    await page.waitForSelector('#app');
    
    // Take screenshot of current state
    await page.screenshot({ 
      path: 'frontend-current.png',
      fullPage: true 
    });
    console.log('📸 Screenshot saved: frontend-current.png');
    
    // Get page title and basic info
    const title = await page.title();
    console.log(`📄 Page title: ${title}`);
    
    // Check for expected buttons that integration tests need
    console.log('\n🔘 Checking for expected buttons...');
    
    const createGameBtn = await page.locator('button:has-text("Create Game")').count();
    const joinGameBtn = await page.locator('button:has-text("Join Game")').count();
    const startBtn = await page.locator('button:has-text("Start")').count();
    const playBtn = await page.locator('button:has-text("Play")').count();
    
    console.log(`   Create Game button: ${createGameBtn > 0 ? '✅ Found' : '❌ Missing'}`);
    console.log(`   Join Game button: ${joinGameBtn > 0 ? '✅ Found' : '❌ Missing'}`);
    console.log(`   Start button: ${startBtn > 0 ? '✅ Found' : '❌ Missing'}`);
    console.log(`   Play button: ${playBtn > 0 ? '✅ Found' : '❌ Missing'}`);
    
    // Check for input fields that tests expect
    console.log('\n📝 Checking for input fields...');
    
    const nameInputs = await page.locator('input[placeholder*="name"], input[name*="name"]').count();
    const roomInputs = await page.locator('input[placeholder*="room"], input[placeholder*="code"]').count();
    
    console.log(`   Name inputs: ${nameInputs} found`);
    console.log(`   Room/code inputs: ${roomInputs} found`);
    
    // Get all buttons currently on page
    const allButtons = await page.locator('button').all();
    const buttonTexts = await Promise.all(
      allButtons.map(btn => btn.textContent())
    );
    console.log(`\n🔘 Current buttons: ${buttonTexts.filter(t => t?.trim()).join(', ')}`);
    
    // Get all visible text content
    console.log('\n📋 Visible page content:');
    const bodyText = await page.locator('body').textContent();
    const words = bodyText?.split(/\s+/).filter(w => w && w.length > 2) || [];
    const uniqueWords = [...new Set(words)].slice(0, 20);
    console.log(`   Key words: ${uniqueWords.join(', ')}`);
    
    // Check current URL and routing
    const url = page.url();
    console.log(`\n🌐 Current URL: ${url}`);
    
    // Try to navigate to /game/test to see what happens
    console.log('\n🔗 Testing game room routing...');
    try {
      await page.goto('/game/test123');
      await page.waitForTimeout(1000);
      await page.screenshot({ path: 'frontend-game-route.png' });
      console.log('📸 Game route screenshot saved: frontend-game-route.png');
      console.log(`   Game route result: ${page.url()}`);
      
      // Check if we got redirected or see an error
      const currentPath = new URL(page.url()).pathname;
      if (currentPath === '/game/test123') {
        console.log('   ✅ Game route exists');
      } else {
        console.log(`   ❌ Game route redirected to: ${currentPath}`);
      }
    } catch (e) {
      console.log(`   ❌ Game route error: ${e.message}`);
    }
    
    // Summary of what's missing for integration tests
    console.log('\n📋 INTEGRATION TEST REQUIREMENTS:');
    console.log('   Missing elements needed for UC-G001 (Join Game Room):');
    if (createGameBtn === 0) console.log('   - "Create Game" button');
    if (joinGameBtn === 0) console.log('   - "Join Game" button'); 
    if (roomInputs === 0) console.log('   - Room code input field');
    if (nameInputs === 0) console.log('   - Player name input field');
    console.log('   - Game room routing (/game/{id})');
    console.log('   - WebSocket connections for real-time sync');
    
    // Make test pass - this is just for inspection
    expect(true).toBe(true);
  });
});