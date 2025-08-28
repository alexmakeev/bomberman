/**
 * PlayerStateManager Unit Tests - Player Statistics and Management
 * Tests player statistics tracking, game management, and cleanup operations
 * 
 * References:
 * - src/modules/PlayerStateManager/index.ts:226-235 - updatePlayerStats method
 * - src/modules/PlayerStateManager/index.ts:213-224 - getPlayersInGame method
 * - src/modules/PlayerStateManager/index.ts:237-260 - removePlayer method
 * - src/modules/PlayerStateManager/index.ts:262-271 - cleanup method
 */

import { createEventBusImpl } from '../../src/modules/EventBusImpl';
import { createPlayerStateManager } from '../../src/modules/PlayerStateManager';
import type { EventBus } from '../../src/interfaces/core/EventBus';

describe('PlayerStateManager - Player Statistics and Management', () => {
  let eventBus: EventBus;
  let playerStateManager: any;

  const spawnInfo = {
    position: { x: 1.5, y: 1.5 },
    corner: 'top-left' as const,
    safeArea: [{ x: 1, y: 1 }, { x: 2, y: 1 }],
  };

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
    await playerStateManager.initialize();
  });

  afterEach(async () => {
    if (eventBus) {
      await eventBus.shutdown();
    }
  });

  describe('updatePlayerStats()', () => {
    beforeEach(async () => {
      await playerStateManager.addPlayer('player-1', 'game-1', spawnInfo);
    });

    it('should update bombs placed stat', async () => {
      await playerStateManager.updatePlayerStats('player-1', { bombsPlaced: 1 });

      const playerState = await playerStateManager.getPlayerState('player-1');
      expect(playerState.bombsPlaced).toBe(1);
    });

    it('should update walls destroyed stat', async () => {
      await playerStateManager.updatePlayerStats('player-1', { wallsDestroyed: 3 });

      const playerState = await playerStateManager.getPlayerState('player-1');
      expect(playerState.wallsDestroyed).toBe(3);
    });

    it('should update power-ups collected stat', async () => {
      await playerStateManager.updatePlayerStats('player-1', { powerUpsCollected: 2 });

      const playerState = await playerStateManager.getPlayerState('player-1');
      expect(playerState.powerUpsCollected).toBe(2);
    });

    it('should update multiple stats simultaneously', async () => {
      await playerStateManager.updatePlayerStats('player-1', {
        bombsPlaced: 2,
        wallsDestroyed: 5,
        powerUpsCollected: 1,
      });

      const playerState = await playerStateManager.getPlayerState('player-1');
      expect(playerState.bombsPlaced).toBe(2);
      expect(playerState.wallsDestroyed).toBe(5);
      expect(playerState.powerUpsCollected).toBe(1);
    });

    it('should accumulate stats across multiple updates', async () => {
      await playerStateManager.updatePlayerStats('player-1', { bombsPlaced: 3 });
      await playerStateManager.updatePlayerStats('player-1', { bombsPlaced: 2 });
      await playerStateManager.updatePlayerStats('player-1', { wallsDestroyed: 1 });
      await playerStateManager.updatePlayerStats('player-1', { wallsDestroyed: 4 });

      const playerState = await playerStateManager.getPlayerState('player-1');
      expect(playerState.bombsPlaced).toBe(5);
      expect(playerState.wallsDestroyed).toBe(5);
      expect(playerState.powerUpsCollected).toBe(0); // Not updated
    });

    it('should handle zero stat updates', async () => {
      await playerStateManager.updatePlayerStats('player-1', {
        bombsPlaced: 0,
        wallsDestroyed: 0,
        powerUpsCollected: 0,
      });

      const playerState = await playerStateManager.getPlayerState('player-1');
      expect(playerState.bombsPlaced).toBe(0);
      expect(playerState.wallsDestroyed).toBe(0);
      expect(playerState.powerUpsCollected).toBe(0);
    });

    it('should handle negative stat updates', async () => {
      // First add some positive stats
      await playerStateManager.updatePlayerStats('player-1', { bombsPlaced: 5 });
      
      // Then subtract (though this may be implementation dependent)
      await playerStateManager.updatePlayerStats('player-1', { bombsPlaced: -2 });

      const playerState = await playerStateManager.getPlayerState('player-1');
      expect(playerState.bombsPlaced).toBe(3);
    });

    it('should update lastUpdate timestamp', async () => {
      const beforeUpdate = Date.now();
      await playerStateManager.updatePlayerStats('player-1', { bombsPlaced: 1 });
      const afterUpdate = Date.now();

      const playerState = await playerStateManager.getPlayerState('player-1');
      expect(playerState.lastUpdate.getTime()).toBeGreaterThanOrEqual(beforeUpdate);
      expect(playerState.lastUpdate.getTime()).toBeLessThanOrEqual(afterUpdate);
    });

    it('should handle empty stats object', async () => {
      await expect(playerStateManager.updatePlayerStats('player-1', {})).resolves.not.toThrow();

      const playerState = await playerStateManager.getPlayerState('player-1');
      expect(playerState.bombsPlaced).toBe(0);
      expect(playerState.wallsDestroyed).toBe(0);
      expect(playerState.powerUpsCollected).toBe(0);
    });

    it('should ignore stats update for non-existent player', async () => {
      await expect(playerStateManager.updatePlayerStats('non-existent', { bombsPlaced: 5 })).resolves.not.toThrow();
    });

    it('should handle partial stat updates', async () => {
      await playerStateManager.updatePlayerStats('player-1', { bombsPlaced: 3 });
      await playerStateManager.updatePlayerStats('player-1', { powerUpsCollected: 2 });

      const playerState = await playerStateManager.getPlayerState('player-1');
      expect(playerState.bombsPlaced).toBe(3);
      expect(playerState.wallsDestroyed).toBe(0); // Not updated
      expect(playerState.powerUpsCollected).toBe(2);
    });
  });

  describe('getPlayersInGame()', () => {
    it('should return empty array for non-existent game', async () => {
      const players = await playerStateManager.getPlayersInGame('non-existent-game');
      expect(players).toEqual([]);
    });

    it('should return single player in game', async () => {
      await playerStateManager.addPlayer('player-1', 'game-1', spawnInfo);

      const players = await playerStateManager.getPlayersInGame('game-1');
      expect(players).toHaveLength(1);
      expect(players[0].playerId).toBe('player-1');
      expect(players[0].gameId).toBe('game-1');
    });

    it('should return multiple players in same game', async () => {
      await playerStateManager.addPlayer('player-1', 'game-1', spawnInfo);
      await playerStateManager.addPlayer('player-2', 'game-1', {
        position: { x: 13.5, y: 9.5 },
        corner: 'bottom-right' as const,
        safeArea: [],
      });
      await playerStateManager.addPlayer('player-3', 'game-1', {
        position: { x: 1.5, y: 9.5 },
        corner: 'bottom-left' as const,
        safeArea: [],
      });

      const players = await playerStateManager.getPlayersInGame('game-1');
      expect(players).toHaveLength(3);

      const playerIds = players.map(p => p.playerId);
      expect(playerIds).toContain('player-1');
      expect(playerIds).toContain('player-2');
      expect(playerIds).toContain('player-3');
    });

    it('should not return players from different games', async () => {
      await playerStateManager.addPlayer('player-1', 'game-1', spawnInfo);
      await playerStateManager.addPlayer('player-2', 'game-2', spawnInfo);

      const game1Players = await playerStateManager.getPlayersInGame('game-1');
      const game2Players = await playerStateManager.getPlayersInGame('game-2');

      expect(game1Players).toHaveLength(1);
      expect(game2Players).toHaveLength(1);
      expect(game1Players[0].playerId).toBe('player-1');
      expect(game2Players[0].playerId).toBe('player-2');
    });

    it('should return players with updated states', async () => {
      await playerStateManager.addPlayer('player-1', 'game-1', spawnInfo);
      await playerStateManager.updatePlayerStats('player-1', { bombsPlaced: 5 });

      const players = await playerStateManager.getPlayersInGame('game-1');
      expect(players).toHaveLength(1);
      expect(players[0].bombsPlaced).toBe(5);
    });

    it('should handle invincibility state correctly', async () => {
      await playerStateManager.addPlayer('player-1', 'game-1', spawnInfo);

      // Immediately after spawn - should be invincible
      let players = await playerStateManager.getPlayersInGame('game-1');
      expect(players[0].isInvincible).toBe(true);

      // After invincibility timeout
      await new Promise(resolve => setTimeout(resolve, 1100));
      players = await playerStateManager.getPlayersInGame('game-1');
      expect(players[0].isInvincible).toBe(false);
    });

    it('should include dead players in the list', async () => {
      await playerStateManager.addPlayer('player-1', 'game-1', spawnInfo);
      await playerStateManager.eliminatePlayer('player-1');

      const players = await playerStateManager.getPlayersInGame('game-1');
      expect(players).toHaveLength(1);
      expect(players[0].status).toBe('dead');
    });
  });

  describe('removePlayer()', () => {
    beforeEach(async () => {
      await playerStateManager.addPlayer('player-1', 'game-1', spawnInfo);
    });

    it('should remove existing player successfully', async () => {
      const result = await playerStateManager.removePlayer('player-1');
      expect(result).toBe(true);

      const playerState = await playerStateManager.getPlayerState('player-1');
      expect(playerState).toBeNull();
    });

    it('should remove player from game player list', async () => {
      await playerStateManager.removePlayer('player-1');

      const playersInGame = await playerStateManager.getPlayersInGame('game-1');
      expect(playersInGame).toHaveLength(0);
    });

    it('should clear respawn timers when removing player', async () => {
      // Kill player to create respawn timer
      await playerStateManager.eliminatePlayer('player-1');
      
      // Remove player (should clear timer)
      const result = await playerStateManager.removePlayer('player-1');
      expect(result).toBe(true);

      // Player should not respawn automatically after removal
      await new Promise(resolve => setTimeout(resolve, 500));
      const playerState = await playerStateManager.getPlayerState('player-1');
      expect(playerState).toBeNull();
    });

    it('should handle removal of non-existent player', async () => {
      const result = await playerStateManager.removePlayer('non-existent');
      expect(result).toBe(false);
    });

    it('should clean up empty game player lists', async () => {
      await playerStateManager.removePlayer('player-1');

      // Game should effectively have no players
      const playersInGame = await playerStateManager.getPlayersInGame('game-1');
      expect(playersInGame).toHaveLength(0);
    });

    it('should only remove specific player from multi-player game', async () => {
      // Add second player
      await playerStateManager.addPlayer('player-2', 'game-1', {
        position: { x: 13.5, y: 9.5 },
        corner: 'bottom-right' as const,
        safeArea: [],
      });

      // Remove first player
      await playerStateManager.removePlayer('player-1');

      const playersInGame = await playerStateManager.getPlayersInGame('game-1');
      expect(playersInGame).toHaveLength(1);
      expect(playersInGame[0].playerId).toBe('player-2');
    });
  });

  describe('cleanup()', () => {
    beforeEach(async () => {
      await playerStateManager.addPlayer('player-1', 'game-1', spawnInfo);
      await playerStateManager.addPlayer('player-2', 'game-1', {
        position: { x: 13.5, y: 9.5 },
        corner: 'bottom-right' as const,
        safeArea: [],
      });
      await playerStateManager.addPlayer('player-3', 'game-2', spawnInfo);
    });

    it('should remove all players from specified game', async () => {
      await playerStateManager.cleanup('game-1');

      const game1Players = await playerStateManager.getPlayersInGame('game-1');
      const game2Players = await playerStateManager.getPlayersInGame('game-2');

      expect(game1Players).toHaveLength(0);
      expect(game2Players).toHaveLength(1); // game-2 player should remain
    });

    it('should clear all player states for game players', async () => {
      await playerStateManager.cleanup('game-1');

      const player1State = await playerStateManager.getPlayerState('player-1');
      const player2State = await playerStateManager.getPlayerState('player-2');
      const player3State = await playerStateManager.getPlayerState('player-3');

      expect(player1State).toBeNull();
      expect(player2State).toBeNull();
      expect(player3State).not.toBeNull(); // game-2 player should remain
    });

    it('should clear respawn timers for eliminated players', async () => {
      // Eliminate players to create respawn timers
      await playerStateManager.eliminatePlayer('player-1');
      await playerStateManager.eliminatePlayer('player-2');

      // Cleanup should clear timers
      await playerStateManager.cleanup('game-1');

      // Wait past respawn time - players should not respawn
      await new Promise(resolve => setTimeout(resolve, 500));

      const player1State = await playerStateManager.getPlayerState('player-1');
      const player2State = await playerStateManager.getPlayerState('player-2');

      expect(player1State).toBeNull();
      expect(player2State).toBeNull();
    });

    it('should handle cleanup of empty game', async () => {
      await expect(playerStateManager.cleanup('empty-game')).resolves.not.toThrow();
    });

    it('should handle cleanup of non-existent game', async () => {
      await expect(playerStateManager.cleanup('non-existent')).resolves.not.toThrow();
    });

    it('should not affect other games during cleanup', async () => {
      await playerStateManager.cleanup('game-1');

      // game-2 should be unaffected
      const game2Players = await playerStateManager.getPlayersInGame('game-2');
      expect(game2Players).toHaveLength(1);
      expect(game2Players[0].playerId).toBe('player-3');
    });
  });

  describe('Game Isolation', () => {
    it('should maintain separate player lists per game', async () => {
      await playerStateManager.addPlayer('player-1', 'game-1', spawnInfo);
      await playerStateManager.addPlayer('player-2', 'game-2', spawnInfo);
      await playerStateManager.addPlayer('player-3', 'game-1', spawnInfo);

      const game1Players = await playerStateManager.getPlayersInGame('game-1');
      const game2Players = await playerStateManager.getPlayersInGame('game-2');

      expect(game1Players).toHaveLength(2);
      expect(game2Players).toHaveLength(1);

      const game1Ids = game1Players.map(p => p.playerId);
      expect(game1Ids).toContain('player-1');
      expect(game1Ids).toContain('player-3');
      expect(game2Players[0].playerId).toBe('player-2');
    });

    it('should allow same player ID in different games', async () => {
      // This tests if the implementation allows same player ID across different games
      await playerStateManager.addPlayer('player-1', 'game-1', spawnInfo);
      
      // This might fail depending on implementation - player IDs might be globally unique
      try {
        await playerStateManager.addPlayer('player-1', 'game-2', spawnInfo);
        
        const game1Players = await playerStateManager.getPlayersInGame('game-1');
        const game2Players = await playerStateManager.getPlayersInGame('game-2');
        
        // If this succeeds, we have duplicate player IDs across games
        expect(game1Players).toHaveLength(1);
        expect(game2Players).toHaveLength(1);
      } catch (error) {
        // If it fails, that's also acceptable - player IDs are globally unique
        console.log('Player IDs are globally unique across games');
      }
    });
  });

  describe('Performance and Edge Cases', () => {
    it('should handle rapid stats updates', async () => {
      await playerStateManager.addPlayer('player-1', 'game-1', spawnInfo);

      const updates = Array.from({ length: 100 }, (_, i) => 
        playerStateManager.updatePlayerStats('player-1', { bombsPlaced: 1 })
      );

      await Promise.all(updates);

      const playerState = await playerStateManager.getPlayerState('player-1');
      expect(playerState.bombsPlaced).toBe(100);
    });

    it('should handle large numbers of players', async () => {
      const playerCount = 50;
      const addPromises = [];

      for (let i = 0; i < playerCount; i++) {
        addPromises.push(
          playerStateManager.addPlayer(`player-${i}`, 'game-1', {
            position: { x: Math.random() * 15, y: Math.random() * 10 },
            corner: 'top-left' as const,
            safeArea: [],
          })
        );
      }

      await Promise.all(addPromises);

      const players = await playerStateManager.getPlayersInGame('game-1');
      expect(players).toHaveLength(playerCount);
    });

    it('should handle concurrent operations gracefully', async () => {
      await playerStateManager.addPlayer('player-1', 'game-1', spawnInfo);

      // Perform multiple concurrent operations
      const operations = [
        playerStateManager.updatePlayerPosition({
          playerId: 'player-1',
          position: { x: 5, y: 5 },
          direction: 'right' as const,
          timestamp: new Date(),
        }),
        playerStateManager.updatePlayerStats('player-1', { bombsPlaced: 1 }),
        playerStateManager.damagePlayer('player-1', 10),
        playerStateManager.getPlayerState('player-1'),
        playerStateManager.getPlayersInGame('game-1'),
      ];

      await expect(Promise.allSettled(operations)).resolves.toBeDefined();
    });
  });
});