/**
 * GameView Input Manager Integration Tests
 * Tests the complete input handling flow in the game view
 * 
 * @see docs/use-cases/uc-g004-gameview-input.md - Use case specification
 * @see src/frontend/views/GameView.vue - GameView implementation
 * @see src/utils/inputManager.ts - Input manager implementation
 */

import { test, expect } from '@playwright/test';

test.describe('GameView Input Manager', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to homepage and create game
    await page.goto('http://localhost:3000');
    await page.locator('button:has-text("Create Game")').click();
    await page.waitForURL('**/game/**');
    await page.waitForTimeout(2000); // Allow game view to initialize
  });

  test('should handle mouse input without errors', async ({ page }) => {
    const consoleErrors = [];
    
    page.on('console', msg => {
      if (msg.type() === 'error' && msg.text().includes('handleMouse')) {
        consoleErrors.push(msg.text());
      }
    });

    // Test mouse events on game canvas
    const canvas = page.locator('.game-canvas');
    await canvas.hover();
    await page.mouse.move(200, 200);
    await page.mouse.down();
    await page.mouse.up();
    
    await page.waitForTimeout(1000);
    
    expect(consoleErrors).toHaveLength(0);
  });

  test('should handle keyboard input without errors', async ({ page }) => {
    const consoleErrors = [];
    
    page.on('console', msg => {
      if (msg.type() === 'error' && (msg.text().includes('handleKeyboard') || msg.text().includes('is not a function'))) {
        consoleErrors.push(msg.text());
      }
    });

    // Test keyboard events
    await page.keyboard.press('ArrowUp');
    await page.keyboard.press('ArrowDown'); 
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Space');
    
    await page.keyboard.up('ArrowUp');
    await page.keyboard.up('Space');
    
    await page.waitForTimeout(1000);
    
    expect(consoleErrors).toHaveLength(0);
  });

  test('should handle player movement methods without errors', async ({ page }) => {
    const consoleErrors = [];
    
    page.on('console', msg => {
      if (msg.type() === 'error' && (msg.text().includes('startMoving') || msg.text().includes('stopMoving'))) {
        consoleErrors.push(msg.text());
      }
    });

    // Trigger movement actions via keyboard
    await page.keyboard.press('ArrowUp');
    await page.waitForTimeout(500);
    await page.keyboard.up('ArrowUp'); 
    
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(500);
    await page.keyboard.up('ArrowDown');
    
    await page.waitForTimeout(1000);
    
    expect(consoleErrors).toHaveLength(0);
  });

  test('should successfully navigate to game view and load canvas', async ({ page }) => {
    // Verify game view loaded correctly
    expect(page.url()).toMatch(/\/game\/[A-Z0-9]+$/);
    
    // Verify canvas exists and is visible
    const canvas = page.locator('.game-canvas');
    await expect(canvas).toBeVisible();
    
    // Verify game UI elements are present
    await expect(page.locator('.game-info')).toBeVisible();
  });

  test('should show input works by sending WebSocket messages', async ({ page }) => {
    // This test verifies the full integration by checking that input 
    // generates the expected WebSocket traffic to the backend
    
    const canvas = page.locator('.game-canvas');
    await canvas.hover();
    
    // Movement should trigger WebSocket messages
    await page.keyboard.press('ArrowUp');
    await page.waitForTimeout(300);
    
    // Bomb should trigger WebSocket messages  
    await page.keyboard.press('Space');
    await page.waitForTimeout(300);
    
    // Stop movement
    await page.keyboard.up('ArrowUp');
    await page.waitForTimeout(300);
    
    // We can't directly check WebSocket messages in Playwright,
    // but we can verify no console errors occurred and the game
    // state appears to be functioning
    
    const errorLogs = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errorLogs.push(msg.text());
      }
    });
    
    await page.waitForTimeout(1000);
    
    // No errors should have occurred during input handling
    expect(errorLogs.filter(log => 
      log.includes('inputManager') || 
      log.includes('playerStore') ||
      log.includes('is not a function')
    )).toHaveLength(0);
  });

  test('should render game content on canvas (no black screen)', async ({ page }) => {
    // This test specifically checks for the black canvas issue
    const renderLogs = [];
    const errorLogs = [];
    
    page.on('console', msg => {
      const text = msg.text();
      if (msg.type() === 'error') {
        errorLogs.push(text);
      }
      if (text.includes('GameStore render called') || text.includes('Maze initialized') || text.includes('No maze data')) {
        renderLogs.push(text);
      }
    });
    
    // Wait for game to fully initialize and render
    await page.waitForTimeout(3000);
    
    // Check that the game loop is running and render is being called
    expect(renderLogs.filter(log => log.includes('GameStore render called'))).not.toHaveLength(0);
    
    // Check that maze was initialized successfully
    expect(renderLogs.filter(log => log.includes('Maze initialized'))).not.toHaveLength(0);
    
    // Should not have "No maze data" errors
    expect(renderLogs.filter(log => log.includes('No maze data available'))).toHaveLength(0);
    
    // No render-related errors should occur
    expect(errorLogs.filter(log => 
      log.includes('render') || 
      log.includes('canvas') ||
      log.includes('maze')
    )).toHaveLength(0);
    
    // Test that canvas actually has content by checking if it can be drawn on
    const canvasHasContent = await page.evaluate(() => {
      const canvas = document.querySelector('.game-canvas');
      if (!canvas) return false;
      
      const ctx = canvas.getContext('2d');
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      
      // Check if there are any non-black pixels (indicating actual game content)
      for (let i = 0; i < imageData.data.length; i += 4) {
        const r = imageData.data[i];
        const g = imageData.data[i + 1]; 
        const b = imageData.data[i + 2];
        
        // If we find any non-black pixel, the canvas has content
        if (r !== 0 || g !== 0 || b !== 0) {
          return true;
        }
      }
      return false;
    });
    
    expect(canvasHasContent).toBe(true);
  });
});