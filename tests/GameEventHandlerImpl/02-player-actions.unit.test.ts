/**
 * GameEventHandlerImpl Unit Tests - Player Actions
 * Tests player action event publishing functionality
 * 
 * Documentation References:
 * - src/interfaces/specialized/GameEventHandler.d.ts:128-150 (Player Action Events)
 * - src/interfaces/specialized/GameEventHandler.d.ts:55-96 (Event data interfaces)
 * - src/interfaces/specialized/GameEventHandler.d.ts:15-21 (Player action event types)
 * - src/types/events.d.ts:404-411 (GameEventData interface)
 */

import { GameEventHandlerImpl } from '../../src/modules/GameEventHandlerImpl';
import { EventBusImpl } from '../../src/modules/EventBusImpl';
import type { GameEventHandler, PlayerMoveEventData, BombPlaceEventData, PowerUpCollectEventData } from '../../src/interfaces/specialized/GameEventHandler';
import type { EventBus, EventBusConfig, EventPublishResult } from '../../src/interfaces/core/EventBus';
import { Direction } from '../../src/types/common.d.ts';

describe('GameEventHandlerImpl - Player Actions', () => {
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

  describe('publishPlayerMove()', () => {
    /**
     * Tests GameEventHandler.d.ts:130-135 - publishPlayerMove method
     * Tests PlayerMoveEventData interface from GameEventHandler.d.ts:55-63
     */
    it('should publish player move event with correct data structure', async () => {
      const moveData: PlayerMoveEventData = {
        playerId: 'player-123',
        gameId: 'game-456',
        fromPosition: { x: 2, y: 3 },
        toPosition: { x: 2, y: 4 },
        direction: Direction.DOWN,
        timestamp: Date.now(),
        inputSequence: 42,
      };

      const result: EventPublishResult = await gameEventHandler.publishPlayerMove(moveData);

      expect(result).toBeDefined();
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('eventId');
      expect(result).toHaveProperty('targetsReached');
      expect(result).toHaveProperty('metadata');
      expect(result.success).toBe(true);
      expect(typeof result.eventId).toBe('string');
    });

    /**
     * Tests all Direction enum values from common.d.ts:67-72
     * Ensures player movement works in all cardinal directions
     */
    it('should handle movement in all directions', async () => {
      const directions = [Direction.UP, Direction.DOWN, Direction.LEFT, Direction.RIGHT];
      const basePosition = { x: 5, y: 5 };
      
      for (const direction of directions) {
        const moveData: PlayerMoveEventData = {
          playerId: 'player-123',
          gameId: 'game-456',
          fromPosition: basePosition,
          toPosition: basePosition, // In real game, this would be calculated
          direction,
          timestamp: Date.now(),
          inputSequence: Math.floor(Math.random() * 1000),
        };

        const result = await gameEventHandler.publishPlayerMove(moveData);
        expect(result.success).toBe(true);
      }
    });

    /**
     * Tests input sequence handling for movement ordering
     * PlayerMoveEventData.inputSequence from GameEventHandler.d.ts:62
     */
    it('should handle different input sequences', async () => {
      const sequences = [1, 100, 999, 1000, 9999];
      
      for (const inputSequence of sequences) {
        const moveData: PlayerMoveEventData = {
          playerId: 'player-123',
          gameId: 'game-456',
          fromPosition: { x: 1, y: 1 },
          toPosition: { x: 1, y: 2 },
          direction: Direction.DOWN,
          timestamp: Date.now(),
          inputSequence,
        };

        const result = await gameEventHandler.publishPlayerMove(moveData);
        expect(result.success).toBe(true);
      }
    });
  });

  describe('publishBombPlace()', () => {
    /**
     * Tests GameEventHandler.d.ts:136-142 - publishBombPlace method
     * Tests BombPlaceEventData interface from GameEventHandler.d.ts:65-73
     */
    it('should publish bomb place event with correct data structure', async () => {
      const bombData: BombPlaceEventData = {
        playerId: 'player-123',
        gameId: 'game-456',
        bombId: 'bomb-789',
        position: { x: 5, y: 7 },
        blastRadius: 3,
        timer: 3000, // 3 seconds
        timestamp: Date.now(),
      };

      const result: EventPublishResult = await gameEventHandler.publishBombPlace(bombData);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(typeof result.eventId).toBe('string');
    });

    /**
     * Tests different blast radius values
     * BombPlaceEventData.blastRadius from GameEventHandler.d.ts:70
     */
    it('should handle different blast radius values', async () => {
      const blastRadii = [1, 2, 3, 4, 5, 10];
      
      for (const blastRadius of blastRadii) {
        const bombData: BombPlaceEventData = {
          playerId: 'player-123',
          gameId: 'game-456',
          bombId: `bomb-${blastRadius}`,
          position: { x: 3, y: 3 },
          blastRadius,
          timer: 3000,
          timestamp: Date.now(),
        };

        const result = await gameEventHandler.publishBombPlace(bombData);
        expect(result.success).toBe(true);
      }
    });

    /**
     * Tests different timer values for bomb explosions
     * BombPlaceEventData.timer from GameEventHandler.d.ts:71
     */
    it('should handle different bomb timer values', async () => {
      const timers = [1000, 2000, 3000, 5000, 10000]; // milliseconds
      
      for (const timer of timers) {
        const bombData: BombPlaceEventData = {
          playerId: 'player-123',
          gameId: 'game-456',
          bombId: `bomb-timer-${timer}`,
          position: { x: 4, y: 4 },
          blastRadius: 2,
          timer,
          timestamp: Date.now(),
        };

        const result = await gameEventHandler.publishBombPlace(bombData);
        expect(result.success).toBe(true);
      }
    });
  });

  describe('publishPowerUpCollect()', () => {
    /**
     * Tests GameEventHandler.d.ts:143-149 - publishPowerUpCollect method
     * Tests PowerUpCollectEventData interface from GameEventHandler.d.ts:87-95
     */
    it('should publish power-up collection event with correct data structure', async () => {
      const powerUpData: PowerUpCollectEventData = {
        playerId: 'player-123',
        gameId: 'game-456',
        powerUpId: 'powerup-789',
        powerUpType: 'blast_radius',
        position: { x: 8, y: 2 },
        newAbilities: {
          blastRadius: 4,
          maxBombs: 3,
          speed: 1.2,
        },
        timestamp: Date.now(),
      };

      const result: EventPublishResult = await gameEventHandler.publishPowerUpCollect(powerUpData);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(typeof result.eventId).toBe('string');
    });

    /**
     * Tests different power-up types
     * PowerUpCollectEventData.powerUpType from GameEventHandler.d.ts:91
     */
    it('should handle different power-up types', async () => {
      const powerUpTypes = ['blast_radius', 'bomb_count', 'speed', 'kick_bombs', 'pierce_walls'];
      
      for (const powerUpType of powerUpTypes) {
        const powerUpData: PowerUpCollectEventData = {
          playerId: 'player-123',
          gameId: 'game-456',
          powerUpId: `powerup-${powerUpType}`,
          powerUpType,
          position: { x: 6, y: 6 },
          newAbilities: {
            type: powerUpType,
            level: 1,
          },
          timestamp: Date.now(),
        };

        const result = await gameEventHandler.publishPowerUpCollect(powerUpData);
        expect(result.success).toBe(true);
      }
    });

    /**
     * Tests complex ability updates
     * PowerUpCollectEventData.newAbilities from GameEventHandler.d.ts:93
     */
    it('should handle complex ability structures', async () => {
      const complexAbilities = {
        blastRadius: 5,
        maxBombs: 4,
        speed: 1.5,
        specialAbilities: ['kick_bombs', 'pierce_walls'],
        temporaryBoosts: {
          invincibility: { duration: 5000, active: true },
          doublePoints: { duration: 10000, active: false },
        },
        stats: {
          bombsPlaced: 25,
          wallsDestroyed: 100,
          powerUpsCollected: 8,
        },
      };

      const powerUpData: PowerUpCollectEventData = {
        playerId: 'player-123',
        gameId: 'game-456',
        powerUpId: 'powerup-complex',
        powerUpType: 'mega_boost',
        position: { x: 10, y: 10 },
        newAbilities: complexAbilities,
        timestamp: Date.now(),
      };

      const result = await gameEventHandler.publishPowerUpCollect(powerUpData);
      expect(result.success).toBe(true);
    });
  });

  describe('Event Data Validation', () => {
    /**
     * Tests parameter validation for all player action methods
     * Ensures required fields are present as per interface definitions
     */
    it('should validate required fields in event data', async () => {
      // Test missing required fields
      const incompleteData = {
        playerId: 'player-123',
        gameId: 'game-456',
        // Missing other required fields
      };

      await expect(
        gameEventHandler.publishPlayerMove(incompleteData as any)
      ).rejects.toBeDefined();

      await expect(
        gameEventHandler.publishBombPlace(incompleteData as any)
      ).rejects.toBeDefined();

      await expect(
        gameEventHandler.publishPowerUpCollect(incompleteData as any)
      ).rejects.toBeDefined();
    });

    /**
     * Tests timestamp handling across all player action events
     * All event data interfaces include timestamp field
     */
    it('should handle timestamp values correctly', async () => {
      const now = Date.now();
      const timestamps = [now, now - 1000, now + 1000];

      for (const timestamp of timestamps) {
        const moveData: PlayerMoveEventData = {
          playerId: 'player-123',
          gameId: 'game-456',
          fromPosition: { x: 1, y: 1 },
          toPosition: { x: 1, y: 2 },
          direction: Direction.DOWN,
          timestamp,
          inputSequence: 1,
        };

        const result = await gameEventHandler.publishPlayerMove(moveData);
        expect(result.success).toBe(true);
      }
    });
  });
});