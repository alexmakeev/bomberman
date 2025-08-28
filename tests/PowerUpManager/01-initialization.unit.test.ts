/**
 * PowerUpManager Unit Tests - Initialization
 * Tests basic PowerUpManager initialization and interface compliance
 * 
 * References:
 * - src/modules/PowerUpManager/index.ts - Implementation
 * - Power-up spawning, collection, effects, and player upgrades
 * - Power-up types: bomb_upgrade, blast_radius, speed_boost, bomb_kick, bomb_throw, invincibility, remote_detonator
 */

import { createEventBusImpl } from '../../src/modules/EventBusImpl';
import { createPowerUpManager } from '../../src/modules/PowerUpManager';
import type { EventBus } from '../../src/interfaces/core/EventBus';

describe('PowerUpManager - Initialization', () => {
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
  });

  afterEach(async () => {
    if (eventBus) {
      await eventBus.shutdown();
    }
  });

  describe('Constructor', () => {
    it('should create PowerUpManager instance with eventBus reference', () => {
      expect(powerUpManager).toBeDefined();
      expect(powerUpManager.eventBus).toBe(eventBus);
    });

    it('should have eventBus property accessible', () => {
      expect(powerUpManager.eventBus).toBe(eventBus);
      expect(powerUpManager.eventBus).toBeDefined();
      expect(typeof powerUpManager.eventBus).toBe('object');
    });
  });

  describe('Interface Compliance', () => {
    it('should implement all required methods', () => {
      // Core power-up management methods based on src/modules/PowerUpManager/index.ts
      expect(typeof powerUpManager.initialize).toBe('function');
      expect(typeof powerUpManager.spawnPowerUp).toBe('function');
      expect(typeof powerUpManager.collectPowerUp).toBe('function');
      expect(typeof powerUpManager.applyPowerUpEffect).toBe('function');
      expect(typeof powerUpManager.getPlayerPowerUps).toBe('function');
      expect(typeof powerUpManager.getPowerUpsInGame).toBe('function');
      expect(typeof powerUpManager.cleanup).toBe('function');
    });

    it('should have async methods that return Promises', async () => {
      const initResult = powerUpManager.initialize();
      expect(initResult).toBeInstanceOf(Promise);
      await initResult;

      const spawnResult = powerUpManager.spawnPowerUp('game-1', 'bomb_upgrade', { x: 1, y: 1 });
      expect(spawnResult).toBeInstanceOf(Promise);
      await spawnResult;

      const collectResult = powerUpManager.collectPowerUp('test-id', 'player-1');
      expect(collectResult).toBeInstanceOf(Promise);
      await collectResult;

      const applyResult = powerUpManager.applyPowerUpEffect('player-1', 'speed_boost');
      expect(applyResult).toBeInstanceOf(Promise);
      await applyResult;

      const getPlayerResult = powerUpManager.getPlayerPowerUps('player-1');
      expect(getPlayerResult).toBeInstanceOf(Promise);
      await getPlayerResult;

      const getGameResult = powerUpManager.getPowerUpsInGame('game-1');
      expect(getGameResult).toBeInstanceOf(Promise);
      await getGameResult;

      const cleanupResult = powerUpManager.cleanup('game-1');
      expect(cleanupResult).toBeInstanceOf(Promise);
      await cleanupResult;
    });
  });

  describe('initialize()', () => {
    it('should initialize successfully', async () => {
      await expect(powerUpManager.initialize()).resolves.not.toThrow();
    });

    it('should handle multiple initializations gracefully', async () => {
      await powerUpManager.initialize();
      await expect(powerUpManager.initialize()).resolves.not.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should handle operations with uninitialized manager', async () => {
      // Don't initialize, just create
      const uninitializedManager = createPowerUpManager(eventBus);

      // Should not throw during power-up operations
      await expect(uninitializedManager.spawnPowerUp('game-1', 'bomb_upgrade', { x: 1, y: 1 })).resolves.not.toThrow();
      await expect(uninitializedManager.getPlayerPowerUps('player-1')).resolves.not.toThrow();
      await expect(uninitializedManager.getPowerUpsInGame('game-1')).resolves.not.toThrow();
      await expect(uninitializedManager.cleanup('game-1')).resolves.not.toThrow();
    });

    it('should handle invalid game and player IDs gracefully', async () => {
      await powerUpManager.initialize();

      const invalidIds = [null, undefined, '', '   '];

      for (const invalidId of invalidIds) {
        await expect(powerUpManager.getPlayerPowerUps(invalidId as any)).resolves.toBeDefined();
        await expect(powerUpManager.getPowerUpsInGame(invalidId as any)).resolves.toBeDefined();
        await expect(powerUpManager.cleanup(invalidId as any)).resolves.not.toThrow();
      }
    });

    it('should handle invalid positions gracefully', async () => {
      await powerUpManager.initialize();

      const invalidPositions = [
        { x: null, y: null } as any,
        { x: undefined, y: undefined } as any,
        { x: NaN, y: NaN },
        { x: Infinity, y: -Infinity },
      ];

      for (const position of invalidPositions) {
        await expect(powerUpManager.spawnPowerUp('game-1', 'bomb_upgrade', position)).resolves.toBeDefined();
      }
    });

    it('should handle invalid power-up types', async () => {
      await powerUpManager.initialize();

      const invalidTypes = [
        'invalid_type' as any,
        '' as any,
        null as any,
        undefined as any,
      ];

      for (const type of invalidTypes) {
        await expect(powerUpManager.spawnPowerUp('game-1', type, { x: 1, y: 1 })).resolves.toBeDefined();
        await expect(powerUpManager.applyPowerUpEffect('player-1', type)).resolves.not.toThrow();
      }
    });

    it('should handle collection of non-existent power-ups', async () => {
      await powerUpManager.initialize();

      const result = await powerUpManager.collectPowerUp('non-existent-id', 'player-1');
      expect(result).toBe(false);
    });

    it('should handle operations with invalid player/power-up IDs', async () => {
      await powerUpManager.initialize();

      const invalidIds = ['', '   ', null, undefined];

      for (const invalidId of invalidIds) {
        const collectResult = await powerUpManager.collectPowerUp(invalidId as any, 'player-1');
        expect(typeof collectResult).toBe('boolean');

        const playerPowerUps = await powerUpManager.getPlayerPowerUps(invalidId as any);
        expect(playerPowerUps).toBeNull();
      }
    });
  });

  describe('Basic Functionality Smoke Tests', () => {
    it('should create and manage power-ups in memory', async () => {
      await powerUpManager.initialize();

      // Should start with empty state
      const initialPowerUps = await powerUpManager.getPowerUpsInGame('game-1');
      expect(initialPowerUps).toEqual([]);

      // Should be able to spawn power-ups
      const powerUpId = await powerUpManager.spawnPowerUp('game-1', 'bomb_upgrade', { x: 5, y: 5 });
      expect(typeof powerUpId).toBe('string');
      expect(powerUpId.length).toBeGreaterThan(0);

      // Should track spawned power-ups
      const powerUpsInGame = await powerUpManager.getPowerUpsInGame('game-1');
      expect(powerUpsInGame).toHaveLength(1);
      expect(powerUpsInGame[0].powerUpId).toBe(powerUpId);
    });

    it('should manage player power-up states', async () => {
      await powerUpManager.initialize();

      // Should start with null state for new player
      const initialState = await powerUpManager.getPlayerPowerUps('player-1');
      expect(initialState).toBeNull();

      // Should create state when applying effects
      await powerUpManager.applyPowerUpEffect('player-1', 'bomb_upgrade');

      const playerState = await powerUpManager.getPlayerPowerUps('player-1');
      expect(playerState).not.toBeNull();
      expect(playerState!.playerId).toBe('player-1');
      expect(playerState!.maxBombs).toBeGreaterThan(1);
    });

    it('should handle game cleanup', async () => {
      await powerUpManager.initialize();

      // Spawn power-ups in two different games
      await powerUpManager.spawnPowerUp('game-1', 'bomb_upgrade', { x: 1, y: 1 });
      await powerUpManager.spawnPowerUp('game-2', 'blast_radius', { x: 2, y: 2 });

      // Both games should have power-ups
      const game1PowerUps = await powerUpManager.getPowerUpsInGame('game-1');
      const game2PowerUps = await powerUpManager.getPowerUpsInGame('game-2');
      expect(game1PowerUps).toHaveLength(1);
      expect(game2PowerUps).toHaveLength(1);

      // Cleanup game-1
      await powerUpManager.cleanup('game-1');

      // Game-1 should be empty, game-2 should be unaffected
      const cleanedGame1 = await powerUpManager.getPowerUpsInGame('game-1');
      const unaffectedGame2 = await powerUpManager.getPowerUpsInGame('game-2');
      expect(cleanedGame1).toHaveLength(0);
      expect(unaffectedGame2).toHaveLength(1);
    });
  });
});