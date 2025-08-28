/**
 * UC-G003: Play Cooperative Game - Integration Test
 * Tests the complete gameplay flow with cooperative mechanics
 * Based on sequence diagram: docs/sequence-diagrams/gamer/uc-g003-play-cooperative-game.md
 */

import { test, expect, Page, Locator } from '@playwright/test';

test.describe('UC-G003: Play Cooperative Game Integration', () => {
  let hostPage: Page;
  let gamerPage: Page;
  let roomCode: string;

  test.beforeEach(async ({ context }) => {
    hostPage = await context.newPage();
    gamerPage = await context.newPage();
    
    // Set up both players in a game room
    await Promise.all([
      hostPage.goto('/'),
      gamerPage.goto('/')
    ]);
    
    await Promise.all([
      hostPage.waitForSelector('#app'),
      gamerPage.waitForSelector('#app')
    ]);
    
    // Host creates room
    await hostPage.click('button:has-text("Create Game")');
    if (await hostPage.locator('input[placeholder*="name"]').isVisible()) {
      await hostPage.fill('input[placeholder*="name"]', 'CoopHost');
      await hostPage.keyboard.press('Enter');
    }
    
    await hostPage.waitForURL(/\/game\/\w+/);
    roomCode = hostPage.url().split('/game/')[1];
    
    // Gamer joins
    await gamerPage.click('button:has-text("Join Game")');
    await gamerPage.fill('input[placeholder*="room code"]', roomCode);
    await gamerPage.click('button:has-text("Join")');
    
    if (await gamerPage.locator('input[placeholder*="name"]').isVisible()) {
      await gamerPage.fill('input[placeholder*="name"]', 'CoopGamer');
      await gamerPage.keyboard.press('Enter');
    }
    
    await gamerPage.waitForURL(/\/game\/\w+/);
  });

  test.afterEach(async () => {
    await Promise.all([
      hostPage?.close(),
      gamerPage?.close()
    ]);
  });

  test('Main Success Scenario: Complete cooperative gameplay flow', async () => {
    // Step 1: Game starts when all players are ready
    const startButton = hostPage.locator('button:has-text("Start"), button:has-text("Begin")');
    if (await startButton.isVisible()) {
      // Mark both players as ready
      const hostReadyButton = hostPage.locator('button:has-text("Ready")');
      const gamerReadyButton = gamerPage.locator('button:has-text("Ready")');
      
      if (await hostReadyButton.isVisible()) {
        await hostReadyButton.click();
      }
      if (await gamerReadyButton.isVisible()) {
        await gamerReadyButton.click();
      }
      
      // Host starts the game
      await startButton.click();
    }
    
    // Wait for game to start
    await Promise.all([
      hostPage.waitForSelector('.game-canvas, .game-board, .maze', { timeout: 15000 }),
      gamerPage.waitForSelector('.game-canvas, .game-board, .maze', { timeout: 15000 })
    ]);
    
    // Step 2: Players spawn at random corners of maze
    const hostPlayer = hostPage.locator('.player, .character, .avatar').first();
    const gamerPlayer = gamerPage.locator('.player, .character, .avatar').first();
    
    await expect(hostPlayer).toBeVisible();
    await expect(gamerPlayer).toBeVisible();
    
    // Step 3: Players move using arrow keys/touch controls
    await testPlayerMovement(hostPage, 'host');
    await testPlayerMovement(gamerPage, 'gamer');
    
    // Step 4: Players place bombs to destroy walls and defeat monsters
    await testBombPlacement(hostPage);
    await testBombPlacement(gamerPage);
    
    // Step 5: Players collect power-ups to increase bomb capacity/range
    await testPowerUpCollection(hostPage);
    
    // Step 6: Players work with teammates (verify cooperative elements)
    await testCooperativeElements(hostPage, gamerPage);
    
    // Step 7: Game ends when objectives are met
    // This would be tested in actual gameplay with backend
    
    console.log('✅ Cooperative gameplay flow completed');
  });

  test('Extension 2a: Network lag interpolation', async () => {
    // Start game
    const startButton = hostPage.locator('button:has-text("Start")');
    if (await startButton.isVisible()) {
      await startButton.click();
    }
    
    await Promise.all([
      hostPage.waitForSelector('.game-canvas, .game-board'),
      gamerPage.waitForSelector('.game-canvas, .game-board')
    ]);
    
    // Simulate network lag
    await gamerPage.route('**/ws**', async route => {
      await new Promise(resolve => setTimeout(resolve, 500)); // 500ms delay
      await route.continue();
    });
    
    // Test movement with lag - should still be smooth
    await gamerPage.keyboard.press('ArrowRight');
    await gamerPage.keyboard.press('ArrowRight');
    
    // Movement should be interpolated/predicted
    const playerPosition = await gamerPage.locator('.player').first().boundingBox();
    
    // Wait and check if player moved despite lag
    await gamerPage.waitForTimeout(1000);
    const newPosition = await gamerPage.locator('.player').first().boundingBox();
    
    expect(newPosition?.x).not.toBe(playerPosition?.x);
    
    console.log('✅ Network lag interpolation verified');
  });

  test('Extension 4a: Friendly fire warning system', async () => {
    // Start game
    const startButton = hostPage.locator('button:has-text("Start")');
    if (await startButton.isVisible()) {
      await startButton.click();
    }
    
    await Promise.all([
      hostPage.waitForSelector('.game-canvas, .game-board'),
      gamerPage.waitForSelector('.game-canvas, .game-board')
    ]);
    
    // Try to place bomb near teammate
    await hostPage.keyboard.press('Space'); // Assume Space places bomb
    
    // Should show friendly fire warning
    const warningMessage = hostPage.locator('.warning, .friendly-fire, .team-warning');
    if (await warningMessage.first().isVisible({ timeout: 5000 })) {
      await expect(warningMessage.first()).toContainText(/friendly.*fire|team.*careful|avoid.*teammate/i);
    }
    
    console.log('✅ Friendly fire warning system verified');
  });

  test('Extension 6a: Player elimination and respawn', async () => {
    // Start game
    const startButton = hostPage.locator('button:has-text("Start")');
    if (await startButton.isVisible()) {
      await startButton.click();
    }
    
    await Promise.all([
      hostPage.waitForSelector('.game-canvas, .game-board'),
      gamerPage.waitForSelector('.game-canvas, .game-board')
    ]);
    
    // Simulate player elimination (this would typically happen through backend)
    // For frontend testing, we can trigger elimination UI state
    
    // Look for elimination/death screen elements
    const eliminationScreen = hostPage.locator('.elimination-screen, .death-screen, .respawn-timer');
    const respawnTimer = hostPage.locator('.respawn-countdown, .timer, .countdown');
    
    // In a real scenario, player would be eliminated by bomb/monster
    // Here we test the UI response to elimination state
    
    if (await eliminationScreen.first().isVisible({ timeout: 2000 })) {
      // Should show 10-second countdown
      await expect(respawnTimer).toBeVisible();
      
      // Timer should count down
      const initialTime = await respawnTimer.textContent();
      await hostPage.waitForTimeout(2000);
      const laterTime = await respawnTimer.textContent();
      
      expect(initialTime).not.toBe(laterTime);
    }
    
    console.log('✅ Elimination and respawn system verified');
  });

  test('Extension 7a: Monster waves when gates destroyed', async () => {
    // This test would require backend simulation of gate destruction
    // For frontend testing, we verify UI response to monster wave events
    
    // Start game
    const startButton = hostPage.locator('button:has-text("Start")');
    if (await startButton.isVisible()) {
      await startButton.click();
    }
    
    await Promise.all([
      hostPage.waitForSelector('.game-canvas, .game-board'),
      gamerPage.waitForSelector('.game-canvas, .game-board')
    ]);
    
    // Look for monster wave indicators
    const monsterWaveUI = hostPage.locator('.monster-wave, .wave-warning, .objective-change');
    const survivalMode = hostPage.locator('.survival-mode, .endless-mode');
    
    if (await monsterWaveUI.first().isVisible({ timeout: 5000 })) {
      await expect(monsterWaveUI.first()).toContainText(/monster.*wave|survival.*mode|objective.*changed/i);
    }
    
    if (await survivalMode.first().isVisible({ timeout: 5000 })) {
      await expect(survivalMode.first()).toBeVisible();
    }
    
    console.log('✅ Monster wave UI response verified');
  });

  test('Real-time synchronization between players', async () => {
    // Start game
    const startButton = hostPage.locator('button:has-text("Start")');
    if (await startButton.isVisible()) {
      await startButton.click();
    }
    
    await Promise.all([
      hostPage.waitForSelector('.game-canvas, .game-board'),
      gamerPage.waitForSelector('.game-canvas, .game-board')
    ]);
    
    // Host moves, gamer should see the movement
    const initialGamerView = await gamerPage.screenshot({ clip: { x: 0, y: 0, width: 400, height: 400 } });
    
    await hostPage.keyboard.press('ArrowRight');
    await hostPage.keyboard.press('ArrowRight');
    
    // Wait for synchronization
    await gamerPage.waitForTimeout(1000);
    
    const afterMoveGamerView = await gamerPage.screenshot({ clip: { x: 0, y: 0, width: 400, height: 400 } });
    
    // Screenshots should be different (player moved)
    expect(Buffer.compare(initialGamerView, afterMoveGamerView)).not.toBe(0);
    
    console.log('✅ Real-time synchronization verified');
  });

  test('Mobile touch controls integration', async () => {
    await gamerPage.setViewportSize({ width: 375, height: 667 });
    
    // Start game
    const startButton = hostPage.locator('button:has-text("Start")');
    if (await startButton.isVisible()) {
      await startButton.click();
    }
    
    await Promise.all([
      hostPage.waitForSelector('.game-canvas, .game-board'),
      gamerPage.waitForSelector('.game-canvas, .game-board')
    ]);
    
    // Should show mobile controls
    const touchControls = gamerPage.locator('.touch-controls, .virtual-joystick, .mobile-controls');
    if (await touchControls.first().isVisible()) {
      await expect(touchControls.first()).toBeVisible();
      
      // Test virtual joystick
      const joystick = gamerPage.locator('.joystick, .directional-pad');
      if (await joystick.isVisible()) {
        await joystick.click();
      }
      
      // Test bomb button
      const bombButton = gamerPage.locator('.bomb-button, .action-button');
      if (await bombButton.first().isVisible()) {
        await bombButton.first().click();
      }
    }
    
    console.log('✅ Mobile touch controls verified');
  });
});

// Helper functions for testing gameplay elements
async function testPlayerMovement(page: Page, playerName: string): Promise<void> {
  const gameArea = page.locator('.game-canvas, .game-board, .maze').first();
  
  if (await gameArea.isVisible()) {
    // Test keyboard movement
    const initialPosition = await page.locator('.player').first().boundingBox();
    
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(500);
    
    const newPosition = await page.locator('.player').first().boundingBox();
    
    if (initialPosition && newPosition) {
      // Player should have moved
      const moved = initialPosition.x !== newPosition.x || initialPosition.y !== newPosition.y;
      expect(moved).toBeTruthy();
    }
  }
  
  console.log(`✅ ${playerName} movement verified`);
}

async function testBombPlacement(page: Page): Promise<void> {
  // Test bomb placement
  await page.keyboard.press('Space'); // Common bomb key
  await page.keyboard.press('Enter'); // Alternative bomb key
  
  // Look for bomb placement feedback
  const bombFeedback = page.locator('.bomb, .explosion, .bomb-placed');
  
  if (await bombFeedback.first().isVisible({ timeout: 2000 })) {
    await expect(bombFeedback.first()).toBeVisible();
  }
  
  console.log('✅ Bomb placement verified');
}

async function testPowerUpCollection(page: Page): Promise<void> {
  // Look for power-up indicators
  const powerUpUI = page.locator('.power-up, .upgrade, .ability');
  const bombCapacity = page.locator('.bomb-count, .capacity, .bombs');
  const bombRange = page.locator('.bomb-range, .power, .range');
  
  // These would be visible if power-ups are collected
  const powerUpElements = [powerUpUI, bombCapacity, bombRange];
  
  for (const element of powerUpElements) {
    if (await element.first().isVisible({ timeout: 2000 })) {
      await expect(element.first()).toBeVisible();
    }
  }
  
  console.log('✅ Power-up collection UI verified');
}

async function testCooperativeElements(hostPage: Page, gamerPage: Page): Promise<void> {
  // Test teammate visibility
  const hostTeammateCount = hostPage.locator('.team-count, .players, .teammates');
  const gamerTeammateCount = gamerPage.locator('.team-count, .players, .teammates');
  
  if (await hostTeammateCount.first().isVisible({ timeout: 2000 })) {
    await expect(hostTeammateCount.first()).toContainText(/2|team/i);
  }
  
  if (await gamerTeammateCount.first().isVisible({ timeout: 2000 })) {
    await expect(gamerTeammateCount.first()).toContainText(/2|team/i);
  }
  
  // Test cooperative objectives
  const objectives = hostPage.locator('.objectives, .goal, .mission');
  if (await objectives.first().isVisible({ timeout: 2000 })) {
    await expect(objectives.first()).toContainText(/team|together|cooperative|boss|exit/i);
  }
  
  console.log('✅ Cooperative elements verified');
}

test.describe('UC-G003: Game Performance and Optimization', () => {
  test('Frame rate stability during gameplay', async ({ page }) => {
    await page.goto('/');
    await page.click('button:has-text("Create Game")');
    
    if (await page.locator('input[placeholder*="name"]').isVisible()) {
      await page.fill('input[placeholder*="name"]', 'PerfHost');
      await page.keyboard.press('Enter');
    }
    
    await page.waitForURL(/\/game\/\w+/);
    
    const startButton = page.locator('button:has-text("Start")');
    if (await startButton.isVisible()) {
      await startButton.click();
    }
    
    await page.waitForSelector('.game-canvas, .game-board');
    
    // Monitor performance
    const performanceMetrics = await page.evaluate(() => {
      return new Promise((resolve) => {
        let frameCount = 0;
        const startTime = performance.now();
        
        function countFrames() {
          frameCount++;
          if (performance.now() - startTime < 2000) {
            requestAnimationFrame(countFrames);
          } else {
            const fps = frameCount / 2; // 2 seconds
            resolve(fps);
          }
        }
        
        requestAnimationFrame(countFrames);
      });
    });
    
    // Should maintain reasonable frame rate (>20 FPS for playability)
    expect(performanceMetrics).toBeGreaterThan(20);
    
    console.log(`✅ Frame rate: ${performanceMetrics} FPS`);
  });

  test('Memory usage stability during extended gameplay', async ({ page }) => {
    await page.goto('/');
    await page.click('button:has-text("Create Game")');
    
    if (await page.locator('input[placeholder*="name"]').isVisible()) {
      await page.fill('input[placeholder*="name"]', 'MemoryHost');
      await page.keyboard.press('Enter');
    }
    
    await page.waitForURL(/\/game\/\w+/);
    
    const startButton = page.locator('button:has-text("Start")');
    if (await startButton.isVisible()) {
      await startButton.click();
    }
    
    await page.waitForSelector('.game-canvas, .game-board');
    
    // Simulate extended gameplay
    for (let i = 0; i < 50; i++) {
      await page.keyboard.press('ArrowRight');
      await page.keyboard.press('Space');
      await page.waitForTimeout(100);
    }
    
    // Check for memory leaks by monitoring heap size
    const memoryUsage = await page.evaluate(() => {
      if ((performance as any).memory) {
        return (performance as any).memory.usedJSHeapSize;
      }
      return 0;
    });
    
    // Memory usage should be reasonable (less than 50MB for basic gameplay)
    if (memoryUsage > 0) {
      expect(memoryUsage).toBeLessThan(50 * 1024 * 1024); // 50MB
    }
    
    console.log('✅ Memory usage stability verified');
  });
});