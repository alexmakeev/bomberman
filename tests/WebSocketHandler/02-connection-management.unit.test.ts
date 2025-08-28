/**
 * @fileoverview Unit tests for WebSocketHandler connection management
 * Testing authentication, rate limiting, and connection lifecycle
 * See docs/architecture/unified-event-system.md for event system integration
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createWebSocketHandler } from '../../src/modules/WebSocketHandler';
import { createEventBusImpl } from '../../src/modules/EventBusImpl';
import type { EventBus } from '../../src/interfaces/core/EventBus';

describe('WebSocketHandler - Connection Management', () => {
  let eventBus: EventBus;
  let handler: any;
  let mockSocket: any;

  beforeEach(async () => {
    eventBus = createEventBusImpl();
    await eventBus.initialize({
      defaultTTL: 300000,
      maxEventSize: 1024,
      enablePersistence: false,
      enableTracing: true,
      defaultRetry: {
        maxAttempts: 3,
        baseDelayMs: 1000,
        backoffMultiplier: 2,
        maxDelayMs: 10000,
      },
      monitoring: {
        enableMetrics: false,
        metricsIntervalMs: 30000,
        enableSampling: false,
        samplingRate: 0,
        alertThresholds: {
          maxLatencyMs: 1000,
          maxErrorRate: 10,
          maxQueueDepth: 1000,
          maxMemoryBytes: 512 * 1024 * 1024,
        },
      },
    });

    handler = createWebSocketHandler(eventBus);
    await handler.initialize({
      maxConnections: 1000,
      authTimeout: 5000,
      rateLimit: {
        maxMessages: 100,
        windowMs: 60000,
      },
    });

    mockSocket = {
      id: 'test-socket-123',
      userId: null,
      send: vi.fn(),
      close: vi.fn(),
      on: vi.fn(),
      off: vi.fn(),
      readyState: 1, // OPEN
      remoteAddress: '127.0.0.1',
    };
  });

  afterEach(async () => {
    await handler.shutdown();
    await eventBus.shutdown();
  });

  describe('Connection Authentication', () => {
    it('should require authentication within timeout period', async () => {
      const connectionResult = await handler.handleConnection('conn-001', mockSocket);
      
      expect(connectionResult.success).toBe(true);
      expect(connectionResult.requiresAuth).toBe(true);
      expect(connectionResult.authTimeout).toBe(5000);
    });

    it('should authenticate valid tokens successfully', async () => {
      await handler.handleConnection('conn-001', mockSocket);
      
      const authResult = await handler.authenticateConnection('conn-001', 'valid-auth-token');
      
      expect(authResult.success).toBe(true);
      expect(authResult.userId).toBeDefined();
      expect(authResult.permissions).toContain('game.play');
    });

    it('should reject invalid authentication tokens', async () => {
      await handler.handleConnection('conn-001', mockSocket);
      
      const authResult = await handler.authenticateConnection('conn-001', 'invalid-token');
      
      expect(authResult.success).toBe(false);
      expect(authResult.error).toBe('Invalid authentication token');
    });

    it('should close connection if auth timeout exceeded', async () => {
      const shortTimeoutHandler = createWebSocketHandler(eventBus);
      await shortTimeoutHandler.initialize({
        maxConnections: 1000,
        authTimeout: 100, // 100ms timeout
        rateLimit: {
          maxMessages: 100,
          windowMs: 60000,
        },
      });

      await shortTimeoutHandler.handleConnection('conn-001', mockSocket);
      
      // Wait for timeout to exceed
      await new Promise(resolve => setTimeout(resolve, 150));
      
      expect(mockSocket.close).toHaveBeenCalledWith(1008, 'Authentication timeout');
      
      await shortTimeoutHandler.shutdown();
    });
  });

  describe('Rate Limiting', () => {
    it('should allow messages within rate limit', async () => {
      await handler.handleConnection('conn-001', mockSocket);
      await handler.authenticateConnection('conn-001', 'valid-auth-token');

      // Send messages within limit (100 per minute)
      for (let i = 0; i < 50; i++) {
        const result = await handler.handleMessage('conn-001', {
          type: 'PLAYER_ACTION',
          data: { action: 'move', direction: 'up' },
        });
        expect(result.accepted).toBe(true);
      }
    });

    it('should reject messages exceeding rate limit', async () => {
      const strictHandler = createWebSocketHandler(eventBus);
      await strictHandler.initialize({
        maxConnections: 1000,
        authTimeout: 5000,
        rateLimit: {
          maxMessages: 5, // Very low limit for testing
          windowMs: 1000,
        },
      });

      await strictHandler.handleConnection('conn-001', mockSocket);
      await strictHandler.authenticateConnection('conn-001', 'valid-auth-token');

      // Exceed rate limit
      for (let i = 0; i < 10; i++) {
        const result = await strictHandler.handleMessage('conn-001', {
          type: 'PLAYER_ACTION',
          data: { action: 'move', direction: 'up' },
        });
        
        if (i < 5) {
          expect(result.accepted).toBe(true);
        } else {
          expect(result.accepted).toBe(false);
          expect(result.error).toBe('Rate limit exceeded');
        }
      }

      await strictHandler.shutdown();
    });

    it('should reset rate limit after window expires', async () => {
      const shortWindowHandler = createWebSocketHandler(eventBus);
      await shortWindowHandler.initialize({
        maxConnections: 1000,
        authTimeout: 5000,
        rateLimit: {
          maxMessages: 2,
          windowMs: 100, // 100ms window
        },
      });

      await shortWindowHandler.handleConnection('conn-001', mockSocket);
      await shortWindowHandler.authenticateConnection('conn-001', 'valid-auth-token');

      // Use up rate limit
      await shortWindowHandler.handleMessage('conn-001', { type: 'TEST', data: {} });
      await shortWindowHandler.handleMessage('conn-001', { type: 'TEST', data: {} });
      
      const blockedResult = await shortWindowHandler.handleMessage('conn-001', { type: 'TEST', data: {} });
      expect(blockedResult.accepted).toBe(false);

      // Wait for window to reset
      await new Promise(resolve => setTimeout(resolve, 150));

      // Should be allowed again
      const allowedResult = await shortWindowHandler.handleMessage('conn-001', { type: 'TEST', data: {} });
      expect(allowedResult.accepted).toBe(true);

      await shortWindowHandler.shutdown();
    });
  });

  describe('Connection Lifecycle', () => {
    it('should track connection count correctly', async () => {
      const initialStats = await handler.getConnectionStats();
      expect(initialStats.totalConnections).toBe(0);

      await handler.handleConnection('conn-001', mockSocket);
      await handler.handleConnection('conn-002', { ...mockSocket, id: 'test-socket-456' });

      const activeStats = await handler.getConnectionStats();
      expect(activeStats.totalConnections).toBe(2);
      expect(activeStats.authenticatedConnections).toBe(0);
    });

    it('should update stats after authentication', async () => {
      await handler.handleConnection('conn-001', mockSocket);
      await handler.authenticateConnection('conn-001', 'valid-auth-token');

      const stats = await handler.getConnectionStats();
      expect(stats.authenticatedConnections).toBe(1);
    });

    it('should cleanup connection on disconnect', async () => {
      await handler.handleConnection('conn-001', mockSocket);
      await handler.authenticateConnection('conn-001', 'valid-auth-token');

      const disconnectResult = await handler.handleDisconnection('conn-001');
      expect(disconnectResult.success).toBe(true);

      const stats = await handler.getConnectionStats();
      expect(stats.totalConnections).toBe(0);
      expect(stats.authenticatedConnections).toBe(0);
    });

    it('should enforce maximum connection limit', async () => {
      const limitedHandler = createWebSocketHandler(eventBus);
      await limitedHandler.initialize({
        maxConnections: 2, // Very low limit
        authTimeout: 5000,
        rateLimit: {
          maxMessages: 100,
          windowMs: 60000,
        },
      });

      // Fill up to limit
      await limitedHandler.handleConnection('conn-001', mockSocket);
      await limitedHandler.handleConnection('conn-002', { ...mockSocket, id: 'socket-2' });

      // Should reject additional connections
      const rejectedResult = await limitedHandler.handleConnection('conn-003', { ...mockSocket, id: 'socket-3' });
      expect(rejectedResult.success).toBe(false);
      expect(rejectedResult.error).toBe('Maximum connections exceeded');

      await limitedHandler.shutdown();
    });
  });

  describe('Message Routing', () => {
    it('should route authenticated messages to EventBus', async () => {
      const publishSpy = vi.spyOn(eventBus, 'publish');
      
      await handler.handleConnection('conn-001', mockSocket);
      await handler.authenticateConnection('conn-001', 'valid-auth-token');

      await handler.handleMessage('conn-001', {
        type: 'PLAYER_ACTION',
        data: { action: 'place_bomb', position: { x: 5, y: 3 } },
      });

      expect(publishSpy).toHaveBeenCalledWith({
        eventId: expect.any(String),
        category: 'GAME_STATE',
        type: 'player_action',
        sourceId: expect.any(String),
        targets: [],
        data: { action: 'place_bomb', position: { x: 5, y: 3 } },
        metadata: expect.any(Object),
        timestamp: expect.any(Number),
        version: '1.0.0',
      });
    });

    it('should broadcast events to subscribed connections', async () => {
      await handler.handleConnection('conn-001', mockSocket);
      await handler.handleConnection('conn-002', { ...mockSocket, id: 'socket-2', send: vi.fn() });
      
      await handler.authenticateConnection('conn-001', 'valid-auth-token');
      await handler.authenticateConnection('conn-002', 'valid-auth-token');

      await handler.subscribeToEvents('conn-001', ['GAME_STATE.bomb_exploded']);
      await handler.subscribeToEvents('conn-002', ['GAME_STATE.bomb_exploded']);

      // Simulate event broadcast
      await handler.broadcastEvent({
        eventId: 'evt-001',
        category: 'GAME_STATE',
        type: 'bomb_exploded',
        sourceId: 'game-123',
        targets: [],
        data: { position: { x: 5, y: 3 }, damage: 1 },
        metadata: { priority: 'high', ttl: 5000 },
        timestamp: Date.now(),
        version: '1.0.0',
      });

      expect(mockSocket.send).toHaveBeenCalled();
    });
  });
});