/**
 * UnifiedGameServerImpl Unit Tests - Initialization
 * Tests server initialization and integration with all specialized handlers
 * 
 * Documentation References:
 * - src/interfaces/core/UnifiedGameServer.d.ts:74-100 (UnifiedGameServer interface)
 * - src/interfaces/core/UnifiedGameServer.d.ts:31-69 (Connection and status interfaces)
 * - src/modules/UnifiedGameServerImpl.ts (implementation)
 */

import { UnifiedGameServerImpl, createUnifiedGameServer, createConfiguredUnifiedGameServer } from '../../src/modules/UnifiedGameServerImpl';
import type { UnifiedGameServer, UnifiedGameServerConfig, ServerStatus } from '../../src/interfaces/core/UnifiedGameServer';
import type { EventBus } from '../../src/interfaces/core/EventBus';
import type { GameEventHandler } from '../../src/interfaces/specialized/GameEventHandler';
import type { UserNotificationHandler } from '../../src/interfaces/specialized/UserNotificationHandler';
import type { UserActionHandler } from '../../src/interfaces/specialized/UserActionHandler';

describe('UnifiedGameServerImpl - Initialization', () => {
  let gameServer: UnifiedGameServer;

  afterEach(async () => {
    if (gameServer) {
      await gameServer.stop();
    }
  });

  describe('Factory Functions', () => {
    /**
     * Tests factory function from UnifiedGameServerImpl.ts:172-175
     * Should create UnifiedGameServer instance
     */
    it('should create UnifiedGameServer via factory', () => {
      gameServer = createUnifiedGameServer();
      
      expect(gameServer).toBeDefined();
      expect(gameServer).toBeInstanceOf(UnifiedGameServerImpl);
    });

    /**
     * Tests configured factory from UnifiedGameServerImpl.ts:177-237
     * Should create and configure UnifiedGameServer with default config
     */
    it('should create configured UnifiedGameServer with defaults', async () => {
      gameServer = await createConfiguredUnifiedGameServer();
      
      expect(gameServer).toBeDefined();
      expect(gameServer).toBeInstanceOf(UnifiedGameServerImpl);
      
      // Should be configured but not started yet
      const status = gameServer.getStatus();
      expect(status.isRunning).toBe(false);
    });

    /**
     * Tests configured factory with custom config
     * Should merge custom config with defaults
     */
    it('should create configured UnifiedGameServer with custom config', async () => {
      const customConfig = {
        server: {
          port: 9000,
          maxConnections: 500,
        },
        eventBus: {
          defaultTTL: 600000,
          maxEventSize: 128 * 1024,
        },
      };

      gameServer = await createConfiguredUnifiedGameServer(customConfig);
      
      expect(gameServer).toBeDefined();
      expect(gameServer).toBeInstanceOf(UnifiedGameServerImpl);
    });
  });

  describe('Handler Integration', () => {
    beforeEach(async () => {
      gameServer = await createConfiguredUnifiedGameServer();
    });

    /**
     * Tests UnifiedGameServer.d.ts:77-82 - EventBus integration
     * Should provide access to underlying EventBus instance
     */
    it('should provide access to EventBus', () => {
      expect(gameServer.eventBus).toBeDefined();
      expect(typeof gameServer.eventBus.initialize).toBe('function');
      expect(typeof gameServer.eventBus.publish).toBe('function');
      expect(typeof gameServer.eventBus.subscribe).toBe('function');
    });

    /**
     * Tests UnifiedGameServer.d.ts:83-87 - GameEventHandler integration
     * Should provide access to GameEventHandler instance
     */
    it('should provide access to GameEventHandler', () => {
      expect(gameServer.gameEvents).toBeDefined();
      expect(gameServer.gameEvents.eventBus).toBe(gameServer.eventBus);
      expect(typeof gameServer.gameEvents.publishPlayerMove).toBe('function');
      expect(typeof gameServer.gameEvents.publishBombExplode).toBe('function');
      expect(typeof gameServer.gameEvents.subscribeToGame).toBe('function');
    });

    /**
     * Tests UnifiedGameServer.d.ts:89-93 - UserNotificationHandler integration
     * Should provide access to UserNotificationHandler instance
     */
    it('should provide access to UserNotificationHandler', () => {
      expect(gameServer.notifications).toBeDefined();
      expect(gameServer.notifications.eventBus).toBe(gameServer.eventBus);
      expect(typeof gameServer.notifications.sendNotification).toBe('function');
      expect(typeof gameServer.notifications.sendBulkNotifications).toBe('function');
      expect(typeof gameServer.notifications.createTemplate).toBe('function');
    });

    /**
     * Tests UnifiedGameServer.d.ts:95-99 - UserActionHandler integration
     * Should provide access to UserActionHandler instance
     */
    it('should provide access to UserActionHandler', () => {
      expect(gameServer.userActions).toBeDefined();
      expect(gameServer.userActions.eventBus).toBe(gameServer.eventBus);
      expect(typeof gameServer.userActions.trackAction).toBe('function');
      expect(typeof gameServer.userActions.trackActionBatch).toBe('function');
      expect(typeof gameServer.userActions.getUserBehaviorProfile).toBe('function');
    });

    /**
     * Tests that all handlers share the same EventBus instance
     * Ensures unified event system integration
     */
    it('should use same EventBus across all handlers', () => {
      const eventBus = gameServer.eventBus;
      
      expect(gameServer.gameEvents.eventBus).toBe(eventBus);
      expect(gameServer.notifications.eventBus).toBe(eventBus);
      expect(gameServer.userActions.eventBus).toBe(eventBus);
    });
  });

  describe('Server Lifecycle', () => {
    beforeEach(async () => {
      gameServer = await createConfiguredUnifiedGameServer();
    });

    /**
     * Tests server start functionality
     * Should transition from stopped to running state
     */
    it('should start successfully', async () => {
      let status = gameServer.getStatus();
      expect(status.isRunning).toBe(false);

      await gameServer.start();

      status = gameServer.getStatus();
      expect(status.isRunning).toBe(true);
      expect(status.startTime).toBeDefined();
      expect(status.uptime).toBeGreaterThanOrEqual(0);
    });

    /**
     * Tests server stop functionality
     * Should transition from running to stopped state
     */
    it('should stop successfully', async () => {
      await gameServer.start();
      
      let status = gameServer.getStatus();
      expect(status.isRunning).toBe(true);

      await gameServer.stop();

      status = gameServer.getStatus();
      expect(status.isRunning).toBe(false);
    });

    /**
     * Tests multiple start calls
     * Should handle multiple start calls gracefully
     */
    it('should handle multiple start calls gracefully', async () => {
      await gameServer.start();
      await gameServer.start(); // Second start should not throw
      
      const status = gameServer.getStatus();
      expect(status.isRunning).toBe(true);
    });

    /**
     * Tests multiple stop calls
     * Should handle multiple stop calls gracefully
     */
    it('should handle multiple stop calls gracefully', async () => {
      await gameServer.start();
      await gameServer.stop();
      await gameServer.stop(); // Second stop should not throw
      
      const status = gameServer.getStatus();
      expect(status.isRunning).toBe(false);
    });
  });

  describe('getStatus()', () => {
    beforeEach(async () => {
      gameServer = await createConfiguredUnifiedGameServer();
    });

    /**
     * Tests ServerStatus interface compliance
     * Should return all required status fields
     */
    it('should return complete server status when stopped', () => {
      const status: ServerStatus = gameServer.getStatus();
      
      expect(status).toHaveProperty('isRunning', false);
      expect(status).toHaveProperty('startTime');
      expect(status).toHaveProperty('uptime', 0);
      expect(status).toHaveProperty('activeConnections', 0);
      expect(status).toHaveProperty('activeRooms', 0);
      expect(status).toHaveProperty('activeGames', 0);
      expect(status).toHaveProperty('eventBusStatus');
      expect(status).toHaveProperty('gameHandlerStatus');
      expect(status).toHaveProperty('notificationStatus');
      expect(status).toHaveProperty('userActionStatus');
      
      expect(typeof status.eventBusStatus).toBe('string');
      expect(typeof status.gameHandlerStatus).toBe('string');
      expect(typeof status.notificationStatus).toBe('string');
      expect(typeof status.userActionStatus).toBe('string');
    });

    /**
     * Tests status when server is running
     * Should reflect running state with uptime
     */
    it('should return complete server status when running', async () => {
      await gameServer.start();
      
      // Wait a small amount of time for uptime
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const status: ServerStatus = gameServer.getStatus();
      
      expect(status.isRunning).toBe(true);
      expect(status.startTime).toBeDefined();
      expect(status.uptime).toBeGreaterThan(0);
      expect(status.activeConnections).toBeGreaterThanOrEqual(0);
      expect(status.activeRooms).toBeGreaterThanOrEqual(0);
      expect(status.activeGames).toBeGreaterThanOrEqual(0);
    });

    /**
     * Tests status field types
     * Should have correct data types for all fields
     */
    it('should have correct status field types', () => {
      const status = gameServer.getStatus();
      
      expect(typeof status.isRunning).toBe('boolean');
      expect(typeof status.uptime).toBe('number');
      expect(typeof status.activeConnections).toBe('number');
      expect(typeof status.activeRooms).toBe('number');
      expect(typeof status.activeGames).toBe('number');
      
      if (status.startTime !== undefined) {
        expect(status.startTime).toBeInstanceOf(Date);
      }
    });
  });

  describe('Interface Compliance', () => {
    beforeEach(async () => {
      gameServer = await createConfiguredUnifiedGameServer();
    });

    /**
     * Tests that all required methods exist
     * Should implement complete UnifiedGameServer interface
     */
    it('should implement all required interface methods', () => {
      // Lifecycle methods
      expect(typeof gameServer.start).toBe('function');
      expect(typeof gameServer.stop).toBe('function');
      expect(typeof gameServer.getStatus).toBe('function');
      
      // Connection handling
      expect(typeof gameServer.handleConnection).toBe('function');
      expect(typeof gameServer.handleDisconnection).toBe('function');
      
      // Room and game management
      expect(typeof gameServer.createRoom).toBe('function');
      expect(typeof gameServer.startGame).toBe('function');
      
      // Event publishing
      expect(typeof gameServer.publishEvent).toBe('function');
      
      // Handler access
      expect(gameServer.eventBus).toBeDefined();
      expect(gameServer.gameEvents).toBeDefined();
      expect(gameServer.notifications).toBeDefined();
      expect(gameServer.userActions).toBeDefined();
    });

    /**
     * Tests readonly properties
     * Should have readonly access to handlers
     */
    it('should have readonly handler properties', () => {
      const eventBus = gameServer.eventBus;
      const gameEvents = gameServer.gameEvents;
      const notifications = gameServer.notifications;
      const userActions = gameServer.userActions;
      
      expect(eventBus).toBe(gameServer.eventBus);
      expect(gameEvents).toBe(gameServer.gameEvents);
      expect(notifications).toBe(gameServer.notifications);
      expect(userActions).toBe(gameServer.userActions);
    });

    /**
     * Tests async method return types
     * Should return Promises for async operations
     */
    it('should have async methods that return Promises', () => {
      expect(gameServer.start()).toBeInstanceOf(Promise);
      expect(gameServer.stop()).toBeInstanceOf(Promise);
      
      const mockConnectionInfo = {
        connectionId: 'conn-123',
        socket: {} as any,
        ipAddress: '127.0.0.1',
        connectedAt: new Date(),
        playerId: undefined,
      };
      
      expect(gameServer.handleConnection(mockConnectionInfo)).toBeInstanceOf(Promise);
      expect(gameServer.handleDisconnection('conn-123')).toBeInstanceOf(Promise);
    });
  });

  describe('Error Handling', () => {
    beforeEach(async () => {
      gameServer = await createConfiguredUnifiedGameServer();
    });

    /**
     * Tests operations on stopped server
     * Should handle gracefully or provide meaningful errors
     */
    it('should handle operations on stopped server', async () => {
      // These operations might succeed (stub implementation) or fail gracefully
      const mockConnectionInfo = {
        connectionId: 'conn-test',
        socket: {} as any,
        ipAddress: '127.0.0.1',
        connectedAt: new Date(),
        playerId: undefined,
      };

      // Should not throw, but behavior depends on implementation
      await expect(gameServer.handleConnection(mockConnectionInfo)).resolves.toBeDefined();
      await expect(gameServer.handleDisconnection('conn-test')).resolves.toBeDefined();
    });

    /**
     * Tests null/undefined parameter handling
     * Should handle invalid parameters gracefully
     */
    it('should handle null/undefined parameters gracefully', async () => {
      await expect(gameServer.handleConnection(null as any)).rejects.toBeDefined();
      await expect(gameServer.handleDisconnection(null as any)).rejects.toBeDefined();
    });
  });
});