/**
 * Game UI Tests for Bomberman Frontend
 * Tests game-specific functionality and interactions
 */

import { test, expect } from '@playwright/test';

test.describe('Bomberman Frontend - Game UI', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#app', { timeout: 10000 });
    await page.waitForTimeout(1000);
  });

  test('should navigate to game view', async ({ page }) => {
    // Try to navigate to the game route
    try {
      await page.goto('/game');
      await page.waitForTimeout(1000);
      
      // Check if we're on the game page
      const url = page.url();
      console.log('Game page URL:', url);
      
      await page.screenshot({ path: 'test-results/game-view.png' });
      
      // Look for game-specific elements
      const canvases = await page.locator('canvas').count();
      console.log(`Found ${canvases} canvas elements in game view`);
      
    } catch (error) {
      console.log('Game route navigation failed:', error);
      await page.screenshot({ path: 'test-results/game-view-error.png' });
    }
  });

  test('should display game canvas if present', async ({ page }) => {
    // Check all routes for canvas elements
    const routes = ['/', '/game', '/game/test-room'];
    
    for (const route of routes) {
      try {
        console.log(`Testing route: ${route}`);
        await page.goto(route);
        await page.waitForTimeout(1000);
        
        const canvases = await page.locator('canvas').count();
        console.log(`Route ${route}: Found ${canvases} canvas elements`);
        
        if (canvases > 0) {
          // Test canvas dimensions
          const canvas = page.locator('canvas').first();
          const boundingBox = await canvas.boundingBox();
          console.log(`Canvas dimensions:`, boundingBox);
          
          await page.screenshot({ path: `test-results/canvas-${route.replace('/', 'root').replace('/', '-')}.png` });
        }
      } catch (error) {
        console.log(`Route ${route} failed:`, error);
      }
    }
  });

  test('should handle touch/mouse interactions on canvas', async ({ page }) => {
    // Navigate to game view
    await page.goto('/game');
    await page.waitForTimeout(1000);
    
    const canvases = await page.locator('canvas');
    const canvasCount = await canvases.count();
    
    if (canvasCount > 0) {
      const canvas = canvases.first();
      
      // Test mouse interactions
      await canvas.hover();
      await page.waitForTimeout(500);
      
      await canvas.click({ position: { x: 50, y: 50 } });
      await page.waitForTimeout(500);
      
      // Test touch simulation on mobile
      await page.setViewportSize({ width: 375, height: 667 });
      await canvas.tap({ position: { x: 100, y: 100 } });
      await page.waitForTimeout(500);
      
      await page.screenshot({ path: 'test-results/canvas-interactions.png' });
    } else {
      console.log('No canvas found for interaction testing');
    }
  });

  test('should check for game controls and UI elements', async ({ page }) => {
    // Look for common game UI elements across different routes
    const routes = ['/', '/game', '/settings'];
    
    for (const route of routes) {
      try {
        console.log(`Checking UI elements on route: ${route}`);
        await page.goto(route);
        await page.waitForTimeout(1000);
        
        // Look for common game UI patterns
        const elements = {
          buttons: await page.locator('button').count(),
          inputs: await page.locator('input').count(),
          canvases: await page.locator('canvas').count(),
          links: await page.locator('a').count(),
          forms: await page.locator('form').count(),
          images: await page.locator('img').count(),
        };
        
        console.log(`Route ${route} elements:`, elements);
        
        // Look for text that might indicate game features
        const bodyText = await page.locator('body').textContent() || '';
        const gameKeywords = ['bomb', 'player', 'score', 'health', 'power', 'game', 'room'];
        const foundKeywords = gameKeywords.filter(keyword => 
          bodyText.toLowerCase().includes(keyword)
        );
        
        console.log(`Route ${route} game keywords found:`, foundKeywords);
        
        await page.screenshot({ path: `test-results/ui-elements-${route.replace('/', 'root').replace('/', '-')}.png` });
        
      } catch (error) {
        console.log(`Route ${route} UI check failed:`, error);
      }
    }
  });

  test('should test WebSocket connection status', async ({ page }) => {
    // Check if WebSocket connections are being attempted
    const wsMessages: string[] = [];
    const consoleMessages: string[] = [];
    
    // Listen for WebSocket-related console messages
    page.on('console', msg => {
      const text = msg.text();
      consoleMessages.push(text);
      
      if (text.toLowerCase().includes('websocket') || 
          text.toLowerCase().includes('connect') ||
          text.toLowerCase().includes('ws:') ||
          text.toLowerCase().includes('socket')) {
        wsMessages.push(text);
      }
    });
    
    // Navigate and wait for initialization
    await page.goto('/');
    await page.waitForTimeout(3000); // Give time for WebSocket connection attempts
    
    console.log('WebSocket-related messages:', wsMessages);
    console.log('All console messages (first 10):');
    consoleMessages.slice(0, 10).forEach(msg => console.log('  -', msg));
    
    // Try to navigate to game and see if connection is attempted
    await page.goto('/game');
    await page.waitForTimeout(3000);
    
    await page.screenshot({ path: 'test-results/websocket-test.png' });
  });
});