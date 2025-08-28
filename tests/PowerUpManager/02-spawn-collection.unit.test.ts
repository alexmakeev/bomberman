/**
 * PowerUpManager Unit Tests - Spawn and Collection
 * Tests power-up spawning mechanics, collection validation, and game state management
 * 
 * References:
 * - src/modules/PowerUpManager/index.ts:59-75 - spawnPowerUp method
 * - src/modules/PowerUpManager/index.ts:77-91 - collectPowerUp method
 * - src/modules/PowerUpManager/index.ts:150-153 - getPowerUpsInGame method
 * - Power-up lifecycle: spawn -> active -> collected -> removed
 */

import { createEventBusImpl } from '../../src/modules/EventBusImpl';
import { createPowerUpManager } from '../../src/modules/PowerUpManager';
import type { EventBus } from '../../src/interfaces/core/EventBus';

describe('PowerUpManager - Spawn and Collection', () => {
  let eventBus: EventBus;
  let powerUpManager: any;

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

    powerUpManager = createPowerUpManager(eventBus);
    await powerUpManager.initialize();
  });

  afterEach(async () => {
    if (eventBus) {
      await eventBus.shutdown();
    }
  });

  describe('spawnPowerUp()', () => {
    it('should spawn bomb upgrade power-up successfully', async () => {
      const gameId = 'test-game-1';
      const position = { x: 3, y: 4 };

      const powerUpId = await powerUpManager.spawnPowerUp(gameId, 'bomb_upgrade', position);

      expect(typeof powerUpId).toBe('string');
      expect(powerUpId.length).toBeGreaterThan(0);
      expect(powerUpId).toMatch(/^powerup_\d+_/);

      const powerUpsInGame = await powerUpManager.getPowerUpsInGame(gameId);
      expect(powerUpsInGame).toHaveLength(1);
      
      const spawnedPowerUp = powerUpsInGame[0];
      expect(spawnedPowerUp.powerUpId).toBe(powerUpId);
      expect(spawnedPowerUp.type).toBe('bomb_upgrade');
      expect(spawnedPowerUp.position).toEqual(position);
      expect(spawnedPowerUp.gameId).toBe(gameId);
      expect(spawnedPowerUp.collected).toBe(false);
      expect(spawnedPowerUp.collectedBy).toBeUndefined();
      expect(spawnedPowerUp.spawnedAt).toBeInstanceOf(Date);
    });

    it('should generate unique power-up IDs', async () => {
      const gameId = 'test-game-2';
      const position = { x: 1, y: 1 };

      const powerUpId1 = await powerUpManager.spawnPowerUp(gameId, 'blast_radius', position);
      const powerUpId2 = await powerUpManager.spawnPowerUp(gameId, 'blast_radius', position);
      const powerUpId3 = await powerUpManager.spawnPowerUp(gameId, 'speed_boost', position);

      expect(powerUpId1).not.toBe(powerUpId2);
      expect(powerUpId2).not.toBe(powerUpId3);
      expect(powerUpId1).not.toBe(powerUpId3);

      const powerUpsInGame = await powerUpManager.getPowerUpsInGame(gameId);
      expect(powerUpsInGame).toHaveLength(3);
    });

    it('should handle all power-up types', async () => {
      const gameId = 'test-game-types';
      const powerUpTypes = [
        'bomb_upgrade',
        'blast_radius', 
        'speed_boost',
        'bomb_kick',
        'bomb_throw',
        'invincibility',
        'remote_detonator'
      ];

      const spawnedIds = [];
      for (let i = 0; i < powerUpTypes.length; i++) {
        const type = powerUpTypes[i];
        const powerUpId = await powerUpManager.spawnPowerUp(gameId, type as any, { x: i, y: i });
        spawnedIds.push(powerUpId);
      }

      const powerUpsInGame = await powerUpManager.getPowerUpsInGame(gameId);
      expect(powerUpsInGame).toHaveLength(powerUpTypes.length);

      // Verify each type was spawned correctly
      for (let i = 0; i < powerUpTypes.length; i++) {
        const powerUp = powerUpsInGame.find(p => p.powerUpId === spawnedIds[i]);
        expect(powerUp).toBeDefined();
        expect(powerUp!.type).toBe(powerUpTypes[i]);
        expect(powerUp!.position).toEqual({ x: i, y: i });
      }
    });

    it('should allow multiple power-ups at same position', async () => {
      const gameId = 'test-game-overlap';
      const position = { x: 5, y: 5 };

      const powerUpId1 = await powerUpManager.spawnPowerUp(gameId, 'bomb_upgrade', position);
      const powerUpId2 = await powerUpManager.spawnPowerUp(gameId, 'blast_radius', position);

      expect(powerUpId1).not.toBe(powerUpId2);

      const powerUpsInGame = await powerUpManager.getPowerUpsInGame(gameId);
      expect(powerUpsInGame).toHaveLength(2);
      expect(powerUpsInGame.every(p => p.position.x === 5 && p.position.y === 5)).toBe(true);
    });

    it('should handle floating point positions', async () => {
      const gameId = 'test-game-float';
      const precisePositions = [
        { x: 1.23456789, y: 9.87654321 },
        { x: 0.0001, y: 0.0001 },
        { x: Math.PI, y: Math.E },
      ];

      for (const position of precisePositions) {
        const powerUpId = await powerUpManager.spawnPowerUp(gameId, 'speed_boost', position);
        expect(typeof powerUpId).toBe('string');
      }

      const powerUpsInGame = await powerUpManager.getPowerUpsInGame(gameId);
      expect(powerUpsInGame).toHaveLength(3);

      for (let i = 0; i < precisePositions.length; i++) {
        const powerUp = powerUpsInGame[i];
        expect(powerUp.position.x).toBeCloseTo(precisePositions[i].x);
        expect(powerUp.position.y).toBeCloseTo(precisePositions[i].y);
      }
    });

    it('should set spawn timestamps correctly', async () => {
      const gameId = 'test-game-time';
      const beforeSpawn = Date.now();
      
      const powerUpId = await powerUpManager.spawnPowerUp(gameId, 'bomb_kick', { x: 2, y: 3 });
      
      const afterSpawn = Date.now();

      const powerUpsInGame = await powerUpManager.getPowerUpsInGame(gameId);
      const spawnedPowerUp = powerUpsInGame[0];

      expect(spawnedPowerUp.spawnedAt.getTime()).toBeGreaterThanOrEqual(beforeSpawn);
      expect(spawnedPowerUp.spawnedAt.getTime()).toBeLessThanOrEqual(afterSpawn);
    });
  });

  describe('collectPowerUp()', () => {
    it('should collect spawned power-up successfully', async () => {
      const gameId = 'test-game-collect';
      const playerId = 'player-1';
      
      const powerUpId = await powerUpManager.spawnPowerUp(gameId, 'bomb_upgrade', { x: 1, y: 1 });
      
      const result = await powerUpManager.collectPowerUp(powerUpId, playerId);
      
      expect(result).toBe(true);

      // Power-up should be removed from active power-ups
      const powerUpsInGame = await powerUpManager.getPowerUpsInGame(gameId);
      expect(powerUpsInGame).toHaveLength(0);
    });

    it('should apply power-up effects when collected', async () => {
      const gameId = 'test-game-effects';
      const playerId = 'player-1';
      
      const powerUpId = await powerUpManager.spawnPowerUp(gameId, 'blast_radius', { x: 2, y: 2 });
      
      // Player should have no power-ups initially
      let playerPowerUps = await powerUpManager.getPlayerPowerUps(playerId);
      expect(playerPowerUps).toBeNull();
      
      await powerUpManager.collectPowerUp(powerUpId, playerId);
      
      // Player should now have increased blast radius
      playerPowerUps = await powerUpManager.getPlayerPowerUps(playerId);
      expect(playerPowerUps).not.toBeNull();
      expect(playerPowerUps!.blastRadius).toBeGreaterThan(1);
    });

    it('should fail to collect non-existent power-up', async () => {
      const result = await powerUpManager.collectPowerUp('non-existent-id', 'player-1');
      expect(result).toBe(false);
    });

    it('should fail to collect already collected power-up', async () => {
      const gameId = 'test-game-double';
      const playerId1 = 'player-1';
      const playerId2 = 'player-2';
      
      const powerUpId = await powerUpManager.spawnPowerUp(gameId, 'speed_boost', { x: 3, y: 3 });
      
      // First collection should succeed
      const firstResult = await powerUpManager.collectPowerUp(powerUpId, playerId1);
      expect(firstResult).toBe(true);
      
      // Second collection should fail
      const secondResult = await powerUpManager.collectPowerUp(powerUpId, playerId2);
      expect(secondResult).toBe(false);
    });

    it('should handle rapid collection attempts', async () => {
      const gameId = 'test-game-rapid';
      const powerUpId = await powerUpManager.spawnPowerUp(gameId, 'bomb_kick', { x: 4, y: 4 });
      
      // Simulate rapid collection attempts
      const collectionPromises = [
        powerUpManager.collectPowerUp(powerUpId, 'player-1'),
        powerUpManager.collectPowerUp(powerUpId, 'player-2'),
        powerUpManager.collectPowerUp(powerUpId, 'player-3'),
      ];
      
      const results = await Promise.all(collectionPromises);
      
      // Only one should succeed
      const successCount = results.filter(r => r === true).length;
      expect(successCount).toBe(1);
      
      // Power-up should be removed
      const powerUpsInGame = await powerUpManager.getPowerUpsInGame(gameId);
      expect(powerUpsInGame).toHaveLength(0);
    });

    it('should handle collection with invalid player IDs', async () => {
      const gameId = 'test-game-invalid';
      const powerUpId = await powerUpManager.spawnPowerUp(gameId, 'invincibility', { x: 5, y: 5 });
      
      const invalidPlayerIds = [null, undefined, '', '   '];
      
      for (const invalidId of invalidPlayerIds) {
        const result = await powerUpManager.collectPowerUp(powerUpId, invalidId as any);
        // Should either succeed or fail gracefully
        expect(typeof result).toBe('boolean');
      }
    });
  });

  describe('getPowerUpsInGame()', () => {
    it('should return empty array for game with no power-ups', async () => {
      const powerUps = await powerUpManager.getPowerUpsInGame('empty-game');
      expect(powerUps).toEqual([]);
    });

    it('should return only active power-ups for specific game', async () => {
      const game1 = 'game-1';
      const game2 = 'game-2';
      
      // Spawn power-ups in different games
      await powerUpManager.spawnPowerUp(game1, 'bomb_upgrade', { x: 1, y: 1 });
      await powerUpManager.spawnPowerUp(game2, 'blast_radius', { x: 2, y: 2 });
      await powerUpManager.spawnPowerUp(game1, 'speed_boost', { x: 3, y: 3 });
      
      const game1PowerUps = await powerUpManager.getPowerUpsInGame(game1);
      const game2PowerUps = await powerUpManager.getPowerUpsInGame(game2);
      
      expect(game1PowerUps).toHaveLength(2);
      expect(game2PowerUps).toHaveLength(1);
      
      // Verify game isolation
      expect(game1PowerUps.every(p => p.gameId === game1)).toBe(true);
      expect(game2PowerUps.every(p => p.gameId === game2)).toBe(true);
    });

    it('should not return collected power-ups', async () => {
      const gameId = 'test-game-collected';
      
      const powerUpId1 = await powerUpManager.spawnPowerUp(gameId, 'bomb_upgrade', { x: 1, y: 1 });
      const powerUpId2 = await powerUpManager.spawnPowerUp(gameId, 'blast_radius', { x: 2, y: 2 });
      
      // Both should be active
      let powerUps = await powerUpManager.getPowerUpsInGame(gameId);
      expect(powerUps).toHaveLength(2);
      
      // Collect one
      await powerUpManager.collectPowerUp(powerUpId1, 'player-1');
      
      // Only one should remain active
      powerUps = await powerUpManager.getPowerUpsInGame(gameId);
      expect(powerUps).toHaveLength(1);
      expect(powerUps[0].powerUpId).toBe(powerUpId2);
    });

    it('should handle game IDs with special characters', async () => {
      const specialGameIds = [
        'game-with-dashes',
        'game_with_underscores',
        'game123with456numbers',
        'game.with.dots',
      ];
      
      for (const gameId of specialGameIds) {
        await powerUpManager.spawnPowerUp(gameId, 'bomb_upgrade', { x: 1, y: 1 });
        
        const powerUps = await powerUpManager.getPowerUpsInGame(gameId);
        expect(powerUps).toHaveLength(1);
        expect(powerUps[0].gameId).toBe(gameId);
      }
    });

    it('should return power-ups in consistent order', async () => {
      const gameId = 'test-game-order';
      const spawnedIds = [];
      
      // Spawn multiple power-ups
      for (let i = 0; i < 5; i++) {
        const powerUpId = await powerUpManager.spawnPowerUp(gameId, 'speed_boost', { x: i, y: i });
        spawnedIds.push(powerUpId);
      }
      
      const powerUps = await powerUpManager.getPowerUpsInGame(gameId);
      expect(powerUps).toHaveLength(5);
      
      // Multiple calls should return same order
      const powerUps2 = await powerUpManager.getPowerUpsInGame(gameId);
      expect(powerUps2).toHaveLength(5);
      
      for (let i = 0; i < powerUps.length; i++) {
        expect(powerUps[i].powerUpId).toBe(powerUps2[i].powerUpId);
      }
    });
  });

  describe('Game Isolation', () => {
    it('should maintain separate power-up lists per game', async () => {
      const games = ['game-a', 'game-b', 'game-c'];
      const powerUpCounts = [3, 1, 5];
      
      // Spawn different numbers of power-ups in each game
      for (let i = 0; i < games.length; i++) {
        const gameId = games[i];
        const count = powerUpCounts[i];
        
        for (let j = 0; j < count; j++) {
          await powerUpManager.spawnPowerUp(gameId, 'bomb_upgrade', { x: j, y: j });
        }
      }
      
      // Verify each game has correct count
      for (let i = 0; i < games.length; i++) {
        const powerUps = await powerUpManager.getPowerUpsInGame(games[i]);
        expect(powerUps).toHaveLength(powerUpCounts[i]);
        expect(powerUps.every(p => p.gameId === games[i])).toBe(true);
      }
    });

    it('should handle collection in one game without affecting others', async () => {
      const game1 = 'isolation-game-1';
      const game2 = 'isolation-game-2';
      
      // Spawn power-ups in both games
      const powerUpId1 = await powerUpManager.spawnPowerUp(game1, 'bomb_upgrade', { x: 1, y: 1 });
      const powerUpId2 = await powerUpManager.spawnPowerUp(game2, 'blast_radius', { x: 2, y: 2 });
      
      // Collect from game1
      await powerUpManager.collectPowerUp(powerUpId1, 'player-1');
      
      // Game1 should be empty, game2 should be unaffected
      const game1PowerUps = await powerUpManager.getPowerUpsInGame(game1);
      const game2PowerUps = await powerUpManager.getPowerUpsInGame(game2);
      
      expect(game1PowerUps).toHaveLength(0);
      expect(game2PowerUps).toHaveLength(1);
      expect(game2PowerUps[0].powerUpId).toBe(powerUpId2);
    });
  });
});