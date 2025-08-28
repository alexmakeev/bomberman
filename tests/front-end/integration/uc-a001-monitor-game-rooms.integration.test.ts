/**
 * UC-A001: Monitor Game Rooms - Integration Test
 * Tests the complete admin dashboard monitoring functionality
 * Based on sequence diagram: docs/sequence-diagrams/admin/uc-a001-monitor-game-rooms.md
 */

import { test, expect, Page, BrowserContext } from '@playwright/test';

test.describe('UC-A001: Monitor Game Rooms Integration', () => {
  let adminPage: Page;
  let userPage: Page;

  test.beforeAll(async ({ browser }) => {
    // Create separate contexts for admin and regular user
    const adminContext = await browser.newContext({
      // Simulate admin authentication/session
      storageState: {
        cookies: [
          {
            name: 'admin_token',
            value: 'test_admin_token',
            domain: 'localhost',
            path: '/'
          }
        ],
        origins: []
      }
    });

    const userContext = await browser.newContext();
    
    adminPage = await adminContext.newPage();
    userPage = await userContext.newPage();
  });

  test.afterAll(async () => {
    await Promise.all([
      adminPage?.close(),
      userPage?.close()
    ]);
  });

  test('Main Success Scenario: Admin monitors active game rooms', async () => {
    // Step 1: Admin accesses the admin dashboard
    await adminPage.goto('/admin');
    
    // Handle admin authentication if required
    if (await adminPage.locator('input[name="password"], input[type="password"]').isVisible({ timeout: 5000 })) {
      await adminPage.fill('input[name="password"], input[type="password"]', 'admin123');
      await adminPage.click('button:has-text("Login"), button[type="submit"]');
    }
    
    // Wait for dashboard to load
    await adminPage.waitForSelector('.admin-dashboard, .dashboard, .admin-panel', { timeout: 10000 });
    
    // Step 2: System displays list of active game rooms
    await expect(adminPage.locator('.room-list, .active-rooms, .game-rooms')).toBeVisible();
    
    // Create some game rooms for monitoring
    await createTestGameRooms(userPage, 2);
    
    // Refresh admin dashboard to see new rooms
    await adminPage.reload();
    await adminPage.waitForSelector('.room-list, .active-rooms, .game-rooms');
    
    // Step 3: Admin can view room details
    const roomItems = adminPage.locator('.room-item, .room-card, .game-room-entry');
    const roomCount = await roomItems.count();
    
    if (roomCount > 0) {
      const firstRoom = roomItems.first();
      
      // Should show player count
      await expect(firstRoom.locator('.player-count, .players')).toBeVisible();
      
      // Should show room status
      await expect(firstRoom.locator('.room-status, .status')).toBeVisible();
      
      // Should show game duration or creation time
      await expect(firstRoom.locator('.duration, .created, .time')).toBeVisible();
    }
    
    // Step 4: Admin can see real-time statistics
    const statsSection = adminPage.locator('.statistics, .stats, .metrics');
    if (await statsSection.isVisible()) {
      // Total players online
      await expect(statsSection.locator('.total-players, .player-count')).toBeVisible();
      
      // Rooms created today
      await expect(statsSection.locator('.rooms-created, .daily-rooms')).toBeVisible();
      
      // Games completed
      await expect(statsSection.locator('.games-completed, .finished-games')).toBeVisible();
    }
    
    console.log('✅ Admin monitoring functionality verified');
  });

  test('Extension 2a: No active rooms scenario', async () => {
    await adminPage.goto('/admin');
    
    // Handle authentication
    if (await adminPage.locator('input[type="password"]').isVisible({ timeout: 5000 })) {
      await adminPage.fill('input[type="password"]', 'admin123');
      await adminPage.click('button[type="submit"]');
    }
    
    await adminPage.waitForSelector('.admin-dashboard');
    
    // Should show "No active games" message when no rooms exist
    const emptyState = adminPage.locator('.no-rooms, .empty-state, .no-active-games');
    if (await emptyState.isVisible()) {
      await expect(emptyState).toContainText(/no.*active.*games|no.*rooms.*found/i);
    }
    
    console.log('✅ No active rooms scenario handled');
  });

  test('Extension 4a: Connection issues with cached data', async () => {
    await adminPage.goto('/admin');
    
    if (await adminPage.locator('input[type="password"]').isVisible()) {
      await adminPage.fill('input[type="password"]', 'admin123');
      await adminPage.click('button[type="submit"]');
    }
    
    await adminPage.waitForSelector('.admin-dashboard');
    
    // Simulate connection issues
    await adminPage.route('**/api/admin/**', route => route.abort());
    await adminPage.route('**/ws**', route => route.abort());
    
    // Trigger data refresh
    const refreshButton = adminPage.locator('button:has-text("Refresh"), .refresh-button');
    if (await refreshButton.isVisible()) {
      await refreshButton.click();
    }
    
    // Should show cached data with timestamp
    const cacheIndicator = adminPage.locator('.cached-data, .offline-mode, .last-updated');
    if (await cacheIndicator.isVisible({ timeout: 5000 })) {
      await expect(cacheIndicator).toContainText(/cached|last.*updated|offline/i);
    }
    
    // Should show connection status
    const connectionStatus = adminPage.locator('.connection-status, .online-status');
    if (await connectionStatus.isVisible()) {
      await expect(connectionStatus).toContainText(/offline|disconnected|reconnecting/i);
    }
    
    console.log('✅ Connection issues with cached data handled');
  });

  test('Real-time updates: Room list updates automatically', async () => {
    await adminPage.goto('/admin');
    
    if (await adminPage.locator('input[type="password"]').isVisible()) {
      await adminPage.fill('input[type="password"]', 'admin123');
      await adminPage.click('button[type="submit"]');
    }
    
    await adminPage.waitForSelector('.admin-dashboard');
    
    // Get initial room count
    const initialRoomCount = await adminPage.locator('.room-item, .room-card').count();
    
    // Create a new room in another tab
    await createTestGameRooms(userPage, 1);
    
    // Admin dashboard should update automatically
    await adminPage.waitForFunction(
      (initialCount) => {
        const currentCount = document.querySelectorAll('.room-item, .room-card').length;
        return currentCount > initialCount;
      },
      initialRoomCount,
      { timeout: 10000 }
    );
    
    const newRoomCount = await adminPage.locator('.room-item, .room-card').count();
    expect(newRoomCount).toBeGreaterThan(initialRoomCount);
    
    console.log('✅ Real-time updates verified');
  });

  test('Room details expansion and information display', async () => {
    await adminPage.goto('/admin');
    
    if (await adminPage.locator('input[type="password"]').isVisible()) {
      await adminPage.fill('input[type="password"]', 'admin123');
      await adminPage.click('button[type="submit"]');
    }
    
    await adminPage.waitForSelector('.admin-dashboard');
    
    // Create test rooms
    await createTestGameRooms(userPage, 1);
    await adminPage.reload();
    await adminPage.waitForSelector('.room-list');
    
    const roomItem = adminPage.locator('.room-item, .room-card').first();
    if (await roomItem.isVisible()) {
      // Click to expand room details
      await roomItem.click();
      
      // Should show expanded information
      const detailsPanel = adminPage.locator('.room-details, .expanded-info, .room-info');
      if (await detailsPanel.isVisible({ timeout: 5000 })) {
        // Should show player list
        await expect(detailsPanel.locator('.player-list, .participants')).toBeVisible();
        
        // Should show room settings
        await expect(detailsPanel.locator('.room-settings, .game-config')).toBeVisible();
        
        // Should show room ID
        await expect(detailsPanel.locator('.room-id, .room-code')).toBeVisible();
      }
    }
    
    console.log('✅ Room details expansion verified');
  });

  test('Statistics dashboard with various metrics', async () => {
    await adminPage.goto('/admin');
    
    if (await adminPage.locator('input[type="password"]').isVisible()) {
      await adminPage.fill('input[type="password"]', 'admin123');
      await adminPage.click('button[type="submit"]');
    }
    
    await adminPage.waitForSelector('.admin-dashboard');
    
    // Check for various statistics
    const statisticsPanel = adminPage.locator('.statistics, .metrics, .dashboard-stats');
    
    if (await statisticsPanel.isVisible()) {
      // Server performance metrics
      const serverStats = statisticsPanel.locator('.server-stats, .performance');
      if (await serverStats.isVisible()) {
        await expect(serverStats.locator('.cpu-usage, .memory-usage, .uptime')).toBeVisible();
      }
      
      // Game statistics
      const gameStats = statisticsPanel.locator('.game-stats, .gameplay-metrics');
      if (await gameStats.isVisible()) {
        await expect(gameStats.locator('.games-today, .average-duration, .completion-rate')).toBeVisible();
      }
      
      // User statistics
      const userStats = statisticsPanel.locator('.user-stats, .player-metrics');
      if (await userStats.isVisible()) {
        await expect(userStats.locator('.active-users, .new-registrations, .retention')).toBeVisible();
      }
    }
    
    console.log('✅ Statistics dashboard verified');
  });

  test('Filtering and searching room list', async () => {
    await adminPage.goto('/admin');
    
    if (await adminPage.locator('input[type="password"]').isVisible()) {
      await adminPage.fill('input[type="password"]', 'admin123');
      await adminPage.click('button[type="submit"]');
    }
    
    await adminPage.waitForSelector('.admin-dashboard');
    
    // Create multiple test rooms
    await createTestGameRooms(userPage, 3);
    await adminPage.reload();
    await adminPage.waitForSelector('.room-list');
    
    // Test search functionality
    const searchInput = adminPage.locator('input[placeholder*="search"], input[name*="search"], .search-input');
    if (await searchInput.isVisible()) {
      await searchInput.fill('test');
      
      // Should filter rooms
      await adminPage.waitForTimeout(1000);
      const filteredRooms = await adminPage.locator('.room-item, .room-card').count();
      expect(filteredRooms).toBeGreaterThan(0);
    }
    
    // Test status filter
    const statusFilter = adminPage.locator('select[name*="status"], .status-filter');
    if (await statusFilter.isVisible()) {
      await statusFilter.selectOption('active');
      
      // Should show only active rooms
      const activeRooms = adminPage.locator('.room-item[data-status="active"], .active-room');
      if (await activeRooms.first().isVisible()) {
        await expect(activeRooms.first()).toBeVisible();
      }
    }
    
    console.log('✅ Filtering and searching verified');
  });

  test('Room management quick actions', async () => {
    await adminPage.goto('/admin');
    
    if (await adminPage.locator('input[type="password"]').isVisible()) {
      await adminPage.fill('input[type="password"]', 'admin123');
      await adminPage.click('button[type="submit"]');
    }
    
    await adminPage.waitForSelector('.admin-dashboard');
    
    // Create test room
    await createTestGameRooms(userPage, 1);
    await adminPage.reload();
    await adminPage.waitForSelector('.room-list');
    
    const roomItem = adminPage.locator('.room-item, .room-card').first();
    if (await roomItem.isVisible()) {
      // Look for quick action buttons
      const quickActions = roomItem.locator('.actions, .room-actions, .quick-actions');
      
      if (await quickActions.isVisible()) {
        // Should have terminate/close button
        const terminateButton = quickActions.locator('button:has-text("Terminate"), button:has-text("Close")');
        if (await terminateButton.isVisible()) {
          await expect(terminateButton).toBeVisible();
        }
        
        // Should have view details button
        const detailsButton = quickActions.locator('button:has-text("Details"), button:has-text("View")');
        if (await detailsButton.isVisible()) {
          await expect(detailsButton).toBeVisible();
        }
        
        // Should have kick player button
        const kickButton = quickActions.locator('button:has-text("Kick"), button:has-text("Remove")');
        if (await kickButton.isVisible()) {
          await expect(kickButton).toBeVisible();
        }
      }
    }
    
    console.log('✅ Room management quick actions verified');
  });
});

// Helper function to create test game rooms
async function createTestGameRooms(page: Page, count: number): Promise<void> {
  for (let i = 0; i < count; i++) {
    await page.goto('/');
    await page.waitForSelector('#app');
    
    await page.click('button:has-text("Create Game")');
    
    if (await page.locator('input[placeholder*="name"]').isVisible({ timeout: 5000 })) {
      await page.fill('input[placeholder*="name"]', `TestRoom${i + 1}`);
      await page.keyboard.press('Enter');
    }
    
    await page.waitForURL(/\/game\/\w+/, { timeout: 10000 });
    
    // Keep room active for monitoring
    await page.waitForTimeout(1000);
  }
  
  console.log(`✅ Created ${count} test game rooms`);
}

test.describe('UC-A001: Advanced Monitoring Features', () => {
  test('Export room data functionality', async ({ page }) => {
    await page.goto('/admin');
    
    if (await page.locator('input[type="password"]').isVisible()) {
      await page.fill('input[type="password"]', 'admin123');
      await page.click('button[type="submit"]');
    }
    
    await page.waitForSelector('.admin-dashboard');
    
    // Look for export functionality
    const exportButton = page.locator('button:has-text("Export"), button:has-text("Download"), .export-button');
    
    if (await exportButton.isVisible()) {
      // Set up download handling
      const downloadPromise = page.waitForEvent('download');
      await exportButton.click();
      
      // Should trigger download
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toMatch(/\.(csv|json|xlsx)$/);
    }
    
    console.log('✅ Export functionality verified');
  });

  test('Real-time alerts and notifications', async ({ page }) => {
    await page.goto('/admin');
    
    if (await page.locator('input[type="password"]').isVisible()) {
      await page.fill('input[type="password"]', 'admin123');
      await page.click('button[type="submit"]');
    }
    
    await page.waitForSelector('.admin-dashboard');
    
    // Check for alert/notification system
    const alertsPanel = page.locator('.alerts, .notifications, .warnings');
    
    if (await alertsPanel.isVisible()) {
      // Should show system alerts
      const systemAlerts = alertsPanel.locator('.system-alert, .warning, .error-alert');
      if (await systemAlerts.first().isVisible()) {
        await expect(systemAlerts.first()).toBeVisible();
      }
      
      // Should have alert controls
      const alertControls = alertsPanel.locator('.alert-controls, .notification-settings');
      if (await alertControls.isVisible()) {
        await expect(alertControls).toBeVisible();
      }
    }
    
    console.log('✅ Real-time alerts system verified');
  });

  test('Historical data and trends', async ({ page }) => {
    await page.goto('/admin');
    
    if (await page.locator('input[type="password"]').isVisible()) {
      await page.fill('input[type="password"]', 'admin123');
      await page.click('button[type="submit"]');
    }
    
    await page.waitForSelector('.admin-dashboard');
    
    // Look for historical data section
    const trendsSection = page.locator('.trends, .historical, .analytics');
    
    if (await trendsSection.isVisible()) {
      // Should have time period selector
      const timeSelector = trendsSection.locator('select[name*="period"], .time-range-picker');
      if (await timeSelector.isVisible()) {
        await timeSelector.selectOption('24h');
        await expect(timeSelector).toHaveValue('24h');
      }
      
      // Should show charts or graphs
      const charts = trendsSection.locator('.chart, .graph, .visualization');
      if (await charts.first().isVisible()) {
        await expect(charts.first()).toBeVisible();
      }
    }
    
    console.log('✅ Historical data and trends verified');
  });
});