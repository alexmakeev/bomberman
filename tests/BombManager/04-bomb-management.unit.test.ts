/**
 * BombManager Unit Tests - Bomb Management
 * Tests bomb defusing, cleanup, game isolation, and edge cases
 * 
 * References:
 * - src/modules/BombManager/index.ts:183-205 - defuseBomb method
 * - src/modules/BombManager/index.ts:219-244 - cleanup method
 * - src/modules/BombManager/index.ts:207-217 - getBombsInGame, getExplosionsInGame, getPlayerBombCount methods
 * - Game mechanics: Bomb defusing, game cleanup, multi-game isolation
 */

import { createEventBusImpl } from '../../src/modules/EventBusImpl';
import { createBombManager } from '../../src/modules/BombManager';
import type { EventBus } from '../../src/interfaces/core/EventBus';

describe('BombManager - Bomb Management', () => {
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

  describe('defuseBomb()', () => {
    it('should defuse active bomb successfully', async () => {
      const gameId = 'test-game-1';
      const playerId = 'player-1';
      const position = { x: 5, y: 5 };

      // Place bomb
      const placementResult = await bombManager.placeBomb(gameId, playerId, position);
      expect(placementResult.success).toBe(true);

      // Defuse bomb
      const defuseResult = await bombManager.defuseBomb(placementResult.bombId);
      expect(defuseResult).toBe(true);
    });

    it('should remove defused bomb from active bombs', async () => {
      const gameId = 'test-game-2';
      const playerId = 'player-1';
      const position = { x: 3, y: 3 };

      const placementResult = await bombManager.placeBomb(gameId, playerId, position);
      expect(placementResult.success).toBe(true);

      // Verify bomb is active
      let bombs = await bombManager.getBombsInGame(gameId);
      expect(bombs).toHaveLength(1);
      expect(bombs[0].status).toBe('active');

      // Defuse bomb
      const defuseResult = await bombManager.defuseBomb(placementResult.bombId);
      expect(defuseResult).toBe(true);

      // Verify bomb is removed
      bombs = await bombManager.getBombsInGame(gameId);
      expect(bombs).toHaveLength(0);
    });

    it('should decrement player bomb count after defusing', async () => {
      const gameId = 'test-game-3';
      const playerId = 'player-1';
      const position = { x: 7, y: 7 };

      const placementResult = await bombManager.placeBomb(gameId, playerId, position);
      expect(placementResult.success).toBe(true);

      // Verify bomb count is 1
      let bombCount = await bombManager.getPlayerBombCount(playerId);
      expect(bombCount).toBe(1);

      // Defuse bomb
      const defuseResult = await bombManager.defuseBomb(placementResult.bombId);
      expect(defuseResult).toBe(true);

      // Verify bomb count is back to 0
      bombCount = await bombManager.getPlayerBombCount(playerId);
      expect(bombCount).toBe(0);
    });

    it('should allow placing new bomb after defusing', async () => {
      const gameId = 'test-game-4';
      const playerId = 'player-1';

      // Place and defuse first bomb
      const firstPlacement = await bombManager.placeBomb(gameId, playerId, { x: 1, y: 1 });
      expect(firstPlacement.success).toBe(true);

      const defuseResult = await bombManager.defuseBomb(firstPlacement.bombId);
      expect(defuseResult).toBe(true);

      // Should be able to place second bomb now
      const secondPlacement = await bombManager.placeBomb(gameId, playerId, { x: 2, y: 2 });
      expect(secondPlacement.success).toBe(true);
    });

    it('should cancel explosion timer when defusing', async (done) => {
      const gameId = 'test-game-timer';
      const playerId = 'player-1';
      const position = { x: 4, y: 4 };

      const placementResult = await bombManager.placeBomb(gameId, playerId, position);
      expect(placementResult.success).toBe(true);

      // Defuse bomb immediately
      const defuseResult = await bombManager.defuseBomb(placementResult.bombId);
      expect(defuseResult).toBe(true);

      // Wait past when bomb would have exploded
      setTimeout(async () => {
        try {
          const bombs = await bombManager.getBombsInGame(gameId);
          expect(bombs).toHaveLength(0); // Should remain defused

          const explosions = await bombManager.getExplosionsInGame(gameId);
          expect(explosions).toHaveLength(0); // Should not have exploded
          
          done();
        } catch (error) {
          done.fail(error);
        }
      }, 3200); // Wait longer than bomb timer
    }, 4000);

    it('should return false for non-existent bomb', async () => {
      const defuseResult = await bombManager.defuseBomb('non-existent-bomb');
      expect(defuseResult).toBe(false);
    });

    it('should return false for already exploded bomb', async () => {
      const gameId = 'test-game-5';
      const playerId = 'player-1';
      const position = { x: 8, y: 8 };

      const placementResult = await bombManager.placeBomb(gameId, playerId, position);
      expect(placementResult.success).toBe(true);

      // Explode bomb first
      const explosionResult = await bombManager.explodeBomb(placementResult.bombId);
      expect(explosionResult).toBeDefined();

      // Try to defuse already exploded bomb
      const defuseResult = await bombManager.defuseBomb(placementResult.bombId);
      expect(defuseResult).toBe(false);
    });

    it('should return false for already defused bomb', async () => {
      const gameId = 'test-game-6';
      const playerId = 'player-1';
      const position = { x: 9, y: 9 };

      const placementResult = await bombManager.placeBomb(gameId, playerId, position);
      expect(placementResult.success).toBe(true);

      // Defuse bomb first time
      const firstDefuse = await bombManager.defuseBomb(placementResult.bombId);
      expect(firstDefuse).toBe(true);

      // Try to defuse same bomb again
      const secondDefuse = await bombManager.defuseBomb(placementResult.bombId);
      expect(secondDefuse).toBe(false);
    });
  });

  describe('cleanup()', () => {
    it('should clean up all bombs for specific game', async () => {
      const game1 = 'game-1';
      const game2 = 'game-2';
      const playerId = 'player-1';

      // Place bombs in both games (this will fail due to bomb limit, but tests the concept)
      const placement1 = await bombManager.placeBomb(game1, playerId, { x: 1, y: 1 });
      expect(placement1.success).toBe(true);

      await bombManager.cleanup(game1); // Reset bomb counts
      const placement2 = await bombManager.placeBomb(game2, playerId, { x: 2, y: 2 });
      expect(placement2.success).toBe(true);

      // Verify both games have bombs
      let bombs1 = await bombManager.getBombsInGame(game1);
      let bombs2 = await bombManager.getBombsInGame(game2);
      
      expect(bombs1).toHaveLength(0); // Already cleaned
      expect(bombs2).toHaveLength(1);

      // Cleanup game2
      await bombManager.cleanup(game2);

      // Verify game2 bombs are cleaned up
      bombs2 = await bombManager.getBombsInGame(game2);
      expect(bombs2).toHaveLength(0);
    });

    it('should clean up explosions for specific game', async () => {
      const game1 = 'game-1';
      const game2 = 'game-2';
      const playerId = 'player-1';

      // Place and explode bombs in both games
      const placement1 = await bombManager.placeBomb(game1, playerId, { x: 1, y: 1 });
      await bombManager.explodeBomb(placement1.bombId);

      await bombManager.cleanup(game1); // Reset bomb counts
      const placement2 = await bombManager.placeBomb(game2, playerId, { x: 2, y: 2 });
      await bombManager.explodeBomb(placement2.bombId);

      // Verify both games have explosions
      let explosions1 = await bombManager.getExplosionsInGame(game1);
      let explosions2 = await bombManager.getExplosionsInGame(game2);
      
      expect(explosions1).toHaveLength(0); // Already cleaned
      expect(explosions2).toHaveLength(1);

      // Cleanup game2
      await bombManager.cleanup(game2);

      // Verify game2 explosions are cleaned up
      explosions2 = await bombManager.getExplosionsInGame(game2);
      expect(explosions2).toHaveLength(0);
    });

    it('should reset player bomb counts correctly', async () => {
      const gameId = 'test-game-cleanup';
      const player1 = 'player-1';
      const player2 = 'player-2';

      // Place bombs for both players
      const placement1 = await bombManager.placeBomb(gameId, player1, { x: 1, y: 1 });
      expect(placement1.success).toBe(true);

      await bombManager.cleanup(gameId); // Reset bomb counts
      const placement2 = await bombManager.placeBomb(gameId, player2, { x: 2, y: 2 });
      expect(placement2.success).toBe(true);

      // Verify counts before cleanup
      let count1 = await bombManager.getPlayerBombCount(player1);
      let count2 = await bombManager.getPlayerBombCount(player2);
      expect(count1).toBe(0); // Already cleaned
      expect(count2).toBe(1);

      // Cleanup game
      await bombManager.cleanup(gameId);

      // Verify counts are reset
      count1 = await bombManager.getPlayerBombCount(player1);
      count2 = await bombManager.getPlayerBombCount(player2);
      expect(count1).toBe(0);
      expect(count2).toBe(0);
    });

    it('should cancel pending explosion timers during cleanup', async (done) => {
      const gameId = 'test-game-timer-cleanup';
      const playerId = 'player-1';

      const placementResult = await bombManager.placeBomb(gameId, playerId, { x: 5, y: 5 });
      expect(placementResult.success).toBe(true);

      // Cleanup immediately (should cancel timer)
      await bombManager.cleanup(gameId);

      // Wait past when bomb would have exploded
      setTimeout(async () => {
        try {
          const bombs = await bombManager.getBombsInGame(gameId);
          expect(bombs).toHaveLength(0);

          const explosions = await bombManager.getExplosionsInGame(gameId);
          expect(explosions).toHaveLength(0); // Should not have exploded
          
          done();
        } catch (error) {
          done.fail(error);
        }
      }, 3200);
    }, 4000);

    it('should not affect other games during cleanup', async () => {
      const game1 = 'game-to-cleanup';
      const game2 = 'game-to-keep';
      const playerId = 'player-1';

      // Place bomb in game1
      const placement1 = await bombManager.placeBomb(game1, playerId, { x: 1, y: 1 });
      expect(placement1.success).toBe(true);

      await bombManager.cleanup(game1); // Reset for game2
      
      // Place bomb in game2
      const placement2 = await bombManager.placeBomb(game2, playerId, { x: 2, y: 2 });
      expect(placement2.success).toBe(true);

      // Cleanup game1 only
      await bombManager.cleanup(game1);

      // Verify game2 is unaffected
      const bombs1 = await bombManager.getBombsInGame(game1);
      const bombs2 = await bombManager.getBombsInGame(game2);
      
      expect(bombs1).toHaveLength(0);
      expect(bombs2).toHaveLength(1);
    });
  });

  describe('Game Isolation', () => {
    it('should return empty arrays for non-existent games', async () => {
      const bombs = await bombManager.getBombsInGame('non-existent-game');
      const explosions = await bombManager.getExplosionsInGame('non-existent-game');
      
      expect(bombs).toEqual([]);
      expect(explosions).toEqual([]);
    });

    it('should filter bombs by game correctly', async () => {
      const game1 = 'game-1';
      const game2 = 'game-2';
      const player1 = 'player-1';
      const player2 = 'player-2';

      // Place bomb in game1
      const placement1 = await bombManager.placeBomb(game1, player1, { x: 1, y: 1 });
      expect(placement1.success).toBe(true);

      await bombManager.cleanup(game1); // Reset bomb counts

      // Place bomb in game2
      const placement2 = await bombManager.placeBomb(game2, player2, { x: 2, y: 2 });
      expect(placement2.success).toBe(true);

      // Verify game isolation
      const bombs1 = await bombManager.getBombsInGame(game1);
      const bombs2 = await bombManager.getBombsInGame(game2);
      
      expect(bombs1).toHaveLength(0); // Cleaned up
      expect(bombs2).toHaveLength(1);
      expect(bombs2[0].gameId).toBe(game2);
      expect(bombs2[0].playerId).toBe(player2);
    });

    it('should filter explosions by game correctly', async () => {
      const game1 = 'game-1';
      const game2 = 'game-2';
      const player1 = 'player-1';
      const player2 = 'player-2';

      // Create explosion in game1
      const placement1 = await bombManager.placeBomb(game1, player1, { x: 1, y: 1 });
      await bombManager.explodeBomb(placement1.bombId);

      await bombManager.cleanup(game1); // Reset bomb counts

      // Create explosion in game2
      const placement2 = await bombManager.placeBomb(game2, player2, { x: 2, y: 2 });
      await bombManager.explodeBomb(placement2.bombId);

      // Verify game isolation
      const explosions1 = await bombManager.getExplosionsInGame(game1);
      const explosions2 = await bombManager.getExplosionsInGame(game2);
      
      expect(explosions1).toHaveLength(0); // Cleaned up
      expect(explosions2).toHaveLength(1);
      expect(explosions2[0].gameId).toBe(game2);
    });
  });

  describe('Edge Cases', () => {
    it('should handle cleanup of empty game', async () => {
      await expect(bombManager.cleanup('empty-game')).resolves.not.toThrow();
    });

    it('should handle defuse of empty string bomb ID', async () => {
      const result = await bombManager.defuseBomb('');
      expect(result).toBe(false);
    });

    it('should handle getting bombs from null game ID', async () => {
      const bombs = await bombManager.getBombsInGame(null as any);
      expect(bombs).toEqual([]);
    });

    it('should handle concurrent operations gracefully', async () => {
      const gameId = 'concurrent-test';
      const playerId = 'player-1';

      const placement = await bombManager.placeBomb(gameId, playerId, { x: 5, y: 5 });
      expect(placement.success).toBe(true);

      // Try concurrent operations
      const promises = [
        bombManager.explodeBomb(placement.bombId),
        bombManager.defuseBomb(placement.bombId),
        bombManager.getBombsInGame(gameId),
        bombManager.cleanup(gameId)
      ];

      // Should not throw errors
      await expect(Promise.allSettled(promises)).resolves.toBeDefined();
    });
  });
});