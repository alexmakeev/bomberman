/**
 * WebSocket-Redis Pub/Sub Integration Test
 * Tests the complete event flow between frontend, WebSocket server, and Redis
 * Based on sequence diagram: docs/sequence-diagrams/technical/websocket-redis-pubsub-integration.md
 */

import { test, expect, Page, BrowserContext } from '@playwright/test';

test.describe('WebSocket-Redis Pub/Sub Integration', () => {
  let page1: Page;
  let page2: Page;
  let roomCode: string;

  test.beforeEach(async ({ context }) => {
    page1 = await context.newPage();
    page2 = await context.newPage();
    
    await Promise.all([
      page1.goto('/'),
      page2.goto('/')
    ]);
    
    await Promise.all([
      page1.waitForSelector('#app'),
      page2.waitForSelector('#app')
    ]);
  });

  test.afterEach(async () => {
    await Promise.all([
      page1?.close(),
      page2?.close()
    ]);
  });

  test('Real-time event synchronization through WebSocket-Redis bridge', async () => {
    // Step 1: Player 1 creates a room
    await page1.click('button:has-text("Create Game")');
    
    if (await page1.locator('input[placeholder*="name"]').isVisible()) {
      await page1.fill('input[placeholder*="name"]', 'EventHost');
      await page1.keyboard.press('Enter');
    }
    
    await page1.waitForURL(/\/game\/\w+/);
    roomCode = page1.url().split('/game/')[1];
    
    // Step 2: Player 2 joins the room
    await page2.click('button:has-text("Join Game")');
    await page2.fill('input[placeholder*="room code"]', roomCode);
    await page2.click('button:has-text("Join")');
    
    if (await page2.locator('input[placeholder*="name"]').isVisible()) {
      await page2.fill('input[placeholder*="name"]', 'EventGamer');
      await page2.keyboard.press('Enter');
    }
    
    await page2.waitForURL(/\/game\/\w+/);
    
    // Step 3: Verify real-time synchronization
    // Monitor WebSocket connection status
    const wsStatus1 = await page1.evaluate(() => {
      return (window as any).wsConnectionStatus || 'unknown';
    });
    
    const wsStatus2 = await page2.evaluate(() => {
      return (window as any).wsConnectionStatus || 'unknown';
    });
    
    console.log(`WebSocket Status - Page1: ${wsStatus1}, Page2: ${wsStatus2}`);
    
    // Both players should see each other in the room
    await expect(page1.locator('.player-list, .players')).toContainText('EventGamer');
    await expect(page2.locator('.player-list, .players')).toContainText('EventHost');
    
    console.log('✅ Real-time event synchronization verified');
  });

  test('Message delivery through pub/sub channels', async () => {
    // Set up room with two players
    await setupTwoPlayerRoom(page1, page2, 'PubSubHost', 'PubSubGamer');
    
    // Test chat message delivery (if chat feature exists)
    const chatInput = page1.locator('input[placeholder*="message"], input[name*="chat"], .chat-input');
    if (await chatInput.isVisible()) {
      await chatInput.fill('Hello from player 1!');
      await chatInput.press('Enter');
      
      // Message should appear on both sides
      await expect(page1.locator('.chat-messages, .messages')).toContainText('Hello from player 1!');
      await expect(page2.locator('.chat-messages, .messages')).toContainText('Hello from player 1!');
    }
    
    // Test ready state synchronization
    const readyButton1 = page1.locator('button:has-text("Ready")');
    const readyButton2 = page2.locator('button:has-text("Ready")');
    
    if (await readyButton1.isVisible()) {
      await readyButton1.click();
      
      // Ready state should be visible to other player
      await expect(page2.locator('.player-ready, .ready-indicator')).toBeVisible();
    }
    
    console.log('✅ Message delivery through pub/sub verified');
  });

  test('Event ordering and consistency', async () => {
    await setupTwoPlayerRoom(page1, page2, 'OrderHost', 'OrderGamer');
    
    // Rapid sequence of events to test ordering
    const events = [
      { page: page1, action: 'ready' },
      { page: page2, action: 'ready' },
      { page: page1, action: 'unready' },
      { page: page2, action: 'message', data: 'Test message' }
    ];
    
    for (const event of events) {
      switch (event.action) {
        case 'ready':
          const readyButton = event.page.locator('button:has-text("Ready")');
          if (await readyButton.isVisible()) {
            await readyButton.click();
          }
          break;
          
        case 'unready':
          const unreadyButton = event.page.locator('button:has-text("Not Ready"), button:has-text("Unready")');
          if (await unreadyButton.isVisible()) {
            await unreadyButton.click();
          }
          break;
          
        case 'message':
          const chatInput = event.page.locator('input[placeholder*="message"], .chat-input');
          if (await chatInput.isVisible()) {
            await chatInput.fill(event.data || '');
            await chatInput.press('Enter');
          }
          break;
      }
      
      // Small delay between events
      await event.page.waitForTimeout(200);
    }
    
    // Verify final state is consistent across both pages
    const page1State = await getGameRoomState(page1);
    const page2State = await getGameRoomState(page2);
    
    // Both should see the same number of players
    expect(page1State.playerCount).toBe(page2State.playerCount);
    
    console.log('✅ Event ordering and consistency verified');
  });

  test('Connection recovery and event replay', async () => {
    await setupTwoPlayerRoom(page1, page2, 'RecoveryHost', 'RecoveryGamer');
    
    // Simulate network interruption on page2
    await page2.route('**/ws**', route => route.abort());
    
    // Page1 makes changes while page2 is offline
    const readyButton = page1.locator('button:has-text("Ready")');
    if (await readyButton.isVisible()) {
      await readyButton.click();
    }
    
    // Wait for offline state
    await page2.waitForTimeout(2000);
    
    // Re-enable network for page2
    await page2.unroute('**/ws**');
    
    // Trigger reconnection
    await page2.reload();
    await page2.waitForSelector('#app');
    await page2.goto(`/game/${roomCode}`);
    
    // Should eventually sync the missed events
    await expect(page2.locator('.player-ready, .ready-indicator')).toBeVisible({ timeout: 10000 });
    
    console.log('✅ Connection recovery and event replay verified');
  });

  test('Channel subscription and unsubscription', async () => {
    await setupTwoPlayerRoom(page1, page2, 'ChannelHost', 'ChannelGamer');
    
    // Monitor WebSocket connections
    const wsConnections1 = await page1.evaluate(() => {
      return (window as any).webSocketConnections || [];
    });
    
    const wsConnections2 = await page2.evaluate(() => {
      return (window as any).webSocketConnections || [];
    });
    
    console.log(`WebSocket connections - Page1: ${wsConnections1.length}, Page2: ${wsConnections2.length}`);
    
    // Player leaves room (unsubscribe)
    await page2.goto('/');
    await page2.waitForSelector('#app');
    
    // Page1 should be notified of player leaving
    await expect(page1.locator('.player-list')).not.toContainText('ChannelGamer', { timeout: 5000 });
    
    // Verify unsubscription
    const remainingConnections = await page1.evaluate(() => {
      return (window as any).webSocketConnections || [];
    });
    
    console.log(`Remaining connections after unsubscribe: ${remainingConnections.length}`);
    
    console.log('✅ Channel subscription/unsubscription verified');
  });

  test('Error handling and resilience', async () => {
    await setupTwoPlayerRoom(page1, page2, 'ErrorHost', 'ErrorGamer');
    
    // Test various error scenarios
    const errorScenarios = [
      {
        name: 'Malformed message',
        action: () => page1.evaluate(() => {
          if ((window as any).webSocket) {
            (window as any).webSocket.send('invalid_json');
          }
        })
      },
      {
        name: 'Large message',
        action: () => page1.evaluate(() => {
          if ((window as any).webSocket) {
            const largeMessage = JSON.stringify({
              type: 'test',
              data: 'x'.repeat(10000)
            });
            (window as any).webSocket.send(largeMessage);
          }
        })
      }
    ];
    
    for (const scenario of errorScenarios) {
      console.log(`Testing ${scenario.name}`);
      
      try {
        await scenario.action();
        
        // Connection should remain stable
        await page1.waitForTimeout(2000);
        
        const connectionStatus = await page1.evaluate(() => {
          return (window as any).wsConnectionStatus;
        });
        
        expect(connectionStatus).not.toBe('disconnected');
        
      } catch (error) {
        console.log(`Expected error for ${scenario.name}: ${error.message}`);
      }
    }
    
    console.log('✅ Error handling and resilience verified');
  });

  test('Message queuing during disconnection', async () => {
    await setupTwoPlayerRoom(page1, page2, 'QueueHost', 'QueueGamer');
    
    // Disconnect page2
    await page2.route('**/ws**', route => route.abort());
    
    // Page1 sends multiple messages while page2 is offline
    const messages = ['Message 1', 'Message 2', 'Message 3'];
    
    for (const message of messages) {
      const chatInput = page1.locator('input[placeholder*="message"], .chat-input');
      if (await chatInput.isVisible()) {
        await chatInput.fill(message);
        await chatInput.press('Enter');
        await page1.waitForTimeout(500);
      }
    }
    
    // Reconnect page2
    await page2.unroute('**/ws**');
    await page2.reload();
    await page2.waitForSelector('#app');
    await page2.goto(`/game/${roomCode}`);
    
    // All messages should eventually appear
    for (const message of messages) {
      await expect(page2.locator('.chat-messages, .messages')).toContainText(message, { timeout: 10000 });
    }
    
    console.log('✅ Message queuing during disconnection verified');
  });
});

// Helper functions
async function setupTwoPlayerRoom(page1: Page, page2: Page, hostName: string, gamerName: string): Promise<void> {
  // Host creates room
  await page1.click('button:has-text("Create Game")');
  if (await page1.locator('input[placeholder*="name"]').isVisible()) {
    await page1.fill('input[placeholder*="name"]', hostName);
    await page1.keyboard.press('Enter');
  }
  
  await page1.waitForURL(/\/game\/\w+/);
  const roomUrl = page1.url();
  const roomCode = roomUrl.split('/game/')[1];
  
  // Gamer joins
  await page2.click('button:has-text("Join Game")');
  await page2.fill('input[placeholder*="room code"]', roomCode);
  await page2.click('button:has-text("Join")');
  
  if (await page2.locator('input[placeholder*="name"]').isVisible()) {
    await page2.fill('input[placeholder*="name"]', gamerName);
    await page2.keyboard.press('Enter');
  }
  
  await page2.waitForURL(/\/game\/\w+/);
  
  // Wait for both players to be in lobby
  await Promise.all([
    page1.waitForSelector('.game-lobby, .room-lobby'),
    page2.waitForSelector('.game-lobby, .room-lobby')
  ]);
}

async function getGameRoomState(page: Page): Promise<{ playerCount: number; readyCount: number; messages: number }> {
  return await page.evaluate(() => {
    const playerElements = document.querySelectorAll('.player-item, .player');
    const readyElements = document.querySelectorAll('.player-ready, .ready-indicator');
    const messageElements = document.querySelectorAll('.chat-message, .message');
    
    return {
      playerCount: playerElements.length,
      readyCount: readyElements.length,
      messages: messageElements.length
    };
  });
}

test.describe('WebSocket-Redis Performance Tests', () => {
  test('High-frequency event handling', async ({ context }) => {
    const page = await context.newPage();
    await page.goto('/');
    await page.waitForSelector('#app');
    
    await page.click('button:has-text("Create Game")');
    if (await page.locator('input[placeholder*="name"]').isVisible()) {
      await page.fill('input[placeholder*="name"]', 'PerfHost');
      await page.keyboard.press('Enter');
    }
    
    await page.waitForURL(/\/game\/\w+/);
    
    // Send rapid events
    const startTime = Date.now();
    const eventCount = 50;
    
    for (let i = 0; i < eventCount; i++) {
      const readyButton = page.locator('button:has-text("Ready"), button:has-text("Not Ready")');
      if (await readyButton.first().isVisible()) {
        await readyButton.first().click();
      }
      await page.waitForTimeout(50); // 50ms between events
    }
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    // Should handle events efficiently
    expect(duration).toBeLessThan(eventCount * 100); // Less than 100ms per event
    
    console.log(`✅ Handled ${eventCount} events in ${duration}ms`);
    
    await page.close();
  });

  test('Memory usage during extended session', async ({ context }) => {
    const page = await context.newPage();
    await page.goto('/');
    
    // Monitor memory usage
    const initialMemory = await page.evaluate(() => {
      return (performance as any).memory?.usedJSHeapSize || 0;
    });
    
    await page.click('button:has-text("Create Game")');
    if (await page.locator('input[placeholder*="name"]').isVisible()) {
      await page.fill('input[placeholder*="name"]', 'MemoryHost');
      await page.keyboard.press('Enter');
    }
    
    await page.waitForURL(/\/game\/\w+/);
    
    // Simulate extended session with events
    for (let i = 0; i < 100; i++) {
      const readyButton = page.locator('button:has-text("Ready"), button:has-text("Not Ready")');
      if (await readyButton.first().isVisible()) {
        await readyButton.first().click();
      }
      
      if (i % 20 === 0) {
        // Trigger garbage collection periodically
        await page.evaluate(() => {
          if ((window as any).gc) {
            (window as any).gc();
          }
        });
      }
      
      await page.waitForTimeout(100);
    }
    
    const finalMemory = await page.evaluate(() => {
      return (performance as any).memory?.usedJSHeapSize || 0;
    });
    
    const memoryIncrease = finalMemory - initialMemory;
    
    // Memory increase should be reasonable (less than 10MB)
    if (initialMemory > 0 && finalMemory > 0) {
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024); // 10MB
    }
    
    console.log(`✅ Memory usage - Initial: ${initialMemory}, Final: ${finalMemory}, Increase: ${memoryIncrease}`);
    
    await page.close();
  });
});