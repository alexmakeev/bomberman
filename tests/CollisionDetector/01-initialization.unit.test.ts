/**
 * CollisionDetector Unit Tests - Initialization
 * Tests basic CollisionDetector initialization and interface compliance
 * 
 * References:
 * - src/modules/CollisionDetector/index.ts - Implementation
 * - High-performance collision detection for players, bombs, walls, and power-ups
 * - Constants: PLAYER_SIZE=0.8, BOMB_SIZE=0.6, POWERUP_SIZE=0.5
 */

import { createEventBusImpl } from '../../src/modules/EventBusImpl';
import { createCollisionDetector } from '../../src/modules/CollisionDetector';
import type { EventBus } from '../../src/interfaces/core/EventBus';

describe('CollisionDetector - Initialization', () => {
  let eventBus: EventBus;
  let collisionDetector: any;

  beforeEach(async () => {
    eventBus = createEventBusImpl();
    await eventBus.initialize({
      defaultTTL: 300000,
      maxEventSize: 64 * 1024,
      enablePersistence: false,
      enableTracing: false,
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
        samplingRate: 0.1,
        alertThresholds: {
          maxLatencyMs: 1000,
          maxErrorRate: 10,
          maxQueueDepth: 1000,
          maxMemoryBytes: 512 * 1024 * 1024,
        },
      },
    });

    collisionDetector = createCollisionDetector(eventBus);
  });

  afterEach(async () => {
    if (eventBus) {
      await eventBus.shutdown();
    }
  });

  describe('Constructor', () => {
    it('should create CollisionDetector instance with eventBus reference', () => {
      expect(collisionDetector).toBeDefined();
      expect(collisionDetector.eventBus).toBe(eventBus);
    });

    it('should have eventBus property accessible', () => {
      expect(collisionDetector.eventBus).toBe(eventBus);
      expect(collisionDetector.eventBus).toBeDefined();
      expect(typeof collisionDetector.eventBus).toBe('object');
    });
  });

  describe('Interface Compliance', () => {
    it('should implement all required methods', () => {
      // Core collision detection methods based on src/modules/CollisionDetector/index.ts
      expect(typeof collisionDetector.initialize).toBe('function');
      expect(typeof collisionDetector.checkPlayerMovement).toBe('function');
      expect(typeof collisionDetector.checkBombPlacement).toBe('function');
      expect(typeof collisionDetector.checkExplosionHit).toBe('function');
      expect(typeof collisionDetector.checkPowerUpCollection).toBe('function');
      expect(typeof collisionDetector.raycast).toBe('function');
    });

    it('should implement collider registration methods', () => {
      // Collider management methods
      expect(typeof collisionDetector.registerStaticCollider).toBe('function');
      expect(typeof collisionDetector.registerDynamicCollider).toBe('function');
      expect(typeof collisionDetector.unregisterDynamicCollider).toBe('function');
      expect(typeof collisionDetector.updateColliderPosition).toBe('function');
    });

    it('should have async methods that return Promises', async () => {
      const initResult = collisionDetector.initialize();
      expect(initResult).toBeInstanceOf(Promise);
      await initResult;

      const movementResult = collisionDetector.checkPlayerMovement('player-1', { x: 1, y: 1 }, { dx: 0.1, dy: 0 }, { width: 10, height: 10 });
      expect(movementResult).toBeInstanceOf(Promise);
      await movementResult;

      const bombResult = collisionDetector.checkBombPlacement('player-1', { x: 2, y: 2 }, { width: 10, height: 10 });
      expect(bombResult).toBeInstanceOf(Promise);
      await bombResult;

      const explosionResult = collisionDetector.checkExplosionHit([{ x: 3, y: 3 }], 'game-1');
      expect(explosionResult).toBeInstanceOf(Promise);
      await explosionResult;

      const powerUpResult = collisionDetector.checkPowerUpCollection('player-1', { x: 4, y: 4 });
      expect(powerUpResult).toBeInstanceOf(Promise);
      await powerUpResult;

      const raycastResult = collisionDetector.raycast({ x: 0, y: 0 }, { x: 1, y: 1 });
      expect(raycastResult).toBeInstanceOf(Promise);
      await raycastResult;
    });
  });

  describe('initialize()', () => {
    it('should initialize successfully', async () => {
      await expect(collisionDetector.initialize()).resolves.not.toThrow();
    });

    it('should handle multiple initializations gracefully', async () => {
      await collisionDetector.initialize();
      await expect(collisionDetector.initialize()).resolves.not.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should handle operations with uninitialized CollisionDetector', async () => {
      // Create detector but don't initialize
      const uninitializedDetector = createCollisionDetector(eventBus);

      // Should not throw during collision operations
      await expect(uninitializedDetector.checkPlayerMovement('player-1', { x: 1, y: 1 }, { dx: 0, dy: 0 }, { width: 10, height: 10 })).resolves.not.toThrow();
      await expect(uninitializedDetector.checkBombPlacement('player-1', { x: 2, y: 2 }, { width: 10, height: 10 })).resolves.not.toThrow();
    });

    it('should handle invalid positions gracefully', async () => {
      await collisionDetector.initialize();

      const invalidPositions = [
        { x: -1000, y: -1000 },
        { x: 1000, y: 1000 },
        { x: null, y: null } as any,
        { x: undefined, y: undefined } as any,
        { x: NaN, y: NaN },
        { x: Infinity, y: -Infinity },
      ];

      const mazeData = { width: 10, height: 10 };

      for (const position of invalidPositions) {
        await expect(collisionDetector.checkPlayerMovement('player-1', position, { dx: 0, dy: 0 }, mazeData)).resolves.toBeDefined();
        await expect(collisionDetector.checkBombPlacement('player-1', position, mazeData)).resolves.toBeDefined();
      }
    });

    it('should handle invalid movement vectors gracefully', async () => {
      await collisionDetector.initialize();

      const invalidMovements = [
        { dx: NaN, dy: 0 },
        { dx: 0, dy: Infinity },
        { dx: null, dy: 0 } as any,
        { dx: undefined, dy: undefined } as any,
      ];

      const mazeData = { width: 10, height: 10 };
      const position = { x: 5, y: 5 };

      for (const movement of invalidMovements) {
        await expect(collisionDetector.checkPlayerMovement('player-1', position, movement, mazeData)).resolves.toBeDefined();
      }
    });

    it('should handle null/undefined entity IDs gracefully', async () => {
      await collisionDetector.initialize();

      const position = { x: 1, y: 1 };
      const movement = { dx: 0.1, dy: 0 };
      const mazeData = { width: 10, height: 10 };

      const invalidIds = [null, undefined, '', '   '];

      for (const invalidId of invalidIds) {
        await expect(collisionDetector.checkPlayerMovement(invalidId as any, position, movement, mazeData)).resolves.toBeDefined();
        await expect(collisionDetector.checkBombPlacement(invalidId as any, position, mazeData)).resolves.toBeDefined();
        await expect(collisionDetector.checkPowerUpCollection(invalidId as any, position)).resolves.toBeDefined();
      }
    });
  });
});