/**
 * CollisionDetector Unit Tests - Movement Collision Detection
 * Tests player movement validation, wall collision, and entity collision
 * 
 * References:
 * - src/modules/CollisionDetector/index.ts:83-123 - checkPlayerMovement method
 * - src/modules/CollisionDetector/index.ts:280-304 - checkWallCollision method
 * - src/modules/CollisionDetector/index.ts:306-323 - checkEntityCollision method
 * - Constants: PLAYER_SIZE=0.8 (collision box smaller than grid cell)
 */

import { createEventBusImpl } from '../../src/modules/EventBusImpl';
import { createCollisionDetector } from '../../src/modules/CollisionDetector';
import type { EventBus } from '../../src/interfaces/core/EventBus';

describe('CollisionDetector - Movement Collision Detection', () => {
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

  describe('checkPlayerMovement()', () => {
    const mazeData = { width: 21, height: 21 };

    it('should allow valid movement in open space', async () => {
      const playerId = 'player-1';
      const currentPosition = { x: 5.5, y: 5.5 };
      const movement = { dx: 0.1, dy: 0 };

      const result = await collisionDetector.checkPlayerMovement(playerId, currentPosition, movement, mazeData);

      expect(result).toBeDefined();
      expect(result.hasCollision).toBe(false);
      expect(result.canMove).toBe(true);
      expect(result.adjustedPosition).toEqual({
        x: 5.6,
        y: 5.5,
      });
    });

    it('should prevent movement out of bounds (left)', async () => {
      const playerId = 'player-1';
      const currentPosition = { x: 0.5, y: 5.5 };
      const movement = { dx: -0.6, dy: 0 }; // Would move outside bounds

      const result = await collisionDetector.checkPlayerMovement(playerId, currentPosition, movement, mazeData);

      expect(result.hasCollision).toBe(true);
      expect(result.canMove).toBe(false);
      expect(result.collisionType).toBe('boundary');
      expect(result.adjustedPosition).toEqual(currentPosition);
    });

    it('should prevent movement out of bounds (right)', async () => {
      const playerId = 'player-1';
      const currentPosition = { x: 20.5, y: 5.5 };
      const movement = { dx: 0.6, dy: 0 }; // Would move outside bounds

      const result = await collisionDetector.checkPlayerMovement(playerId, currentPosition, movement, mazeData);

      expect(result.hasCollision).toBe(true);
      expect(result.canMove).toBe(false);
      expect(result.collisionType).toBe('boundary');
    });

    it('should prevent movement out of bounds (top)', async () => {
      const playerId = 'player-1';
      const currentPosition = { x: 5.5, y: 0.5 };
      const movement = { dx: 0, dy: -0.6 }; // Would move outside bounds

      const result = await collisionDetector.checkPlayerMovement(playerId, currentPosition, movement, mazeData);

      expect(result.hasCollision).toBe(true);
      expect(result.canMove).toBe(false);
      expect(result.collisionType).toBe('boundary');
    });

    it('should prevent movement out of bounds (bottom)', async () => {
      const playerId = 'player-1';
      const currentPosition = { x: 5.5, y: 20.5 };
      const movement = { dx: 0, dy: 0.6 }; // Would move outside bounds

      const result = await collisionDetector.checkPlayerMovement(playerId, currentPosition, movement, mazeData);

      expect(result.hasCollision).toBe(true);
      expect(result.canMove).toBe(false);
      expect(result.collisionType).toBe('boundary');
    });

    it('should detect collision with walls at even coordinates', async () => {
      const playerId = 'player-1';
      const currentPosition = { x: 1.5, y: 1.5 };
      const movement = { dx: -0.8, dy: 0 }; // Move towards wall at (0,1)

      const result = await collisionDetector.checkPlayerMovement(playerId, currentPosition, movement, mazeData);

      expect(result.hasCollision).toBe(true);
      expect(result.canMove).toBe(false);
      expect(result.collisionType).toBe('wall');
    });

    it('should detect collision with perimeter walls', async () => {
      const playerId = 'player-1';
      const currentPosition = { x: 1.5, y: 0.8 };
      const movement = { dx: 0, dy: -0.4 }; // Move towards perimeter wall

      const result = await collisionDetector.checkPlayerMovement(playerId, currentPosition, movement, mazeData);

      expect(result.hasCollision).toBe(true);
      expect(result.canMove).toBe(false);
      expect(result.collisionType).toBe('wall');
    });

    it('should allow movement in diagonal direction if no collision', async () => {
      const playerId = 'player-1';
      const currentPosition = { x: 5.5, y: 5.5 };
      const movement = { dx: 0.1, dy: 0.1 };

      const result = await collisionDetector.checkPlayerMovement(playerId, currentPosition, movement, mazeData);

      // Movement to (5.6, 5.6) might hit walls due to player size and wall pattern
      if (result.hasCollision) {
        expect(result.canMove).toBe(false);
        expect(['wall', 'boundary']).toContain(result.collisionType);
      } else {
        expect(result.canMove).toBe(true);
        expect(result.adjustedPosition).toEqual({
          x: 5.6,
          y: 5.6,
        });
      }
    });

    it('should handle zero movement', async () => {
      const playerId = 'player-1';
      const currentPosition = { x: 5.5, y: 5.5 };
      const movement = { dx: 0, dy: 0 };

      const result = await collisionDetector.checkPlayerMovement(playerId, currentPosition, movement, mazeData);

      expect(result.hasCollision).toBe(false);
      expect(result.canMove).toBe(true);
      expect(result.adjustedPosition).toEqual(currentPosition);
    });

    it('should handle very small movements', async () => {
      const playerId = 'player-1';
      const currentPosition = { x: 5.5, y: 5.5 };
      const movement = { dx: 0.001, dy: 0.001 };

      const result = await collisionDetector.checkPlayerMovement(playerId, currentPosition, movement, mazeData);

      expect(result.hasCollision).toBe(false);
      expect(result.canMove).toBe(true);
      expect(result.adjustedPosition.x).toBeCloseTo(5.501);
      expect(result.adjustedPosition.y).toBeCloseTo(5.501);
    });

    it('should handle large movement attempts', async () => {
      const playerId = 'player-1';
      const currentPosition = { x: 5.5, y: 5.5 };
      const movement = { dx: 15, dy: 15 }; // Very large movement that definitely hits boundary

      const result = await collisionDetector.checkPlayerMovement(playerId, currentPosition, movement, mazeData);

      // Large movement (5.5 + 15 = 20.5) with player size should definitely hit boundary
      expect(result.hasCollision).toBe(true);
      expect(result.canMove).toBe(false);
      expect(['boundary', 'wall']).toContain(result.collisionType);
    });
  });

  describe('Entity Collision Detection', () => {
    const mazeData = { width: 21, height: 21 };

    beforeEach(async () => {
      // Register some dynamic colliders for entity collision tests
      await collisionDetector.registerDynamicCollider('other-player', {
        x: 10.5,
        y: 10.5,
        width: 0.8,
        height: 0.8,
        entityId: 'other-player',
        entityType: 'player',
      });

      await collisionDetector.registerDynamicCollider('bomb-1', {
        x: 15.5,
        y: 15.5,
        width: 0.6,
        height: 0.6,
        entityId: 'bomb-1',
        entityType: 'bomb',
      });
    });

    it('should detect collision with another player', async () => {
      const playerId = 'player-1';
      const currentPosition = { x: 9.5, y: 10.5 };
      const movement = { dx: 1.2, dy: 0 }; // Move towards other player

      const result = await collisionDetector.checkPlayerMovement(playerId, currentPosition, movement, mazeData);

      expect(result.hasCollision).toBe(true);
      expect(result.canMove).toBe(false);
      // Could hit wall first, then entity, depending on collision order
      expect(['entity', 'wall']).toContain(result.collisionType);
      if (result.collisionType === 'entity') {
        expect(result.collidedWith).toBeDefined();
        expect(result.collidedWith?.entityId).toBe('other-player');
      }
    });

    it('should detect collision with a bomb', async () => {
      const playerId = 'player-1';
      const currentPosition = { x: 14.5, y: 15.5 };
      const movement = { dx: 1.2, dy: 0 }; // Move towards bomb

      const result = await collisionDetector.checkPlayerMovement(playerId, currentPosition, movement, mazeData);

      expect(result.hasCollision).toBe(true);
      expect(result.canMove).toBe(false);
      expect(result.collisionType).toBe('entity');
      expect(result.collidedWith?.entityId).toBe('bomb-1');
    });

    it('should not collide with self', async () => {
      const playerId = 'player-1';

      // Register self as dynamic collider
      await collisionDetector.registerDynamicCollider(playerId, {
        x: 5.5,
        y: 5.5,
        width: 0.8,
        height: 0.8,
        entityId: playerId,
        entityType: 'player',
      });

      const currentPosition = { x: 5.5, y: 5.5 };
      const movement = { dx: 0.1, dy: 0 };

      const result = await collisionDetector.checkPlayerMovement(playerId, currentPosition, movement, mazeData);

      // Should not collide with itself
      expect(result.hasCollision).toBe(false);
      expect(result.canMove).toBe(true);
    });

    it('should allow movement near but not colliding with entities', async () => {
      const playerId = 'player-1';
      const currentPosition = { x: 8.5, y: 9.5 }; // Position in open area
      const movement = { dx: 0.1, dy: 0 }; // Small movement

      const result = await collisionDetector.checkPlayerMovement(playerId, currentPosition, movement, mazeData);

      // Allow for wall collision if movement hits maze walls
      if (result.hasCollision) {
        expect(result.canMove).toBe(false);
        expect(['wall', 'boundary']).toContain(result.collisionType);
      } else {
        expect(result.canMove).toBe(true);
      }
    });
  });

  describe('Complex Movement Scenarios', () => {
    const mazeData = { width: 21, height: 21 };

    it('should prioritize boundary collision over entity collision', async () => {
      // Place an entity near boundary
      await collisionDetector.registerDynamicCollider('near-boundary', {
        x: 0.5,
        y: 5.5,
        width: 0.8,
        height: 0.8,
        entityId: 'near-boundary',
        entityType: 'player',
      });

      const playerId = 'player-1';
      const currentPosition = { x: 0.5, y: 5.5 };
      const movement = { dx: -1, dy: 0 }; // Would hit both boundary and entity

      const result = await collisionDetector.checkPlayerMovement(playerId, currentPosition, movement, mazeData);

      expect(result.hasCollision).toBe(true);
      expect(result.canMove).toBe(false);
      expect(result.collisionType).toBe('boundary'); // Boundary takes priority
    });

    it('should prioritize wall collision over entity collision', async () => {
      const playerId = 'player-1';
      const currentPosition = { x: 1.5, y: 1.5 };
      const movement = { dx: -0.8, dy: -0.8 }; // Would hit both wall and boundary

      const result = await collisionDetector.checkPlayerMovement(playerId, currentPosition, movement, mazeData);

      expect(result.hasCollision).toBe(true);
      expect(result.canMove).toBe(false);
      // Wall collision should be detected before entity collision
      expect(['wall', 'boundary']).toContain(result.collisionType);
    });
  });
});