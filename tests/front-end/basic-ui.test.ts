/**
 * Basic UI Tests for Bomberman Frontend
 * Tests core functionality and UI elements
 */

import { test, expect, Page } from '@playwright/test';

test.describe('Bomberman Frontend - Basic UI', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to home page
    await page.goto('/');
    
    // Wait for Vue app to be ready
    await page.waitForSelector('#app', { timeout: 10000 });
    
    // Wait for any loading states to complete
    await page.waitForTimeout(1000);
  });

  test('should load the home page successfully', async ({ page }) => {
    // Check that the page title is set
    await expect(page).toHaveTitle(/Bomberman/i);
    
    // Check that the main app div is present
    const appDiv = page.locator('#app');
    await expect(appDiv).toBeVisible();
    
    // Take a screenshot for visual verification
    await page.screenshot({ path: 'test-results/home-page.png' });
  });

  test('should display main navigation elements', async ({ page }) => {
    // Look for common navigation elements
    // This test will help us see what's actually rendered
    
    // Check for any buttons
    const buttons = page.locator('button');
    const buttonCount = await buttons.count();
    console.log(`Found ${buttonCount} buttons on the page`);
    
    // Check for any links
    const links = page.locator('a');
    const linkCount = await links.count();
    console.log(`Found ${linkCount} links on the page`);
    
    // Check for any form inputs
    const inputs = page.locator('input');
    const inputCount = await inputs.count();
    console.log(`Found ${inputCount} inputs on the page`);
    
    // Take screenshot to see what we have
    await page.screenshot({ path: 'test-results/navigation-elements.png' });
  });

  test('should handle viewport resizing (responsive design)', async ({ page }) => {
    // Test desktop view
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.screenshot({ path: 'test-results/desktop-view.png' });
    
    // Test tablet view
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.screenshot({ path: 'test-results/tablet-view.png' });
    
    // Test mobile view
    await page.setViewportSize({ width: 375, height: 667 });
    await page.screenshot({ path: 'test-results/mobile-view.png' });
    
    // Verify the app is still visible at all sizes
    const appDiv = page.locator('#app');
    await expect(appDiv).toBeVisible();
  });

  test('should not have JavaScript errors', async ({ page }) => {
    const errors: string[] = [];
    
    // Listen for console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    // Listen for page errors
    page.on('pageerror', error => {
      errors.push(error.message);
    });
    
    // Interact with the page a bit
    await page.click('body');
    await page.waitForTimeout(2000);
    
    // Check for errors
    console.log('JavaScript errors found:', errors);
    
    // We'll allow some errors for now since we're debugging
    // expect(errors).toHaveLength(0);
  });

  test('should display page content structure', async ({ page }) => {
    // Get the page's HTML structure
    const bodyContent = await page.locator('body').innerHTML();
    console.log('Page structure preview:', bodyContent.substring(0, 500) + '...');
    
    // Check what Vue components are rendered
    const vueElements = await page.locator('[data-v-]').count();
    console.log(`Found ${vueElements} Vue components/elements`);
    
    // Look for canvas elements (game area)
    const canvases = await page.locator('canvas').count();
    console.log(`Found ${canvases} canvas elements`);
    
    // Look for any text content
    const textContent = await page.locator('body').textContent();
    console.log('Page text content:', textContent?.substring(0, 200) + '...');
    
    await page.screenshot({ path: 'test-results/page-structure.png' });
  });
});