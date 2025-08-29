/**
 * Frontend UI Inspector using Playwright
 * Takes screenshots and examines current frontend state
 */

const { chromium } = require('playwright');

async function inspectFrontend() {
  console.log('🔍 Inspecting frontend UI...');
  
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });
  const page = await context.newPage();
  
  try {
    // Navigate to frontend
    console.log('📍 Navigating to http://localhost:3000');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    
    // Take screenshot of current state
    await page.screenshot({ 
      path: 'frontend-current.png',
      fullPage: true 
    });
    console.log('📸 Screenshot saved: frontend-current.png');
    
    // Get page title and basic info
    const title = await page.title();
    console.log(`📄 Page title: ${title}`);
    
    // Check for existing buttons
    console.log('\n🔘 Checking for expected buttons...');
    
    const createGameBtn = await page.locator('button:has-text("Create Game")').count();
    const joinGameBtn = await page.locator('button:has-text("Join Game")').count();
    const startBtn = await page.locator('button:has-text("Start")').count();
    const playBtn = await page.locator('button:has-text("Play")').count();
    
    console.log(`   Create Game button: ${createGameBtn > 0 ? '✅ Found' : '❌ Missing'}`);
    console.log(`   Join Game button: ${joinGameBtn > 0 ? '✅ Found' : '❌ Missing'}`);
    console.log(`   Start button: ${startBtn > 0 ? '✅ Found' : '❌ Missing'}`);
    console.log(`   Play button: ${playBtn > 0 ? '✅ Found' : '❌ Missing'}`);
    
    // Check for input fields
    console.log('\n📝 Checking for input fields...');
    
    const nameInputs = await page.locator('input[placeholder*="name"], input[name*="name"]').count();
    const roomInputs = await page.locator('input[placeholder*="room"], input[placeholder*="code"]').count();
    
    console.log(`   Name inputs: ${nameInputs} found`);
    console.log(`   Room/code inputs: ${roomInputs} found`);
    
    // Get all visible text content
    console.log('\n📋 Visible page content:');
    const bodyText = await page.locator('body').textContent();
    const words = bodyText.split(/\s+/).filter(w => w.length > 2);
    const uniqueWords = [...new Set(words)].slice(0, 20);
    console.log(`   Key words: ${uniqueWords.join(', ')}`);
    
    // Check current URL and routing
    const url = page.url();
    console.log(`\n🌐 Current URL: ${url}`);
    
    // Try to navigate to /game/test to see what happens
    console.log('\n🔗 Testing game room routing...');
    try {
      await page.goto('http://localhost:3000/game/test123', { timeout: 5000 });
      await page.screenshot({ path: 'frontend-game-route.png' });
      console.log('📸 Game route screenshot saved: frontend-game-route.png');
      console.log(`   Game route result: ${page.url()}`);
    } catch (e) {
      console.log(`   Game route error: ${e.message}`);
    }
    
  } catch (error) {
    console.error('❌ Error inspecting frontend:', error.message);
  } finally {
    await browser.close();
  }
}

inspectFrontend().catch(console.error);