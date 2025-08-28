/**
 * PlayerStateManager Unit Tests - Initialization
 * Tests basic PlayerStateManager initialization and player management
 * 
 * References:
 * - src/modules/PlayerStateManager/index.ts - Implementation
 * - Player positions, health, abilities, and state synchronization
 * - Constants: DEFAULT_PLAYER_HEALTH=100, DEFAULT_MOVEMENT_SPEED=2.0, RESPAWN_DELAY=10s
 */

import { createEventBusImpl } from '../../src/modules/EventBusImpl';
import { createPlayerStateManager } from '../../src/modules/PlayerStateManager';
import type { EventBus } from '../../src/interfaces/core/EventBus';

describe('PlayerStateManager - Initialization', () => {
  let eventBus: EventBus;
  let playerStateManager: any;

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

    playerStateManager = createPlayerStateManager(eventBus);
  });

  afterEach(async () => {
    if (eventBus) {
      await eventBus.shutdown();
    }
  });

  describe('Constructor', () => {
    it('should create PlayerStateManager instance with eventBus reference', () => {
      expect(playerStateManager).toBeDefined();
      expect(playerStateManager.eventBus).toBe(eventBus);
    });

    it('should have eventBus property accessible', () => {
      expect(playerStateManager.eventBus).toBe(eventBus);
      expect(playerStateManager.eventBus).toBeDefined();
      expect(typeof playerStateManager.eventBus).toBe('object');
    });
  });

  describe('Interface Compliance', () => {
    it('should implement all required methods', () => {
      // Core player management methods based on src/modules/PlayerStateManager/index.ts
      expect(typeof playerStateManager.initialize).toBe('function');
      expect(typeof playerStateManager.addPlayer).toBe('function');
      expect(typeof playerStateManager.updatePlayerPosition).toBe('function');
      expect(typeof playerStateManager.damagePlayer).toBe('function');
      expect(typeof playerStateManager.eliminatePlayer).toBe('function');
      expect(typeof playerStateManager.respawnPlayer).toBe('function');
    });

    it('should implement state query methods', () => {
      expect(typeof playerStateManager.getPlayerState).toBe('function');
      expect(typeof playerStateManager.getPlayersInGame).toBe('function');
      expect(typeof playerStateManager.updatePlayerStats).toBe('function');
      expect(typeof playerStateManager.removePlayer).toBe('function');
      expect(typeof playerStateManager.cleanup).toBe('function');
    });

    it('should have async methods that return Promises', async () => {
      const initResult = playerStateManager.initialize();
      expect(initResult).toBeInstanceOf(Promise);
      await initResult;

      const spawnInfo = {
        position: { x: 1.5, y: 1.5 },
        corner: 'top-left' as const,
        safeArea: [{ x: 1, y: 1 }, { x: 2, y: 1 }],
      };

      const addResult = playerStateManager.addPlayer('player-1', 'game-1', spawnInfo);
      expect(addResult).toBeInstanceOf(Promise);
      await addResult;

      const updateResult = playerStateManager.updatePlayerPosition({
        playerId: 'player-1',
        position: { x: 2, y: 2 },
        direction: 'right' as const,
        timestamp: new Date(),
      });
      expect(updateResult).toBeInstanceOf(Promise);
      await updateResult;

      const damageResult = playerStateManager.damagePlayer('player-1', 10);
      expect(damageResult).toBeInstanceOf(Promise);
      await damageResult;

      const getStateResult = playerStateManager.getPlayerState('player-1');
      expect(getStateResult).toBeInstanceOf(Promise);
      await getStateResult;
    });
  });

  describe('initialize()', () => {
    it('should initialize successfully', async () => {
      await expect(playerStateManager.initialize()).resolves.not.toThrow();
    });

    it('should handle multiple initializations gracefully', async () => {
      await playerStateManager.initialize();
      await expect(playerStateManager.initialize()).resolves.not.toThrow();
    });
  });

  describe('addPlayer()', () => {
    const spawnInfo = {
      position: { x: 1.5, y: 1.5 },
      corner: 'top-left' as const,
      safeArea: [{ x: 1, y: 1 }, { x: 2, y: 1 }],
    };

    it('should add new player successfully', async () => {
      await playerStateManager.initialize();

      const result = await playerStateManager.addPlayer('player-1', 'game-1', spawnInfo);

      expect(result).toBeDefined();
      expect(result.playerId).toBe('player-1');
      expect(result.gameId).toBe('game-1');
      expect(result.position).toEqual(spawnInfo.position);
      expect(result.status).toBe('alive');
      expect(result.health).toBe(100); // DEFAULT_PLAYER_HEALTH
      expect(result.maxHealth).toBe(100);
      expect(result.movementSpeed).toBe(2.0); // DEFAULT_MOVEMENT_SPEED
      expect(result.direction).toBe('idle');
      expect(result.deaths).toBe(0);
      expect(result.bombsPlaced).toBe(0);
      expect(result.wallsDestroyed).toBe(0);
      expect(result.powerUpsCollected).toBe(0);
      expect(result.isInvincible).toBe(true); // Brief spawn invincibility
    });

    it('should set spawn invincibility correctly', async () => {
      await playerStateManager.initialize();

      const result = await playerStateManager.addPlayer('player-2', 'game-1', spawnInfo);

      expect(result.isInvincible).toBe(true);
      expect(result.invincibilityUntil).toBeDefined();
      expect(result.invincibilityUntil).toBeInstanceOf(Date);
      
      // Should have invincibility for 1 second (INVINCIBILITY_FRAMES)
      const expectedInvincibilityEnd = Date.now() + 1000;
      const actualInvincibilityEnd = result.invincibilityUntil!.getTime();
      expect(Math.abs(actualInvincibilityEnd - expectedInvincibilityEnd)).toBeLessThan(100);
    });

    it('should set timestamps correctly', async () => {
      await playerStateManager.initialize();

      const beforeAdd = Date.now();
      const result = await playerStateManager.addPlayer('player-3', 'game-1', spawnInfo);
      const afterAdd = Date.now();

      expect(result.connectedAt.getTime()).toBeGreaterThanOrEqual(beforeAdd);
      expect(result.connectedAt.getTime()).toBeLessThanOrEqual(afterAdd);
      expect(result.lastUpdate.getTime()).toBeGreaterThanOrEqual(beforeAdd);
      expect(result.lastUpdate.getTime()).toBeLessThanOrEqual(afterAdd);
      expect(result.lastMovement.getTime()).toBeGreaterThanOrEqual(beforeAdd);
      expect(result.lastMovement.getTime()).toBeLessThanOrEqual(afterAdd);
    });

    it('should add multiple players to same game', async () => {
      await playerStateManager.initialize();

      const player1 = await playerStateManager.addPlayer('player-1', 'game-1', spawnInfo);
      const player2 = await playerStateManager.addPlayer('player-2', 'game-1', spawnInfo);

      expect(player1.gameId).toBe('game-1');
      expect(player2.gameId).toBe('game-1');
      
      const playersInGame = await playerStateManager.getPlayersInGame('game-1');
      expect(playersInGame).toHaveLength(2);
      expect(playersInGame.map(p => p.playerId)).toContain('player-1');
      expect(playersInGame.map(p => p.playerId)).toContain('player-2');
    });

    it('should handle different spawn positions', async () => {
      await playerStateManager.initialize();

      const spawnInfos = [
        { position: { x: 1.5, y: 1.5 }, corner: 'top-left' as const, safeArea: [] },
        { position: { x: 13.5, y: 1.5 }, corner: 'top-right' as const, safeArea: [] },
        { position: { x: 1.5, y: 9.5 }, corner: 'bottom-left' as const, safeArea: [] },
        { position: { x: 13.5, y: 9.5 }, corner: 'bottom-right' as const, safeArea: [] },
      ];

      for (let i = 0; i < spawnInfos.length; i++) {
        const player = await playerStateManager.addPlayer(`player-${i + 1}`, 'game-1', spawnInfos[i]);
        expect(player.position).toEqual(spawnInfos[i].position);
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle operations with uninitialized manager', async () => {
      // Don't initialize, just create
      const uninitializedManager = createPlayerStateManager(eventBus);

      const spawnInfo = {
        position: { x: 1.5, y: 1.5 },
        corner: 'top-left' as const,
        safeArea: [],
      };

      // Should not throw during player operations
      await expect(uninitializedManager.addPlayer('player-1', 'game-1', spawnInfo)).resolves.not.toThrow();
      await expect(uninitializedManager.getPlayerState('player-1')).resolves.not.toThrow();
      await expect(uninitializedManager.getPlayersInGame('game-1')).resolves.not.toThrow();
    });

    it('should handle invalid player and game IDs gracefully', async () => {
      await playerStateManager.initialize();

      const invalidIds = [null, undefined, '', '   '];

      for (const invalidId of invalidIds) {
        await expect(playerStateManager.getPlayerState(invalidId as any)).resolves.toBeDefined();
        await expect(playerStateManager.getPlayersInGame(invalidId as any)).resolves.toBeDefined();
        await expect(playerStateManager.removePlayer(invalidId as any)).resolves.toBeDefined();
        await expect(playerStateManager.cleanup(invalidId as any)).resolves.not.toThrow();
      }
    });

    it('should handle invalid spawn information gracefully', async () => {
      await playerStateManager.initialize();

      const invalidSpawnInfos = [
        { position: { x: null, y: null } as any, corner: 'top-left' as const, safeArea: [] },
        { position: { x: undefined, y: undefined } as any, corner: 'top-right' as const, safeArea: [] },
        { position: { x: NaN, y: NaN }, corner: 'bottom-left' as const, safeArea: [] },
        { position: { x: -1000, y: -1000 }, corner: 'bottom-right' as const, safeArea: [] },
      ];

      for (const spawnInfo of invalidSpawnInfos) {
        await expect(playerStateManager.addPlayer('player-invalid', 'game-1', spawnInfo)).resolves.toBeDefined();
      }
    });

    it('should handle operations on non-existent players', async () => {
      await playerStateManager.initialize();

      // Operations on non-existent players should return reasonable defaults
      const state = await playerStateManager.getPlayerState('non-existent');
      expect(state).toBeNull();

      const updateResult = await playerStateManager.updatePlayerPosition({
        playerId: 'non-existent',
        position: { x: 1, y: 1 },
        direction: 'up' as const,
        timestamp: new Date(),
      });
      expect(updateResult).toBe(false);

      const damageResult = await playerStateManager.damagePlayer('non-existent', 10);
      expect(damageResult).toEqual({ died: false, newHealth: 0 });

      const eliminateResult = await playerStateManager.eliminatePlayer('non-existent');
      expect(eliminateResult).toBe(false);

      const respawnResult = await playerStateManager.respawnPlayer('non-existent');
      expect(respawnResult).toBe(false);
    });
  });
});