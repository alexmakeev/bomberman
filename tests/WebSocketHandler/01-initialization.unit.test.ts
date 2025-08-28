/**
 * WebSocketHandler Unit Tests - Initialization
 * Tests basic WebSocketHandler initialization and configuration
 */

import { vi } from 'vitest';
import { createWebSocketHandler } from '../../src/modules/WebSocketHandler';
import { EventBusImpl } from '../../src/modules/EventBusImpl';
import type { EventBus, EventBusConfig } from '../../src/interfaces/core/EventBus';
import { EventCategory, EventPriority, DeliveryMode } from '../../src/types/events.d.ts';

describe('WebSocketHandler - Initialization', () => {
  let eventBus: EventBus;
  let mockConfig: EventBusConfig;

  beforeEach(async () => {
    eventBus = new EventBusImpl();
    mockConfig = {
      redisUrl: 'redis://localhost:6379',
      postgresUrl: 'postgresql://localhost:5432/bomberman',
      eventCategories: [
        EventCategory.GAME_STATE,
        EventCategory.PLAYER_ACTION,
        EventCategory.SYSTEM_STATUS
      ],
      rateLimiting: {
        enabled: true,
        maxEventsPerSecond: 100,
        burstLimit: 500,
      },
      middleware: {
        enabled: true,
        logEvents: true,
        validateEvents: true,
      },
      persistence: {
        enabled: true,
        retentionDays: 30,
      },
    };
    await eventBus.initialize(mockConfig);
  });

  afterEach(async () => {
    await eventBus.shutdown();
  });

  describe('Constructor', () => {
    it('should create WebSocketHandler instance', () => {
      const wsHandler = createWebSocketHandler(eventBus);
      
      expect(wsHandler).toBeDefined();
      expect(wsHandler.eventBus).toBe(eventBus);
    });

    it('should have eventBus property accessible', () => {
      const wsHandler = createWebSocketHandler(eventBus);
      
      expect(wsHandler).toHaveProperty('eventBus');
      expect(wsHandler.eventBus).toBeInstanceOf(EventBusImpl);
    });
  });

  describe('Interface Compliance', () => {
    it('should implement all required methods', () => {
      const wsHandler = createWebSocketHandler(eventBus);
      
      // Core methods
      expect(typeof wsHandler.initialize).toBe('function');
      expect(typeof wsHandler.handleConnection).toBe('function');
    });

    it('should have async methods that return Promises', async () => {
      const wsHandler = createWebSocketHandler(eventBus);
      
      const initializeResult = wsHandler.initialize();
      expect(initializeResult).toBeInstanceOf(Promise);
      await initializeResult;

      const mockSocket = { id: 'test-socket', readyState: 1 };
      const handleResult = wsHandler.handleConnection('conn-1', mockSocket);
      expect(handleResult).toBeInstanceOf(Promise);
      await handleResult;
    });
  });

  describe('initialize()', () => {
    it('should initialize successfully', async () => {
      const wsHandler = createWebSocketHandler(eventBus);
      
      await expect(wsHandler.initialize()).resolves.toBeUndefined();
    });

    it('should handle multiple initializations gracefully', async () => {
      const wsHandler = createWebSocketHandler(eventBus);
      
      await wsHandler.initialize();
      await expect(wsHandler.initialize()).resolves.toBeUndefined();
    });
  });

  describe('handleConnection()', () => {
    it('should handle connection successfully', async () => {
      const wsHandler = createWebSocketHandler(eventBus);
      await wsHandler.initialize();
      
      const connectionId = 'test-connection-1';
      const mockSocket = {
        id: connectionId,
        readyState: 1,
        on: vi.fn(),
        send: vi.fn(),
        close: vi.fn()
      };
      
      await expect(wsHandler.handleConnection(connectionId, mockSocket)).resolves.toBeUndefined();
    });

    it('should handle multiple connections', async () => {
      const wsHandler = createWebSocketHandler(eventBus);
      await wsHandler.initialize();
      
      const connections = [
        { id: 'conn-1', socket: { id: 'conn-1', readyState: 1 } },
        { id: 'conn-2', socket: { id: 'conn-2', readyState: 1 } },
        { id: 'conn-3', socket: { id: 'conn-3', readyState: 1 } }
      ];
      
      for (const conn of connections) {
        await expect(wsHandler.handleConnection(conn.id, conn.socket)).resolves.toBeUndefined();
      }
    });

    it('should handle concurrent connections', async () => {
      const wsHandler = createWebSocketHandler(eventBus);
      await wsHandler.initialize();
      
      const connectionPromises = Array.from({ length: 5 }, (_, i) => {
        const connectionId = `concurrent-conn-${i}`;
        const mockSocket = { id: connectionId, readyState: 1 };
        return wsHandler.handleConnection(connectionId, mockSocket);
      });
      
      await expect(Promise.all(connectionPromises)).resolves.toEqual([
        undefined, undefined, undefined, undefined, undefined
      ]);
    });
  });

  describe('Error Handling', () => {
    it('should handle operations with uninitialized WebSocketHandler', async () => {
      const wsHandler = createWebSocketHandler(eventBus);
      
      const connectionId = 'test-uninit';
      const mockSocket = { id: connectionId, readyState: 1 };
      
      // Should still work without initialization for now (stub implementation)
      await expect(wsHandler.handleConnection(connectionId, mockSocket)).resolves.toBeUndefined();
    });

    it('should handle invalid connection IDs gracefully', async () => {
      const wsHandler = createWebSocketHandler(eventBus);
      await wsHandler.initialize();
      
      const mockSocket = { id: 'test-socket', readyState: 1 };
      
      // Test edge cases
      await expect(wsHandler.handleConnection(null as any, mockSocket)).resolves.toBeUndefined();
      await expect(wsHandler.handleConnection(undefined as any, mockSocket)).resolves.toBeUndefined();
      await expect(wsHandler.handleConnection('' as any, mockSocket)).resolves.toBeUndefined();
      await expect(wsHandler.handleConnection('   ' as any, mockSocket)).resolves.toBeUndefined();
    });

    it('should handle invalid socket objects gracefully', async () => {
      const wsHandler = createWebSocketHandler(eventBus);
      await wsHandler.initialize();
      
      const connectionId = 'test-invalid-socket';
      
      // Test various invalid socket scenarios
      await expect(wsHandler.handleConnection(connectionId, null)).resolves.toBeUndefined();
      await expect(wsHandler.handleConnection(connectionId, undefined)).resolves.toBeUndefined();
      await expect(wsHandler.handleConnection(connectionId, {})).resolves.toBeUndefined();
      await expect(wsHandler.handleConnection(connectionId, { readyState: 0 })).resolves.toBeUndefined();
    });

    it('should handle creation without eventBus gracefully', () => {
      // Test that it handles null/undefined eventBus
      expect(() => createWebSocketHandler(null as any)).not.toThrow();
      expect(() => createWebSocketHandler(undefined as any)).not.toThrow();
    });
  });

  describe('Integration with EventBus', () => {
    it('should maintain reference to eventBus', async () => {
      const wsHandler = createWebSocketHandler(eventBus);
      
      expect(wsHandler.eventBus).toBe(eventBus);
      expect(wsHandler.eventBus.getStatus().running).toBe(true);
    });

    it('should work with different eventBus instances', async () => {
      const eventBus2 = new EventBusImpl();
      await eventBus2.initialize(mockConfig);
      
      const wsHandler1 = createWebSocketHandler(eventBus);
      const wsHandler2 = createWebSocketHandler(eventBus2);
      
      expect(wsHandler1.eventBus).toBe(eventBus);
      expect(wsHandler2.eventBus).toBe(eventBus2);
      expect(wsHandler1.eventBus).not.toBe(wsHandler2.eventBus);
      
      await eventBus2.shutdown();
    });
  });

  describe('Connection Management', () => {
    it('should handle rapid connection sequence', async () => {
      const wsHandler = createWebSocketHandler(eventBus);
      await wsHandler.initialize();
      
      const connectionSequence = Array.from({ length: 10 }, (_, i) => ({
        id: `rapid-conn-${i}`,
        socket: { id: `rapid-conn-${i}`, readyState: 1 }
      }));
      
      // Handle connections rapidly in sequence
      for (const conn of connectionSequence) {
        await wsHandler.handleConnection(conn.id, conn.socket);
      }
    });

    it('should handle duplicate connection IDs', async () => {
      const wsHandler = createWebSocketHandler(eventBus);
      await wsHandler.initialize();
      
      const connectionId = 'duplicate-conn';
      const mockSocket1 = { id: 'socket-1', readyState: 1 };
      const mockSocket2 = { id: 'socket-2', readyState: 1 };
      
      // Handle same connection ID with different sockets
      await expect(wsHandler.handleConnection(connectionId, mockSocket1)).resolves.toBeUndefined();
      await expect(wsHandler.handleConnection(connectionId, mockSocket2)).resolves.toBeUndefined();
    });

    it('should handle connections with various socket states', async () => {
      const wsHandler = createWebSocketHandler(eventBus);
      await wsHandler.initialize();
      
      const socketStates = [
        { readyState: 0, name: 'CONNECTING' },
        { readyState: 1, name: 'OPEN' },
        { readyState: 2, name: 'CLOSING' },
        { readyState: 3, name: 'CLOSED' }
      ];
      
      for (let i = 0; i < socketStates.length; i++) {
        const connectionId = `state-conn-${i}`;
        const mockSocket = { 
          id: connectionId, 
          readyState: socketStates[i].readyState,
          state: socketStates[i].name
        };
        
        await expect(wsHandler.handleConnection(connectionId, mockSocket)).resolves.toBeUndefined();
      }
    });
  });
});