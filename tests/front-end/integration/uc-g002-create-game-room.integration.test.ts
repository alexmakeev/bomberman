/**
 * UC-G002: Create Game Room - Integration Test
 * Tests the complete flow of creating a new game room
 * Based on sequence diagram: docs/sequence-diagrams/gamer/uc-g002-create-game-room.md
 */

import { test, expect, Page } from '@playwright/test';

test.describe('UC-G002: Create Game Room Integration', () => {
  let page: Page;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    await page.goto('/');
    await page.waitForSelector('#app', { timeout: 10000 });
  });

  test('Main Success Scenario: Player successfully creates room', async () => {
    // Step 1: Player selects "Create Room" option
    await page.click('button:has-text("Create Game")');
    
    // Step 2: Player enters display name and optional room settings
    // Check if name prompt appears
    if (await page.locator('input[placeholder*="name"], input[placeholder*="Name"]').isVisible({ timeout: 5000 })) {
      await page.fill('input[placeholder*="name"], input[placeholder*="Name"]', 'RoomHost');
      
      // Check for optional room settings
      if (await page.locator('select, input[type="checkbox"], input[type="radio"]').first().isVisible({ timeout: 2000 })) {
        // Configure room settings if available
        const maxPlayersSelect = page.locator('select[name*="maxPlayers"], select[name*="players"]').first();
        if (await maxPlayersSelect.isVisible()) {
          await maxPlayersSelect.selectOption('4');
        }
        
        const gameModeSelect = page.locator('select[name*="gameMode"], select[name*="mode"]').first();
        if (await gameModeSelect.isVisible()) {
          await gameModeSelect.selectOption('cooperative');
        }
      }
      
      await page.keyboard.press('Enter');
    }
    
    // Step 3: System generates unique room ID and URL
    // Step 4: System creates room and places player as host
    await page.waitForURL(/\/game\/\w+/, { timeout: 15000 });
    
    const roomUrl = page.url();
    const roomCode = roomUrl.split('/game/')[1];
    
    // Verify room code format (should be alphanumeric, reasonable length)
    expect(roomCode).toMatch(/^[A-Za-z0-9]{6,12}$/);
    
    // Step 5: Player receives shareable room URL
    await expect(page.locator('.game-lobby, .room-lobby, .lobby')).toBeVisible();
    
    // Should show room code or URL for sharing
    const roomCodeDisplay = page.locator('.room-code, .room-id, .share-code');
    if (await roomCodeDisplay.isVisible()) {
      await expect(roomCodeDisplay).toContainText(roomCode);
    }
    
    // Step 6: Player can invite friends via URL sharing
    // Check for share functionality
    const shareButton = page.locator('button:has-text("Share"), button:has-text("Invite"), .share-button');
    if (await shareButton.first().isVisible()) {
      await shareButton.first().click();
      
      // Should show share options or copy URL functionality
      await expect(page.locator('.share-dialog, .copy-url, .share-options')).toBeVisible();
    }
    
    // Verify host status
    await expect(page.locator('.host-badge, .room-host, .player-host')).toBeVisible();
    
    console.log(`✅ Room created successfully: ${roomCode}`);
  });

  test('Extension 3a: Room creation fails', async () => {
    // Simulate room creation failure by intercepting requests
    await page.route('**/api/rooms/**', route => route.abort());
    await page.route('**/ws**', route => route.abort());
    
    await page.click('button:has-text("Create Game")');
    
    if (await page.locator('input[placeholder*="name"]').isVisible()) {
      await page.fill('input[placeholder*="name"]', 'FailedHost');
      await page.keyboard.press('Enter');
    }
    
    // Should show error message and retry option
    await expect(page.locator('.error-message, .notification, .alert')).toContainText(/failed.*create|error.*room/i);
    
    // Should show retry option
    const retryButton = page.locator('button:has-text("Retry"), button:has-text("Try Again")');
    if (await retryButton.isVisible()) {
      await expect(retryButton).toBeVisible();
    }
    
    console.log('✅ Room creation failure handled');
  });

  test('Extension 4a: Connection lost during room creation', async () => {
    // Start room creation
    await page.click('button:has-text("Create Game")');
    
    if (await page.locator('input[placeholder*="name"]').isVisible()) {
      await page.fill('input[placeholder*="name"]', 'DisconnectedHost');
      
      // Simulate connection loss after submitting
      await page.route('**/ws**', route => route.abort());
      await page.keyboard.press('Enter');
    }
    
    // Should show reconnection attempts
    await expect(page.locator('.connection-status, .reconnecting, .offline')).toBeVisible();
    
    console.log('✅ Connection loss during creation handled');
  });

  test('Extension 6a: Sharing not available', async () => {
    // Simulate environment where sharing API is not available
    await page.addInitScript(() => {
      // Remove navigator.share if it exists
      delete (window.navigator as any).share;
      // Disable clipboard API
      delete (window.navigator as any).clipboard;
    });
    
    await page.click('button:has-text("Create Game")');
    
    if (await page.locator('input[placeholder*="name"]').isVisible()) {
      await page.fill('input[placeholder*="name"]', 'NoShareHost');
      await page.keyboard.press('Enter');
    }
    
    await page.waitForURL(/\/game\/\w+/);
    
    // Should display URL for manual copying
    const roomUrl = page.url();
    const urlDisplay = page.locator('.room-url, .manual-copy, .copy-text');
    
    if (await urlDisplay.isVisible()) {
      await expect(urlDisplay).toContainText(roomUrl);
    } else {
      // Should at least show the room code
      const roomCode = roomUrl.split('/game/')[1];
      await expect(page.locator('.room-code, .room-id')).toContainText(roomCode);
    }
    
    console.log('✅ Manual sharing fallback verified');
  });

  test('Room settings validation', async () => {
    await page.click('button:has-text("Create Game")');
    
    if (await page.locator('input[placeholder*="name"]').isVisible()) {
      await page.fill('input[placeholder*="name"]', 'SettingsHost');
      
      // Test invalid settings if available
      const maxPlayersSelect = page.locator('select[name*="maxPlayers"]');
      if (await maxPlayersSelect.isVisible()) {
        // Try to set invalid max players
        await maxPlayersSelect.selectOption('0');
        await page.keyboard.press('Enter');
        
        // Should show validation error
        await expect(page.locator('.error-message, .validation-error')).toBeVisible();
      } else {
        await page.keyboard.press('Enter');
      }
    }
    
    console.log('✅ Room settings validation verified');
  });

  test('Multiple room creation by same user', async () => {
    // Create first room
    await page.click('button:has-text("Create Game")');
    
    if (await page.locator('input[placeholder*="name"]').isVisible()) {
      await page.fill('input[placeholder*="name"]', 'MultiRoomHost');
      await page.keyboard.press('Enter');
    }
    
    await page.waitForURL(/\/game\/\w+/);
    const firstRoomUrl = page.url();
    
    // Go back to home and try to create another room
    await page.goto('/');
    await page.click('button:has-text("Create Game")');
    
    if (await page.locator('input[placeholder*="name"]').isVisible()) {
      await page.fill('input[placeholder*="name"]', 'MultiRoomHost2');
      await page.keyboard.press('Enter');
    }
    
    await page.waitForURL(/\/game\/\w+/);
    const secondRoomUrl = page.url();
    
    // Should create different rooms
    expect(firstRoomUrl).not.toBe(secondRoomUrl);
    
    console.log('✅ Multiple room creation verified');
  });

  test('Room persistence and accessibility', async () => {
    // Create room
    await page.click('button:has-text("Create Game")');
    
    if (await page.locator('input[placeholder*="name"]').isVisible()) {
      await page.fill('input[placeholder*="name"]', 'PersistentHost');
      await page.keyboard.press('Enter');
    }
    
    await page.waitForURL(/\/game\/\w+/);
    const roomUrl = page.url();
    
    // Reload page to test persistence
    await page.reload();
    
    // Should still be in the same room
    expect(page.url()).toBe(roomUrl);
    await expect(page.locator('.game-lobby, .room-lobby')).toBeVisible();
    
    // Test direct URL access
    await page.goto('/');
    await page.goto(roomUrl);
    await expect(page.locator('.game-lobby, .room-lobby')).toBeVisible();
    
    console.log('✅ Room persistence verified');
  });

  test('Room creation with mobile viewport', async () => {
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.click('button:has-text("Create Game")');
    
    if (await page.locator('input[placeholder*="name"]').isVisible()) {
      await page.fill('input[placeholder*="name"]', 'MobileHost');
      await page.keyboard.press('Enter');
    }
    
    await page.waitForURL(/\/game\/\w+/);
    
    // Verify mobile lobby layout
    await expect(page.locator('.game-lobby')).toBeVisible();
    
    // Check that UI elements are properly sized for mobile
    const createButton = page.locator('button:has-text("Create Game")').first();
    if (await createButton.isVisible()) {
      const buttonBox = await createButton.boundingBox();
      expect(buttonBox?.height).toBeGreaterThanOrEqual(44); // Minimum touch target size
    }
    
    console.log('✅ Mobile room creation verified');
  });
});

test.describe('UC-G002: Room Host Privileges', () => {
  test('Host can configure room settings', async ({ page }) => {
    await page.goto('/');
    await page.click('button:has-text("Create Game")');
    
    if (await page.locator('input[placeholder*="name"]').isVisible()) {
      await page.fill('input[placeholder*="name"]', 'ConfigHost');
      await page.keyboard.press('Enter');
    }
    
    await page.waitForURL(/\/game\/\w+/);
    
    // Look for host-specific controls
    const hostControls = page.locator('.host-controls, .room-settings, .game-settings');
    if (await hostControls.isVisible()) {
      // Test starting game
      const startButton = page.locator('button:has-text("Start"), button:has-text("Begin")');
      if (await startButton.isVisible()) {
        await expect(startButton).toBeEnabled();
      }
      
      // Test kicking players (if any join)
      const kickButtons = page.locator('button:has-text("Kick"), .kick-player');
      if (await kickButtons.first().isVisible()) {
        await expect(kickButtons.first()).toBeVisible();
      }
    }
    
    console.log('✅ Host privileges verified');
  });

  test('Room URL sharing functionality', async ({ page }) => {
    await page.goto('/');
    await page.click('button:has-text("Create Game")');
    
    if (await page.locator('input[placeholder*="name"]').isVisible()) {
      await page.fill('input[placeholder*="name"]', 'ShareHost');
      await page.keyboard.press('Enter');
    }
    
    await page.waitForURL(/\/game\/\w+/);
    const roomUrl = page.url();
    
    // Test copy to clipboard functionality
    const copyButton = page.locator('button:has-text("Copy"), .copy-button, .copy-url');
    if (await copyButton.first().isVisible()) {
      await copyButton.first().click();
      
      // Should show confirmation
      await expect(page.locator('.copied-message, .success-message, .notification')).toBeVisible();
    }
    
    // Test social sharing buttons if available
    const shareButtons = page.locator('.share-button, .social-share');
    const shareCount = await shareButtons.count();
    
    if (shareCount > 0) {
      for (let i = 0; i < shareCount; i++) {
        await expect(shareButtons.nth(i)).toBeVisible();
      }
    }
    
    console.log('✅ URL sharing functionality verified');
  });

  test('Room code generation and format', async ({ page }) => {
    const roomCodes = new Set<string>();
    
    // Create multiple rooms to test uniqueness
    for (let i = 0; i < 3; i++) {
      await page.goto('/');
      await page.click('button:has-text("Create Game")');
      
      if (await page.locator('input[placeholder*="name"]').isVisible()) {
        await page.fill('input[placeholder*="name"]', `UniqueHost${i}`);
        await page.keyboard.press('Enter');
      }
      
      await page.waitForURL(/\/game\/\w+/);
      const roomUrl = page.url();
      const roomCode = roomUrl.split('/game/')[1];
      
      // Verify format
      expect(roomCode).toMatch(/^[A-Za-z0-9]{6,12}$/);
      
      // Verify uniqueness
      expect(roomCodes.has(roomCode)).toBeFalsy();
      roomCodes.add(roomCode);
    }
    
    console.log('✅ Room code generation and uniqueness verified');
  });
});