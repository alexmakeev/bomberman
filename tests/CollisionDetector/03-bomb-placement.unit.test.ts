/**
 * CollisionDetector Unit Tests - Bomb Placement Collision Detection
 * Tests bomb placement validation, grid alignment, and collision checking
 * 
 * References:
 * - src/modules/CollisionDetector/index.ts:125-156 - checkBombPlacement method
 * - src/modules/CollisionDetector/index.ts:325-343 - checkEntityCollisionAtGrid method
 * - src/modules/CollisionDetector/index.ts:345-354 - isWallAtGrid method
 * - Constants: BOMB_SIZE=0.6, grid-based placement with center alignment
 */

import { createEventBusImpl } from '../../src/modules/EventBusImpl';
import { createCollisionDetector } from '../../src/modules/CollisionDetector';
import type { EventBus } from '../../src/interfaces/core/EventBus';

describe('CollisionDetector - Bomb Placement Collision Detection', () => {
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
    await collisionDetector.initialize();
  });

  afterEach(async () => {
    if (eventBus) {
      await eventBus.shutdown();
    }
  });

  describe('checkBombPlacement()', () => {
    const mazeData = { width: 21, height: 21 };

    it('should allow bomb placement in valid open grid cell', async () => {
      const playerId = 'player-1';
      const position = { x: 5.3, y: 5.7 }; // Should be placed at grid (5, 5)

      const result = await collisionDetector.checkBombPlacement(playerId, position, mazeData);

      expect(result).toBeDefined();
      expect(result.hasCollision).toBe(false);
      expect(result.canMove).toBe(true);
      expect(result.adjustedPosition).toEqual({
        x: 5.5, // Centered in grid cell
        y: 5.5,
      });
    });

    it('should center bomb position in grid cell', async () => {
      const playerId = 'player-1';
      const testPositions = [
        { input: { x: 3.1, y: 7.9 }, expected: { x: 3.5, y: 7.5 } },
        { input: { x: 9.0, y: 11.0 }, expected: { x: 9.5, y: 11.5 } },
        { input: { x: 1.8, y: 3.2 }, expected: { x: 1.5, y: 3.5 } },
      ];

      for (const testCase of testPositions) {
        const result = await collisionDetector.checkBombPlacement(playerId, testCase.input, mazeData);
        
        expect(result.hasCollision).toBe(false);
        expect(result.canMove).toBe(true);
        expect(result.adjustedPosition).toEqual(testCase.expected);
      }
    });

    it('should prevent bomb placement on walls (even coordinates)', async () => {
      const playerId = 'player-1';
      const wallPositions = [
        { x: 0.5, y: 0.5 }, // Grid (0,0) - wall
        { x: 2.3, y: 4.7 }, // Grid (2,4) - wall
        { x: 4.1, y: 2.9 }, // Grid (4,2) - wall
        { x: 6.0, y: 8.0 }, // Grid (6,8) - wall
      ];

      for (const position of wallPositions) {
        const result = await collisionDetector.checkBombPlacement(playerId, position, mazeData);

        expect(result.hasCollision).toBe(true);
        expect(result.canMove).toBe(false);
        expect(result.collisionType).toBe('wall');
      }
    });

    it('should prevent bomb placement on perimeter walls', async () => {
      const playerId = 'player-1';
      const perimeterPositions = [
        { x: 0.5, y: 5.5 }, // Left border
        { x: 20.5, y: 5.5 }, // Right border
        { x: 5.5, y: 0.5 }, // Top border
        { x: 5.5, y: 20.5 }, // Bottom border
      ];

      for (const position of perimeterPositions) {
        const result = await collisionDetector.checkBombPlacement(playerId, position, mazeData);

        expect(result.hasCollision).toBe(true);
        expect(result.canMove).toBe(false);
        expect(result.collisionType).toBe('wall');
      }
    });

    it('should allow bomb placement in open areas (odd coordinates)', async () => {
      const playerId = 'player-1';
      const openPositions = [
        { x: 1.5, y: 1.5 }, // Grid (1,1) - open
        { x: 3.5, y: 5.5 }, // Grid (3,5) - open
        { x: 5.5, y: 3.5 }, // Grid (5,3) - open
        { x: 7.2, y: 9.8 }, // Grid (7,9) - open
      ];

      for (const position of openPositions) {
        const result = await collisionDetector.checkBombPlacement(playerId, position, mazeData);

        expect(result.hasCollision).toBe(false);
        expect(result.canMove).toBe(true);
        expect(result.adjustedPosition).toBeDefined();
      }
    });

    it('should detect existing bomb at same grid position', async () => {
      const playerId = 'player-1';
      const position = { x: 5.5, y: 5.5 };

      // Register existing bomb at grid (5,5)
      await collisionDetector.registerDynamicCollider('existing-bomb', {
        x: 5.5,
        y: 5.5,
        width: 0.6,
        height: 0.6,
        entityId: 'existing-bomb',
        entityType: 'bomb',
      });

      const result = await collisionDetector.checkBombPlacement(playerId, position, mazeData);

      expect(result.hasCollision).toBe(true);
      expect(result.canMove).toBe(false);
      expect(result.collisionType).toBe('entity');
      expect(result.collidedWith?.entityId).toBe('existing-bomb');
    });

    it('should allow bomb placement when existing bomb is in different grid cell', async () => {
      const playerId = 'player-1';
      
      // Register bomb at grid (5,5)
      await collisionDetector.registerDynamicCollider('other-bomb', {
        x: 5.5,
        y: 5.5,
        width: 0.6,
        height: 0.6,
        entityId: 'other-bomb',
        entityType: 'bomb',
      });

      // Try to place bomb at grid (7,7) - different cell
      const position = { x: 7.5, y: 7.5 };
      const result = await collisionDetector.checkBombPlacement(playerId, position, mazeData);

      expect(result.hasCollision).toBe(false);
      expect(result.canMove).toBe(true);
      expect(result.adjustedPosition).toEqual({ x: 7.5, y: 7.5 });
    });

    it('should handle bomb placement at exact grid boundaries', async () => {
      const playerId = 'player-1';
      const boundaryPositions = [
        { x: 5.0, y: 5.0 },
        { x: 5.99, y: 5.99 },
        { x: 3.0, y: 7.0 },
      ];

      for (const position of boundaryPositions) {
        const result = await collisionDetector.checkBombPlacement(playerId, position, mazeData);
        
        // Should still work and snap to grid center
        expect(result).toBeDefined();
        expect(result.adjustedPosition?.x).toBeCloseTo(Math.floor(position.x) + 0.5);
        expect(result.adjustedPosition?.y).toBeCloseTo(Math.floor(position.y) + 0.5);
      }
    });

    it('should handle negative positions', async () => {
      const playerId = 'player-1';
      const negativePositions = [
        { x: -0.5, y: 5.5 },
        { x: 5.5, y: -0.5 },
        { x: -1.0, y: -1.0 },
      ];

      for (const position of negativePositions) {
        const result = await collisionDetector.checkBombPlacement(playerId, position, mazeData);
        
        // Should be treated as wall collision (out of bounds)
        expect(result.hasCollision).toBe(true);
        expect(result.canMove).toBe(false);
        expect(result.collisionType).toBe('wall');
      }
    });

    it('should handle positions beyond maze bounds', async () => {
      const playerId = 'player-1';
      const outOfBoundsPositions = [
        { x: 21.5, y: 5.5 },
        { x: 5.5, y: 21.5 },
        { x: 25.0, y: 25.0 },
      ];

      for (const position of outOfBoundsPositions) {
        const result = await collisionDetector.checkBombPlacement(playerId, position, mazeData);
        
        expect(result.hasCollision).toBe(true);
        expect(result.canMove).toBe(false);
        expect(result.collisionType).toBe('wall');
      }
    });
  });

  describe('Grid Collision Detection', () => {
    const mazeData = { width: 21, height: 21 };

    it('should not be confused by non-bomb entities at same position', async () => {
      const playerId = 'player-1';
      const position = { x: 9.5, y: 9.5 };

      // Register a player (not bomb) at the position
      await collisionDetector.registerDynamicCollider('other-player', {
        x: 9.5,
        y: 9.5,
        width: 0.8,
        height: 0.8,
        entityId: 'other-player',
        entityType: 'player',
      });

      const result = await collisionDetector.checkBombPlacement(playerId, position, mazeData);

      // Should allow bomb placement since there's no bomb at this position
      expect(result.hasCollision).toBe(false);
      expect(result.canMove).toBe(true);
    });

    it('should handle multiple bombs at different positions', async () => {
      const playerId = 'player-1';
      
      // Register multiple bombs
      await collisionDetector.registerDynamicCollider('bomb-1', {
        x: 3.5, y: 3.5, width: 0.6, height: 0.6, entityId: 'bomb-1', entityType: 'bomb',
      });
      await collisionDetector.registerDynamicCollider('bomb-2', {
        x: 5.5, y: 7.5, width: 0.6, height: 0.6, entityId: 'bomb-2', entityType: 'bomb',
      });

      // Try to place bomb at unoccupied position
      const position = { x: 9.5, y: 9.5 };
      const result = await collisionDetector.checkBombPlacement(playerId, position, mazeData);

      expect(result.hasCollision).toBe(false);
      expect(result.canMove).toBe(true);
      expect(result.adjustedPosition).toEqual({ x: 9.5, y: 9.5 });
    });

    it('should handle floating point precision in grid calculation', async () => {
      const playerId = 'player-1';
      const precisionPositions = [
        { x: 5.999999, y: 5.000001 },
        { x: 3.000001, y: 7.999999 },
      ];

      for (const position of precisionPositions) {
        const result = await collisionDetector.checkBombPlacement(playerId, position, mazeData);
        
        expect(result).toBeDefined();
        // Should snap to proper grid center
        expect(result.adjustedPosition?.x).toBeCloseTo(Math.floor(position.x) + 0.5, 1);
        expect(result.adjustedPosition?.y).toBeCloseTo(Math.floor(position.y) + 0.5, 1);
      }
    });
  });
});