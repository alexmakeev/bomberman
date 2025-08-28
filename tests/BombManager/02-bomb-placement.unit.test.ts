/**
 * BombManager Unit Tests - Bomb Placement
 * Tests bomb placement mechanics, limits, and validation
 * 
 * References:
 * - src/modules/BombManager/index.ts:85-124 - placeBomb method
 * - src/modules/BombManager/index.ts:10-13 - Constants (DEFAULT_BOMB_TIMER=3000ms, MAX_BOMBS_PER_PLAYER=1)
 * - Game mechanics: Bomb placement validation, player limits, position checking
 */

import { createEventBusImpl } from '../../src/modules/EventBusImpl';
import { createBombManager } from '../../src/modules/BombManager';
import type { EventBus } from '../../src/interfaces/core/EventBus';

describe('BombManager - Bomb Placement', () => {
  let eventBus: EventBus;
  let bombManager: any;

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

    bombManager = createBombManager(eventBus);
    await bombManager.initialize();
  });

  afterEach(async () => {
    if (eventBus) {
      await eventBus.shutdown();
    }
  });

  describe('placeBomb()', () => {
    it('should place bomb successfully for first bomb', async () => {
      const gameId = 'test-game-1';
      const playerId = 'player-1';
      const position = { x: 3, y: 3 };

      const result = await bombManager.placeBomb(gameId, playerId, position);
      
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.bombId).toBeDefined();
      expect(typeof result.bombId).toBe('string');
      expect(result.error).toBeUndefined();
      expect(result.reason).toBeUndefined();
    });

    it('should track bomb in active bombs list', async () => {
      const gameId = 'test-game-2';
      const playerId = 'player-1';
      const position = { x: 5, y: 5 };

      const result = await bombManager.placeBomb(gameId, playerId, position);
      expect(result.success).toBe(true);

      const bombs = await bombManager.getBombsInGame(gameId);
      expect(bombs).toHaveLength(1);
      expect(bombs[0].bombId).toBe(result.bombId);
      expect(bombs[0].playerId).toBe(playerId);
      expect(bombs[0].gameId).toBe(gameId);
      expect(bombs[0].position).toEqual(position);
      expect(bombs[0].status).toBe('active');
    });

    it('should increment player bomb count', async () => {
      const gameId = 'test-game-3';
      const playerId = 'player-1';
      const position = { x: 7, y: 7 };

      // Initially 0 bombs
      let bombCount = await bombManager.getPlayerBombCount(playerId);
      expect(bombCount).toBe(0);

      // Place a bomb
      const result = await bombManager.placeBomb(gameId, playerId, position);
      expect(result.success).toBe(true);

      // Should now have 1 bomb
      bombCount = await bombManager.getPlayerBombCount(playerId);
      expect(bombCount).toBe(1);
    });

    it('should enforce maximum bomb limit per player', async () => {
      const gameId = 'test-game-4';
      const playerId = 'player-1';
      
      // Place first bomb (should succeed)
      const firstResult = await bombManager.placeBomb(gameId, playerId, { x: 1, y: 1 });
      expect(firstResult.success).toBe(true);

      // Try to place second bomb (should fail due to MAX_BOMBS_PER_PLAYER=1)
      const secondResult = await bombManager.placeBomb(gameId, playerId, { x: 2, y: 2 });
      expect(secondResult.success).toBe(false);
      expect(secondResult.reason).toBe('max_bombs_reached');
      expect(secondResult.error).toContain('maximum bomb limit');
      expect(secondResult.bombId).toBeUndefined();
    });

    it('should allow different players to place bombs independently', async () => {
      const gameId = 'test-game-5';
      const player1 = 'player-1';
      const player2 = 'player-2';

      // Both players should be able to place one bomb each
      const result1 = await bombManager.placeBomb(gameId, player1, { x: 1, y: 1 });
      expect(result1.success).toBe(true);

      const result2 = await bombManager.placeBomb(gameId, player2, { x: 3, y: 3 });
      expect(result2.success).toBe(true);

      // Verify both bombs are in the game
      const bombs = await bombManager.getBombsInGame(gameId);
      expect(bombs).toHaveLength(2);

      // Verify bomb counts for each player
      const count1 = await bombManager.getPlayerBombCount(player1);
      const count2 = await bombManager.getPlayerBombCount(player2);
      expect(count1).toBe(1);
      expect(count2).toBe(1);
    });

    it('should set bomb properties correctly', async () => {
      const gameId = 'test-game-6';
      const playerId = 'player-1';
      const position = { x: 9, y: 9 };

      const placementTime = Date.now();
      const result = await bombManager.placeBomb(gameId, playerId, position);
      expect(result.success).toBe(true);

      const bombs = await bombManager.getBombsInGame(gameId);
      expect(bombs).toHaveLength(1);

      const bomb = bombs[0];
      expect(bomb.bombId).toBe(result.bombId);
      expect(bomb.playerId).toBe(playerId);
      expect(bomb.gameId).toBe(gameId);
      expect(bomb.position).toEqual(position);
      expect(bomb.timer).toBe(3000); // DEFAULT_BOMB_TIMER
      expect(bomb.blastRadius).toBe(1); // DEFAULT_BLAST_RADIUS
      expect(bomb.status).toBe('active');
      
      // Check timestamps are reasonable
      const bombPlacedTime = bomb.placedAt.getTime();
      expect(bombPlacedTime).toBeGreaterThanOrEqual(placementTime);
      expect(bombPlacedTime).toBeLessThan(placementTime + 1000); // Within 1 second

      const explodeTime = bomb.explodeAt.getTime();
      expect(explodeTime - bombPlacedTime).toBe(3000); // Should explode 3s after placement
    });

    it('should handle bomb placement in different games independently', async () => {
      const game1 = 'game-1';
      const game2 = 'game-2';
      const playerId = 'player-1';

      // Place bomb in game 1
      const result1 = await bombManager.placeBomb(game1, playerId, { x: 1, y: 1 });
      expect(result1.success).toBe(true);

      // Place bomb in game 2 (should work because bomb limits are per-game)
      const result2 = await bombManager.placeBomb(game2, playerId, { x: 1, y: 1 });
      expect(result2.success).toBe(true); // Implementation now tracks per-game

      // Verify bomb isolation per game
      const bombs1 = await bombManager.getBombsInGame(game1);
      const bombs2 = await bombManager.getBombsInGame(game2);
      
      expect(bombs1).toHaveLength(1);
      expect(bombs2).toHaveLength(1); // Now should have 1 bomb in game 2
    });

    it('should generate unique bomb IDs', async () => {
      const gameId = 'test-game-7';
      const player1 = 'player-1';
      const player2 = 'player-2';

      const result1 = await bombManager.placeBomb(gameId, player1, { x: 1, y: 1 });
      const result2 = await bombManager.placeBomb(gameId, player2, { x: 3, y: 3 });

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      expect(result1.bombId).not.toBe(result2.bombId);
    });

    it('should handle placement at same position by different players', async () => {
      const gameId = 'test-game-8';
      const player1 = 'player-1';
      const player2 = 'player-2';
      const position = { x: 5, y: 5 }; // Same position

      // Currently implementation doesn't validate position conflicts
      const result1 = await bombManager.placeBomb(gameId, player1, position);
      const result2 = await bombManager.placeBomb(gameId, player2, position);

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);

      const bombs = await bombManager.getBombsInGame(gameId);
      expect(bombs).toHaveLength(2);
      expect(bombs[0].position).toEqual(position);
      expect(bombs[1].position).toEqual(position);
    });
  });

  describe('Bomb Count Management', () => {
    it('should return 0 for new player', async () => {
      const count = await bombManager.getPlayerBombCount('new-player');
      expect(count).toBe(0);
    });

    it('should track multiple players independently', async () => {
      const gameId = 'test-game-counts';
      
      await bombManager.placeBomb(gameId, 'player-1', { x: 1, y: 1 });
      await bombManager.placeBomb(gameId, 'player-2', { x: 3, y: 3 });

      const count1 = await bombManager.getPlayerBombCount('player-1');
      const count2 = await bombManager.getPlayerBombCount('player-2');
      const count3 = await bombManager.getPlayerBombCount('player-3'); // Never placed bomb

      expect(count1).toBe(1);
      expect(count2).toBe(1);
      expect(count3).toBe(0);
    });
  });
});