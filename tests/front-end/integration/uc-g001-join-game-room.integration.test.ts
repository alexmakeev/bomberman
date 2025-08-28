/**
 * UC-G001: Join Game Room - Integration Test
 * Tests the complete flow of joining an existing game room
 * Based on sequence diagram: docs/sequence-diagrams/gamer/uc-g001-join-game-room.md
 */

import { test, expect, Page, BrowserContext } from '@playwright/test';

test.describe('UC-G001: Join Game Room Integration', () => {
  let hostPage: Page;
  let gamerPage: Page;
  let roomUrl: string;
  let roomCode: string;

  test.beforeEach(async ({ context }) => {
    // Create two pages - one for host, one for joining gamer
    hostPage = await context.newPage();
    gamerPage = await context.newPage();
    
    // Navigate both to home page
    await Promise.all([
      hostPage.goto('/'),
      gamerPage.goto('/')
    ]);
    
    // Wait for Vue apps to be ready
    await Promise.all([
      hostPage.waitForSelector('#app', { timeout: 10000 }),
      gamerPage.waitForSelector('#app', { timeout: 10000 })
    ]);
  });

  test.afterEach(async () => {
    await Promise.all([
      hostPage?.close(),
      gamerPage?.close()
    ]);
  });

  test('Main Success Scenario: Gamer successfully joins existing room', async () => {
    // Step 1: Host creates a room first (prerequisite)
    await hostPage.click('button:has-text("Create Game")');
    
    // Wait for room creation and capture room URL
    await hostPage.waitForURL(/\/game\/\w+/);
    roomUrl = hostPage.url();
    roomCode = roomUrl.split('/game/')[1];
    
    console.log(`Host created room: ${roomCode}`);
    
    // Verify host is in lobby
    await expect(hostPage.locator('.game-lobby')).toBeVisible();
    await expect(hostPage.locator('.player-list')).toContainText('Player');
    
    // Step 2: Gamer receives room URL and clicks join
    await gamerPage.click('button:has-text("Join Game")');
    
    // Step 3: System validates room exists and has available slots
    await gamerPage.fill('input[placeholder*="room code"]', roomCode);
    await gamerPage.click('button:has-text("Join")');
    
    // Step 4: Gamer is prompted for display name
    await expect(gamerPage.locator('input[placeholder*="name"], input[placeholder*="Name"]')).toBeVisible();
    await gamerPage.fill('input[placeholder*="name"], input[placeholder*="Name"]', 'TestGamer');
    await gamerPage.keyboard.press('Enter');
    
    // Step 5: System adds player to room and displays lobby
    await gamerPage.waitForURL(/\/game\/\w+/);
    await expect(gamerPage.locator('.game-lobby')).toBeVisible();
    
    // Step 6: Host receives notification of new player
    await expect(hostPage.locator('.player-list')).toContainText('TestGamer');
    
    // Verify both players can see each other
    await expect(hostPage.locator('.player-count')).toContainText('2');
    await expect(gamerPage.locator('.player-count')).toContainText('2');
    
    console.log('✅ Main success scenario completed');
  });

  test('Extension 3a: Room is full', async () => {
    // Create room and fill it to capacity (assuming max 4 players)
    await hostPage.click('button:has-text("Create Game")');
    await hostPage.waitForURL(/\/game\/\w+/);
    roomUrl = hostPage.url();
    roomCode = roomUrl.split('/game/')[1];
    
    // Fill room with players (simulate 3 more joining to reach capacity)
    // This would normally require backend simulation or test helpers
    
    // Attempt to join full room
    await gamerPage.click('button:has-text("Join Game")');
    await gamerPage.fill('input[placeholder*="room code"]', roomCode);
    await gamerPage.click('button:has-text("Join")');
    
    // Expect "Room is full" error message
    await expect(gamerPage.locator('.error-message, .notification, .alert')).toContainText(/room.*full/i);
    
    console.log('✅ Room full scenario handled');
  });

  test('Extension 3b: Room does not exist', async () => {
    const invalidRoomCode = 'INVALID123';
    
    // Attempt to join non-existent room
    await gamerPage.click('button:has-text("Join Game")');
    await gamerPage.fill('input[placeholder*="room code"]', invalidRoomCode);
    await gamerPage.click('button:has-text("Join")');
    
    // Expect "Room not found" error
    await expect(gamerPage.locator('.error-message, .notification, .alert')).toContainText(/room.*not.*found|invalid.*room/i);
    
    console.log('✅ Invalid room scenario handled');
  });

  test('Extension 4a: Name already taken', async () => {
    // Host creates room
    await hostPage.click('button:has-text("Create Game")');
    await hostPage.waitForURL(/\/game\/\w+/);
    roomCode = hostPage.url().split('/game/')[1];
    
    // First gamer joins
    await gamerPage.click('button:has-text("Join Game")');
    await gamerPage.fill('input[placeholder*="room code"]', roomCode);
    await gamerPage.click('button:has-text("Join")');
    
    if (await gamerPage.locator('input[placeholder*="name"]').isVisible()) {
      await gamerPage.fill('input[placeholder*="name"]', 'DuplicateName');
      await gamerPage.keyboard.press('Enter');
    }
    
    // Second gamer tries same name
    const secondGamerPage = await gamerPage.context().newPage();
    await secondGamerPage.goto('/');
    await secondGamerPage.waitForSelector('#app');
    
    await secondGamerPage.click('button:has-text("Join Game")');
    await secondGamerPage.fill('input[placeholder*="room code"]', roomCode);
    await secondGamerPage.click('button:has-text("Join")');
    
    if (await secondGamerPage.locator('input[placeholder*="name"]').isVisible()) {
      await secondGamerPage.fill('input[placeholder*="name"]', 'DuplicateName');
      await secondGamerPage.keyboard.press('Enter');
      
      // Expect name conflict error
      await expect(secondGamerPage.locator('.error-message, .notification, .alert')).toContainText(/name.*taken|already.*exists/i);
    }
    
    await secondGamerPage.close();
    console.log('✅ Duplicate name scenario handled');
  });

  test('Extension 6a: Network issues and auto-retry', async () => {
    // This test simulates network issues
    // Note: In real implementation, this would need network simulation
    
    await hostPage.click('button:has-text("Create Game")');
    await hostPage.waitForURL(/\/game\/\w+/);
    roomCode = hostPage.url().split('/game/')[1];
    
    // Simulate network issues by intercepting WebSocket connections
    await gamerPage.route('**/ws**', route => route.abort());
    
    await gamerPage.click('button:has-text("Join Game")');
    await gamerPage.fill('input[placeholder*="room code"]', roomCode);
    await gamerPage.click('button:has-text("Join")');
    
    // Should show connection/retry indicators
    await expect(gamerPage.locator('.connection-status, .retry-indicator, .loading')).toBeVisible();
    
    console.log('✅ Network issues scenario handled');
  });

  test('Real-time synchronization: Players see each other join instantly', async () => {
    // Create room
    await hostPage.click('button:has-text("Create Game")');
    await hostPage.waitForURL(/\/game\/\w+/);
    roomCode = hostPage.url().split('/game/')[1];
    
    // Monitor for real-time updates on host side
    const playerListPromise = hostPage.waitForFunction(
      (initialCount) => {
        const playerList = document.querySelector('.player-list, .players, .lobby-players');
        return playerList && playerList.children.length > initialCount;
      },
      1 // Initial count (just host)
    );
    
    // Gamer joins
    await gamerPage.click('button:has-text("Join Game")');
    await gamerPage.fill('input[placeholder*="room code"]', roomCode);
    await gamerPage.click('button:has-text("Join")');
    
    if (await gamerPage.locator('input[placeholder*="name"]').isVisible()) {
      await gamerPage.fill('input[placeholder*="name"]', 'RealtimeGamer');
      await gamerPage.keyboard.press('Enter');
    }
    
    // Host should see new player instantly
    await playerListPromise;
    await expect(hostPage.locator('.player-list, .players, .lobby-players')).toContainText('RealtimeGamer');
    
    console.log('✅ Real-time synchronization verified');
  });

  test('Mobile responsive: Join flow works on mobile viewport', async () => {
    // Set mobile viewport
    await gamerPage.setViewportSize({ width: 375, height: 667 });
    
    // Create room on desktop
    await hostPage.click('button:has-text("Create Game")');
    await hostPage.waitForURL(/\/game\/\w+/);
    roomCode = hostPage.url().split('/game/')[1];
    
    // Test mobile join flow
    await gamerPage.click('button:has-text("Join Game")');
    await gamerPage.fill('input[placeholder*="room code"]', roomCode);
    await gamerPage.click('button:has-text("Join")');
    
    // Verify mobile UI elements are properly sized
    const joinButton = gamerPage.locator('button:has-text("Join")');
    const buttonBox = await joinButton.boundingBox();
    
    // Button should be large enough for touch (minimum 44px)
    expect(buttonBox?.height).toBeGreaterThanOrEqual(44);
    
    if (await gamerPage.locator('input[placeholder*="name"]').isVisible()) {
      await gamerPage.fill('input[placeholder*="name"]', 'MobileGamer');
      await gamerPage.keyboard.press('Enter');
    }
    
    await expect(gamerPage.locator('.game-lobby')).toBeVisible();
    
    console.log('✅ Mobile responsive join flow verified');
  });
});

test.describe('UC-G001: Edge Cases and Error Handling', () => {
  test('Empty room code handling', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#app');
    
    await page.click('button:has-text("Join Game")');
    await page.click('button:has-text("Join")'); // Try to join without entering code
    
    // Should show validation error
    await expect(page.locator('.error-message, .validation-error, .alert')).toBeVisible();
  });

  test('Invalid room code format handling', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#app');
    
    const invalidCodes = ['123', '!@#$%^', 'toolongofacode123456789'];
    
    for (const invalidCode of invalidCodes) {
      await page.click('button:has-text("Join Game")');
      await page.fill('input[placeholder*="room code"]', invalidCode);
      await page.click('button:has-text("Join")');
      
      // Should show format validation error
      await expect(page.locator('.error-message, .validation-error, .alert')).toBeVisible();
      
      // Close dialog to try next code
      await page.keyboard.press('Escape');
    }
  });

  test('Connection timeout handling', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#app');
    
    // Intercept and delay all network requests to simulate timeout
    await page.route('**/*', async (route) => {
      await new Promise(resolve => setTimeout(resolve, 30000)); // 30s delay
      await route.continue();
    });
    
    await page.click('button:has-text("Join Game")');
    await page.fill('input[placeholder*="room code"]', 'TEST123');
    await page.click('button:has-text("Join")');
    
    // Should show timeout handling UI
    await expect(page.locator('.loading, .timeout-error, .retry-button')).toBeVisible({ timeout: 35000 });
  });
});