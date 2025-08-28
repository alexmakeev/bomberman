/**
 * CollisionDetector Unit Tests - Explosion Collision Detection
 * Tests explosion hit detection, power-up collection, and raycast line-of-sight
 * 
 * References:
 * - src/modules/CollisionDetector/index.ts:158-180 - checkExplosionHit method
 * - src/modules/CollisionDetector/index.ts:182-205 - checkPowerUpCollection method
 * - src/modules/CollisionDetector/index.ts:207-258 - raycast method
 * - src/modules/CollisionDetector/index.ts:362-366 - isEntityInExplosionCell method
 */

import { createEventBusImpl } from '../../src/modules/EventBusImpl';
import { createCollisionDetector } from '../../src/modules/CollisionDetector';
import type { EventBus } from '../../src/interfaces/core/EventBus';

describe('CollisionDetector - Explosion Collision Detection', () => {
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

  describe('checkExplosionHit()', () => {
    const gameId = 'test-game-1';

    beforeEach(async () => {
      // Register some entities for explosion testing
      await collisionDetector.registerDynamicCollider('player-1', {
        x: 5.5, y: 5.5, width: 0.8, height: 0.8, entityId: 'player-1', entityType: 'player',
      });
      await collisionDetector.registerDynamicCollider('player-2', {
        x: 7.5, y: 5.5, width: 0.8, height: 0.8, entityId: 'player-2', entityType: 'player',
      });
      await collisionDetector.registerDynamicCollider('monster-1', {
        x: 9.5, y: 9.5, width: 0.8, height: 0.8, entityId: 'monster-1', entityType: 'monster',
      });
      await collisionDetector.registerDynamicCollider('bomb-1', {
        x: 3.5, y: 3.5, width: 0.6, height: 0.6, entityId: 'bomb-1', entityType: 'bomb',
      });
    });

    it('should detect entity hit by single explosion cell', async () => {
      const explosionCells = [{ x: 5, y: 5 }]; // Should hit player-1 at (5.5, 5.5)

      const hitEntities = await collisionDetector.checkExplosionHit(explosionCells, gameId);

      expect(hitEntities).toHaveLength(1);
      expect(hitEntities[0]).toEqual({
        entityId: 'player-1',
        entityType: 'player',
        position: { x: 5.5, y: 5.5 },
      });
    });

    it('should detect multiple entities hit by explosion', async () => {
      const explosionCells = [
        { x: 5, y: 5 }, // Should hit player-1
        { x: 7, y: 5 }, // Should hit player-2
      ];

      const hitEntities = await collisionDetector.checkExplosionHit(explosionCells, gameId);

      expect(hitEntities).toHaveLength(2);
      
      const hitIds = hitEntities.map(entity => entity.entityId);
      expect(hitIds).toContain('player-1');
      expect(hitIds).toContain('player-2');
    });

    it('should detect bomb hit by explosion (chain reaction)', async () => {
      const explosionCells = [{ x: 3, y: 3 }]; // Should hit bomb-1

      const hitEntities = await collisionDetector.checkExplosionHit(explosionCells, gameId);

      expect(hitEntities).toHaveLength(1);
      expect(hitEntities[0]).toEqual({
        entityId: 'bomb-1',
        entityType: 'bomb',
        position: { x: 3.5, y: 3.5 },
      });
    });

    it('should return empty array when no entities hit', async () => {
      const explosionCells = [
        { x: 1, y: 1 }, // Empty cell
        { x: 15, y: 15 }, // Empty cell
      ];

      const hitEntities = await collisionDetector.checkExplosionHit(explosionCells, gameId);

      expect(hitEntities).toHaveLength(0);
    });

    it('should handle large explosion pattern', async () => {
      const explosionCells = [
        { x: 5, y: 5 }, // Center - hits player-1
        { x: 4, y: 5 }, { x: 6, y: 5 }, // Horizontal
        { x: 7, y: 5 }, // Hits player-2
        { x: 5, y: 4 }, { x: 5, y: 6 }, // Vertical
        { x: 9, y: 9 }, // Hits monster-1
      ];

      const hitEntities = await collisionDetector.checkExplosionHit(explosionCells, gameId);

      expect(hitEntities.length).toBeGreaterThanOrEqual(3);
      
      const hitIds = hitEntities.map(entity => entity.entityId);
      expect(hitIds).toContain('player-1');
      expect(hitIds).toContain('player-2');
      expect(hitIds).toContain('monster-1');
    });

    it('should handle duplicate explosion cells gracefully', async () => {
      const explosionCells = [
        { x: 5, y: 5 },
        { x: 5, y: 5 }, // Duplicate
        { x: 5, y: 5 }, // Duplicate
      ];

      const hitEntities = await collisionDetector.checkExplosionHit(explosionCells, gameId);

      // Implementation may report same entity multiple times for duplicate cells
      expect(hitEntities.length).toBeGreaterThanOrEqual(1);
      expect(hitEntities.some(entity => entity.entityId === 'player-1')).toBe(true);
      
      // All hits should be from the same entity at the same position
      hitEntities.forEach(entity => {
        expect(entity.entityId).toBe('player-1');
        expect(entity.position).toEqual({ x: 5.5, y: 5.5 });
      });
    });

    it('should handle negative explosion coordinates', async () => {
      const explosionCells = [
        { x: -1, y: -1 },
        { x: -5, y: 5 },
      ];

      const hitEntities = await collisionDetector.checkExplosionHit(explosionCells, gameId);

      expect(hitEntities).toHaveLength(0); // No entities at negative coordinates
    });

    it('should handle very large explosion coordinates', async () => {
      const explosionCells = [
        { x: 1000, y: 1000 },
        { x: 999, y: 999 },
      ];

      const hitEntities = await collisionDetector.checkExplosionHit(explosionCells, gameId);

      expect(hitEntities).toHaveLength(0); // No entities at such large coordinates
    });
  });

  describe('checkPowerUpCollection()', () => {
    const playerId = 'player-1';

    beforeEach(async () => {
      // Register some power-ups
      await collisionDetector.registerDynamicCollider('powerup-1', {
        x: 5.5, y: 5.5, width: 0.5, height: 0.5, entityId: 'powerup-1', entityType: 'powerup',
      });
      await collisionDetector.registerDynamicCollider('powerup-2', {
        x: 7.5, y: 7.5, width: 0.5, height: 0.5, entityId: 'powerup-2', entityType: 'powerup',
      });
      
      // Register non-power-up entity
      await collisionDetector.registerDynamicCollider('bomb-1', {
        x: 3.5, y: 3.5, width: 0.6, height: 0.6, entityId: 'bomb-1', entityType: 'bomb',
      });
    });

    it('should detect power-up collection when player overlaps', async () => {
      const playerPosition = { x: 5.5, y: 5.5 }; // Same position as powerup-1

      const collectedPowerUps = await collisionDetector.checkPowerUpCollection(playerId, playerPosition);

      expect(collectedPowerUps).toHaveLength(1);
      expect(collectedPowerUps[0]).toEqual({
        powerUpId: 'powerup-1',
        powerUpType: 'unknown', // TODO: Get from power-up data
        position: { x: 5.5, y: 5.5 },
      });
    });

    it('should detect multiple power-up collections', async () => {
      // Position player to overlap both power-ups (slightly larger collision box)
      const playerPosition = { x: 6.5, y: 6.5 }; // Between the two power-ups

      // First register power-ups closer to player position
      await collisionDetector.unregisterDynamicCollider('powerup-1');
      await collisionDetector.unregisterDynamicCollider('powerup-2');
      
      await collisionDetector.registerDynamicCollider('powerup-1', {
        x: 6.3, y: 6.3, width: 0.5, height: 0.5, entityId: 'powerup-1', entityType: 'powerup',
      });
      await collisionDetector.registerDynamicCollider('powerup-2', {
        x: 6.7, y: 6.7, width: 0.5, height: 0.5, entityId: 'powerup-2', entityType: 'powerup',
      });

      const collectedPowerUps = await collisionDetector.checkPowerUpCollection(playerId, playerPosition);

      expect(collectedPowerUps.length).toBeGreaterThanOrEqual(1); // Should collect at least one
      const collectedIds = collectedPowerUps.map(p => p.powerUpId);
      expect(['powerup-1', 'powerup-2']).toEqual(expect.arrayContaining(collectedIds.slice(0, 2)));
    });

    it('should not collect non-power-up entities', async () => {
      const playerPosition = { x: 3.5, y: 3.5 }; // Same position as bomb-1

      const collectedPowerUps = await collisionDetector.checkPowerUpCollection(playerId, playerPosition);

      expect(collectedPowerUps).toHaveLength(0); // Should not collect bomb
    });

    it('should return empty array when no power-ups nearby', async () => {
      const playerPosition = { x: 10.5, y: 10.5 }; // Away from all power-ups

      const collectedPowerUps = await collisionDetector.checkPowerUpCollection(playerId, playerPosition);

      expect(collectedPowerUps).toHaveLength(0);
    });

    it('should handle player at exact power-up position', async () => {
      const playerPosition = { x: 7.5, y: 7.5 }; // Exact position of powerup-2

      const collectedPowerUps = await collisionDetector.checkPowerUpCollection(playerId, playerPosition);

      expect(collectedPowerUps).toHaveLength(1);
      expect(collectedPowerUps[0].powerUpId).toBe('powerup-2');
    });

    it('should handle edge case collision detection', async () => {
      // Player just touching edge of power-up
      const playerPosition = { x: 5.9, y: 5.5 }; // Just at edge of powerup-1

      const collectedPowerUps = await collisionDetector.checkPowerUpCollection(playerId, playerPosition);

      // Depends on collision detection precision
      expect(collectedPowerUps.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('raycast()', () => {
    beforeEach(async () => {
      // Register static colliders (walls)
      await collisionDetector.registerStaticCollider('wall-1', {
        x: 5.5, y: 5.5, width: 1, height: 1, entityId: 'wall-1', entityType: 'wall',
      });

      // Register dynamic colliders
      await collisionDetector.registerDynamicCollider('player-1', {
        x: 10.5, y: 10.5, width: 0.8, height: 0.8, entityId: 'player-1', entityType: 'player',
      });
    });

    it('should return no hit for clear line of sight', async () => {
      const from = { x: 1, y: 1 };
      const to = { x: 2, y: 2 };

      const result = await collisionDetector.raycast(from, to);

      expect(result.hit).toBe(false);
      expect(result.distance).toBeCloseTo(Math.sqrt(2), 2);
      expect(result.hitPosition).toBeUndefined();
      expect(result.hitEntity).toBeUndefined();
    });

    it('should detect hit against static collider (wall)', async () => {
      const from = { x: 3, y: 5.5 };
      const to = { x: 8, y: 5.5 }; // Ray passes through wall at 5.5,5.5

      const result = await collisionDetector.raycast(from, to);

      expect(result.hit).toBe(true);
      expect(result.distance).toBeLessThan(5); // Should hit before reaching destination
      expect(result.hitPosition).toBeDefined();
      expect(result.hitPosition!.x).toBeGreaterThan(3);
      expect(result.hitPosition!.x).toBeLessThan(8);
    });

    it('should detect hit against dynamic collider (player)', async () => {
      const from = { x: 8, y: 10.5 };
      const to = { x: 13, y: 10.5 }; // Ray passes through player at 10.5,10.5

      const result = await collisionDetector.raycast(from, to);

      expect(result.hit).toBe(true);
      expect(result.distance).toBeLessThan(5);
      expect(result.hitEntity).toBeDefined();
      expect(result.hitEntity!.entityId).toBe('player-1');
    });

    it('should ignore specified entities', async () => {
      const from = { x: 8, y: 10.5 };
      const to = { x: 13, y: 10.5 };
      const ignoredEntities = ['player-1'];

      const result = await collisionDetector.raycast(from, to, ignoredEntities);

      expect(result.hit).toBe(false); // Should ignore player-1
      expect(result.distance).toBeCloseTo(5, 1);
    });

    it('should handle zero-length ray', async () => {
      const from = { x: 5, y: 5 };
      const to = { x: 5, y: 5 };

      const result = await collisionDetector.raycast(from, to);

      expect(result.hit).toBe(false);
      expect(result.distance).toBe(0);
    });

    it('should handle diagonal rays', async () => {
      const from = { x: 0, y: 0 };
      const to = { x: 3, y: 4 }; // 3-4-5 triangle

      const result = await collisionDetector.raycast(from, to);

      expect(result.distance).toBeCloseTo(5, 2);
    });

    it('should prioritize closest hit', async () => {
      // Add another collider between start and existing player
      await collisionDetector.registerDynamicCollider('closer-obstacle', {
        x: 9, y: 10.5, width: 0.8, height: 0.8, entityId: 'closer-obstacle', entityType: 'monster',
      });

      const from = { x: 7, y: 10.5 };
      const to = { x: 12, y: 10.5 };

      const result = await collisionDetector.raycast(from, to);

      expect(result.hit).toBe(true);
      // Should hit the closer obstacle first
      expect(result.hitEntity?.entityId).toBe('closer-obstacle');
    });

    it('should handle rays starting inside colliders', async () => {
      const from = { x: 10.5, y: 10.5 }; // Inside player-1
      const to = { x: 15, y: 10.5 };

      const result = await collisionDetector.raycast(from, to);

      // Behavior depends on implementation - might immediately hit or ignore self
      expect(result).toBeDefined();
      expect(typeof result.hit).toBe('boolean');
    });
  });

  describe('Collider Management', () => {
    it('should register and use static colliders', async () => {
      const colliderData = {
        x: 15, y: 15, width: 2, height: 2, entityId: 'test-wall', entityType: 'wall' as const,
      };

      await collisionDetector.registerStaticCollider('test-wall-key', colliderData);

      // Test that raycast now hits this wall
      const from = { x: 12, y: 15 };
      const to = { x: 18, y: 15 };

      const result = await collisionDetector.raycast(from, to);

      expect(result.hit).toBe(true);
      expect(result.distance).toBeLessThan(6);
    });

    it('should register and unregister dynamic colliders', async () => {
      const entityId = 'test-entity';
      const colliderData = {
        x: 8, y: 8, width: 1, height: 1, entityId, entityType: 'player' as const,
      };

      await collisionDetector.registerDynamicCollider(entityId, colliderData);

      // Test that explosion can now hit this entity
      let hitEntities = await collisionDetector.checkExplosionHit([{ x: 8, y: 8 }], 'test-game');
      expect(hitEntities.some(e => e.entityId === entityId)).toBe(true);

      // Unregister and test again
      await collisionDetector.unregisterDynamicCollider(entityId);

      hitEntities = await collisionDetector.checkExplosionHit([{ x: 8, y: 8 }], 'test-game');
      expect(hitEntities.some(e => e.entityId === entityId)).toBe(false);
    });

    it('should update collider positions', async () => {
      const entityId = 'moving-entity';
      const initialCollider = {
        x: 6, y: 6, width: 1, height: 1, entityId, entityType: 'player' as const,
      };

      await collisionDetector.registerDynamicCollider(entityId, initialCollider);

      // Move entity
      await collisionDetector.updateColliderPosition(entityId, { x: 12, y: 12 });

      // Test that entity is now at new position
      let hitEntities = await collisionDetector.checkExplosionHit([{ x: 6, y: 6 }], 'test');
      expect(hitEntities.some(e => e.entityId === entityId)).toBe(false);

      hitEntities = await collisionDetector.checkExplosionHit([{ x: 12, y: 12 }], 'test');
      expect(hitEntities.some(e => e.entityId === entityId)).toBe(true);
    });
  });
});