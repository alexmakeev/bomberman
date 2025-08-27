/**
 * GameEventHandlerImpl Unit Tests - Initialization
 * Tests initialization and basic functionality
 * 
 * Documentation References:
 * - src/interfaces/specialized/GameEventHandler.d.ts:124-127 (GameEventHandler interface)
 * - src/interfaces/specialized/GameEventHandler.d.ts:357 (GameEventHandlerFactory)
 * - src/modules/GameEventHandlerImpl.ts (implementation)
 */

import { GameEventHandlerImpl } from '../../src/modules/GameEventHandlerImpl';
import { EventBusImpl } from '../../src/modules/EventBusImpl';
import type { GameEventHandler } from '../../src/interfaces/specialized/GameEventHandler';
import type { EventBus, EventBusConfig } from '../../src/interfaces/core/EventBus';

describe('GameEventHandlerImpl - Initialization', () => {
  let eventBus: EventBus;
  let gameEventHandler: GameEventHandler;
  let mockConfig: EventBusConfig;

  beforeEach(async () => {
    eventBus = new EventBusImpl();
    mockConfig = {
      defaultTTL: 300000,
      maxEventSize: 64 * 1024,
      enablePersistence: false,
      enableTracing: true,
      defaultRetry: {
        maxAttempts: 3,
        baseDelayMs: 1000,
        backoffMultiplier: 2,
        maxDelayMs: 10000,
      },
      monitoring: {
        enableMetrics: true,
        metricsIntervalMs: 30000,
        enableSampling: true,
        samplingRate: 0.1,
        alertThresholds: {
          maxLatencyMs: 1000,
          maxErrorRate: 10,
          maxQueueDepth: 1000,
          maxMemoryBytes: 512 * 1024 * 1024,
        },
      },
    };

    await eventBus.initialize(mockConfig);
    gameEventHandler = new GameEventHandlerImpl(eventBus);
  });

  afterEach(async () => {
    if (eventBus) {
      await eventBus.shutdown();
    }
  });

  describe('Constructor', () => {
    /**
     * Tests interface requirement from GameEventHandler.d.ts:124-127
     * GameEventHandler must have readonly eventBus property
     */
    it('should create GameEventHandler instance with eventBus reference', () => {
      expect(gameEventHandler).toBeInstanceOf(GameEventHandlerImpl);
      expect(gameEventHandler).toBeDefined();
      expect(gameEventHandler.eventBus).toBe(eventBus);
    });

    /**
     * Tests that the eventBus property is readonly as specified in interface
     * GameEventHandler.d.ts:126 - readonly eventBus: EventBus
     */
    it('should have readonly eventBus property', () => {
      expect(gameEventHandler.eventBus).toBeDefined();
      expect(gameEventHandler.eventBus).toBeInstanceOf(EventBusImpl);
      
      // Verify it's the same reference passed in constructor
      expect(gameEventHandler.eventBus).toBe(eventBus);
    });
  });

  describe('Interface Compliance', () => {
    /**
     * Tests all required methods exist as specified in GameEventHandler.d.ts
     * This ensures the implementation matches the interface definition
     */
    it('should implement all required interface methods', () => {
      // Player Action Events (GameEventHandler.d.ts:128-150)
      expect(typeof gameEventHandler.publishPlayerMove).toBe('function');
      expect(typeof gameEventHandler.publishBombPlace).toBe('function');
      expect(typeof gameEventHandler.publishPowerUpCollect).toBe('function');

      // Game Mechanics Events (GameEventHandler.d.ts:151-173)
      expect(typeof gameEventHandler.publishBombExplode).toBe('function');
      expect(typeof gameEventHandler.publishPlayerEliminated).toBe('function');
      expect(typeof gameEventHandler.publishGameStateUpdate).toBe('function');

      // Game Lifecycle Events (GameEventHandler.d.ts:174-191)
      expect(typeof gameEventHandler.publishGameStarted).toBe('function');
      expect(typeof gameEventHandler.publishGameEnded).toBe('function');

      // Subscription Methods (GameEventHandler.d.ts:192-240)
      expect(typeof gameEventHandler.subscribeToGame).toBe('function');
      expect(typeof gameEventHandler.subscribeToPlayerEvents).toBe('function');
      expect(typeof gameEventHandler.subscribeToGameEventTypes).toBe('function');
      expect(typeof gameEventHandler.subscribeToTeamEvents).toBe('function');

      // Broadcast Methods (GameEventHandler.d.ts:241-287)
      expect(typeof gameEventHandler.broadcastToGame).toBe('function');
      expect(typeof gameEventHandler.broadcastToPlayers).toBe('function');
      expect(typeof gameEventHandler.broadcastToRadius).toBe('function');

      // Game State Management (GameEventHandler.d.ts:288-322)
      expect(typeof gameEventHandler.getCurrentGameState).toBe('function');
      expect(typeof gameEventHandler.replayGameEvents).toBe('function');
      expect(typeof gameEventHandler.getGameEventHistory).toBe('function');

      // Performance Optimization (GameEventHandler.d.ts:323-352)
      expect(typeof gameEventHandler.enableEventBatching).toBe('function');
      expect(typeof gameEventHandler.setEventPriorities).toBe('function');
      expect(typeof gameEventHandler.configureEventCompression).toBe('function');
    });

    /**
     * Tests that methods return Promises as specified in interface
     * All async methods in GameEventHandler.d.ts should return Promise<T>
     */
    it('should have async methods that return Promises', () => {
      const mockData = {
        playerId: 'player-1',
        gameId: 'game-1',
        fromPosition: { x: 1, y: 1 },
        toPosition: { x: 1, y: 2 },
        direction: 'down' as const,
        timestamp: Date.now(),
        inputSequence: 1,
      };

      // Test a few key methods return promises
      const moveResult = gameEventHandler.publishPlayerMove(mockData);
      expect(moveResult).toBeInstanceOf(Promise);

      const subscriptionResult = gameEventHandler.subscribeToGame('game-1', vi.fn());
      expect(subscriptionResult).toBeInstanceOf(Promise);

      const stateResult = gameEventHandler.getCurrentGameState('game-1');
      expect(stateResult).toBeInstanceOf(Promise);
    });
  });

  describe('Error Handling', () => {
    /**
     * Tests behavior when EventBus is not properly initialized
     * Should handle gracefully per general error handling patterns
     */
    it('should handle operations with uninitialized EventBus', async () => {
      const uninitializedBus = new EventBusImpl();
      const uninitializedHandler = new GameEventHandlerImpl(uninitializedBus);

      const mockData = {
        playerId: 'player-1',
        gameId: 'game-1',
        fromPosition: { x: 1, y: 1 },
        toPosition: { x: 1, y: 2 },
        direction: 'down' as const,
        timestamp: Date.now(),
        inputSequence: 1,
      };

      // Should not throw during method calls, but might fail at EventBus level
      await expect(uninitializedHandler.publishPlayerMove(mockData)).rejects.toBeDefined();
    });

    /**
     * Tests null/undefined parameter handling
     * Interface doesn't specify null handling, but good defensive programming
     */
    it('should handle null/undefined parameters gracefully', async () => {
      const nullData = null as any;
      const undefinedData = undefined as any;

      // These should either handle gracefully or throw meaningful errors
      await expect(gameEventHandler.publishPlayerMove(nullData)).rejects.toBeDefined();
      await expect(gameEventHandler.publishPlayerMove(undefinedData)).rejects.toBeDefined();
    });
  });
});