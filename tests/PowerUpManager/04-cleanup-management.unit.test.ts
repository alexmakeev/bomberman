/**
 * PowerUpManager Unit Tests - Cleanup and Management
 * Tests game cleanup, power-up expiration, and integration scenarios
 * 
 * References:
 * - src/modules/PowerUpManager/index.ts:155-163 - cleanup method
 * - src/modules/PowerUpManager/index.ts:59-91 - complete power-up lifecycle
 * - Power-up lifecycle: spawn -> active -> collected/expired -> removed
 * - Game isolation and multi-game scenarios
 */

import { createEventBusImpl } from '../../src/modules/EventBusImpl';
import { createPowerUpManager } from '../../src/modules/PowerUpManager';
import type { EventBus } from '../../src/interfaces/core/EventBus';

describe('PowerUpManager - Cleanup and Management', () => {
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

  describe('cleanup()', () => {
    it('should remove all power-ups for specific game', async () => {
      const game1 = 'cleanup-game-1';
      const game2 = 'cleanup-game-2';
      
      // Spawn power-ups in both games
      await powerUpManager.spawnPowerUp(game1, 'bomb_upgrade', { x: 1, y: 1 });
      await powerUpManager.spawnPowerUp(game1, 'blast_radius', { x: 2, y: 2 });
      await powerUpManager.spawnPowerUp(game2, 'speed_boost', { x: 3, y: 3 });
      await powerUpManager.spawnPowerUp(game2, 'bomb_kick', { x: 4, y: 4 });
      
      // Verify both games have power-ups
      let game1PowerUps = await powerUpManager.getPowerUpsInGame(game1);
      let game2PowerUps = await powerUpManager.getPowerUpsInGame(game2);
      expect(game1PowerUps).toHaveLength(2);
      expect(game2PowerUps).toHaveLength(2);
      
      // Cleanup game1
      await powerUpManager.cleanup(game1);
      
      // Game1 should be empty, game2 should be unaffected
      game1PowerUps = await powerUpManager.getPowerUpsInGame(game1);
      game2PowerUps = await powerUpManager.getPowerUpsInGame(game2);
      expect(game1PowerUps).toHaveLength(0);
      expect(game2PowerUps).toHaveLength(2);
    });

    it('should handle cleanup of game with no power-ups', async () => {
      const emptyGameId = 'empty-cleanup-game';
      
      // Cleanup empty game should not throw
      await expect(powerUpManager.cleanup(emptyGameId)).resolves.not.toThrow();
      
      // Should still return empty array
      const powerUps = await powerUpManager.getPowerUpsInGame(emptyGameId);
      expect(powerUps).toEqual([]);
    });

    it('should handle cleanup of non-existent game', async () => {
      await expect(powerUpManager.cleanup('non-existent-game')).resolves.not.toThrow();
    });

    it('should handle cleanup with collected power-ups', async () => {
      const gameId = 'cleanup-collected-game';
      
      // Spawn power-ups
      const powerUpId1 = await powerUpManager.spawnPowerUp(gameId, 'bomb_upgrade', { x: 1, y: 1 });
      const powerUpId2 = await powerUpManager.spawnPowerUp(gameId, 'blast_radius', { x: 2, y: 2 });
      
      // Collect one power-up
      await powerUpManager.collectPowerUp(powerUpId1, 'player-1');
      
      // One should remain active
      let powerUps = await powerUpManager.getPowerUpsInGame(gameId);
      expect(powerUps).toHaveLength(1);
      expect(powerUps[0].powerUpId).toBe(powerUpId2);
      
      // Cleanup should remove remaining power-ups
      await powerUpManager.cleanup(gameId);
      
      powerUps = await powerUpManager.getPowerUpsInGame(gameId);
      expect(powerUps).toHaveLength(0);
    });

    it('should handle cleanup with invalid game IDs', async () => {
      const invalidIds = [null, undefined, '', '   '];
      
      for (const invalidId of invalidIds) {
        await expect(powerUpManager.cleanup(invalidId as any)).resolves.not.toThrow();
      }
    });

    it('should handle multiple cleanup calls for same game', async () => {
      const gameId = 'multi-cleanup-game';
      
      // Spawn some power-ups
      await powerUpManager.spawnPowerUp(gameId, 'bomb_upgrade', { x: 1, y: 1 });
      await powerUpManager.spawnPowerUp(gameId, 'blast_radius', { x: 2, y: 2 });
      
      // Multiple cleanup calls should be safe
      await powerUpManager.cleanup(gameId);
      await powerUpManager.cleanup(gameId);
      await powerUpManager.cleanup(gameId);
      
      const powerUps = await powerUpManager.getPowerUpsInGame(gameId);
      expect(powerUps).toEqual([]);
    });

    it('should handle concurrent cleanup calls', async () => {
      const gameId = 'concurrent-cleanup-game';
      
      // Spawn many power-ups
      const spawnPromises = [];
      for (let i = 0; i < 10; i++) {
        spawnPromises.push(powerUpManager.spawnPowerUp(gameId, 'bomb_upgrade', { x: i, y: i }));
      }
      await Promise.all(spawnPromises);
      
      // Verify power-ups exist
      let powerUps = await powerUpManager.getPowerUpsInGame(gameId);
      expect(powerUps).toHaveLength(10);
      
      // Concurrent cleanup calls
      const cleanupPromises = [
        powerUpManager.cleanup(gameId),
        powerUpManager.cleanup(gameId),
        powerUpManager.cleanup(gameId),
      ];
      
      await Promise.all(cleanupPromises);
      
      // Should be completely cleaned
      powerUps = await powerUpManager.getPowerUpsInGame(gameId);
      expect(powerUps).toEqual([]);
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle complete game lifecycle', async () => {
      const gameId = 'lifecycle-game';
      const playerId = 'lifecycle-player';
      
      // 1. Start with empty game
      let powerUps = await powerUpManager.getPowerUpsInGame(gameId);
      expect(powerUps).toEqual([]);
      
      let playerState = await powerUpManager.getPlayerPowerUps(playerId);
      expect(playerState).toBeNull();
      
      // 2. Spawn various power-ups
      const powerUpIds = [];
      const types = ['bomb_upgrade', 'blast_radius', 'speed_boost', 'bomb_kick'];
      for (let i = 0; i < types.length; i++) {
        const powerUpId = await powerUpManager.spawnPowerUp(gameId, types[i] as any, { x: i, y: i });
        powerUpIds.push(powerUpId);
      }
      
      powerUps = await powerUpManager.getPowerUpsInGame(gameId);
      expect(powerUps).toHaveLength(4);
      
      // 3. Collect some power-ups
      await powerUpManager.collectPowerUp(powerUpIds[0], playerId); // bomb_upgrade
      await powerUpManager.collectPowerUp(powerUpIds[2], playerId); // speed_boost
      
      // 4. Check remaining power-ups
      powerUps = await powerUpManager.getPowerUpsInGame(gameId);
      expect(powerUps).toHaveLength(2);
      expect(powerUps.map(p => p.type)).toEqual(['blast_radius', 'bomb_kick']);
      
      // 5. Check player state
      playerState = await powerUpManager.getPlayerPowerUps(playerId);
      expect(playerState!.maxBombs).toBe(2);
      expect(playerState!.speedMultiplier).toBe(1.2);
      
      // 6. Cleanup game
      await powerUpManager.cleanup(gameId);
      
      powerUps = await powerUpManager.getPowerUpsInGame(gameId);
      expect(powerUps).toEqual([]);
      
      // 7. Player state should persist after cleanup
      playerState = await powerUpManager.getPlayerPowerUps(playerId);
      expect(playerState!.maxBombs).toBe(2);
      expect(playerState!.speedMultiplier).toBe(1.2);
    });

    it('should handle multiple games with same power-up types', async () => {
      const games = ['multi-game-a', 'multi-game-b', 'multi-game-c'];
      const players = ['multi-player-1', 'multi-player-2', 'multi-player-3'];
      
      // Spawn same types in all games
      const spawnedPowerUps = new Map();
      for (const gameId of games) {
        const gameSpawned = [];
        gameSpawned.push(await powerUpManager.spawnPowerUp(gameId, 'bomb_upgrade', { x: 1, y: 1 }));
        gameSpawned.push(await powerUpManager.spawnPowerUp(gameId, 'blast_radius', { x: 2, y: 2 }));
        spawnedPowerUps.set(gameId, gameSpawned);
      }
      
      // Collect power-ups from each game with different players
      for (let i = 0; i < games.length; i++) {
        const gameId = games[i];
        const playerId = players[i];
        const gamePowerUps = spawnedPowerUps.get(gameId);
        
        await powerUpManager.collectPowerUp(gamePowerUps[0], playerId); // bomb_upgrade
      }
      
      // Verify each player has correct upgrades
      for (const playerId of players) {
        const playerState = await powerUpManager.getPlayerPowerUps(playerId);
        expect(playerState!.maxBombs).toBe(2);
        expect(playerState!.blastRadius).toBe(1);
      }
      
      // Verify remaining power-ups per game
      for (const gameId of games) {
        const powerUps = await powerUpManager.getPowerUpsInGame(gameId);
        expect(powerUps).toHaveLength(1);
        expect(powerUps[0].type).toBe('blast_radius');
      }
      
      // Cleanup one game
      await powerUpManager.cleanup(games[0]);
      
      const game0PowerUps = await powerUpManager.getPowerUpsInGame(games[0]);
      const game1PowerUps = await powerUpManager.getPowerUpsInGame(games[1]);
      const game2PowerUps = await powerUpManager.getPowerUpsInGame(games[2]);
      
      expect(game0PowerUps).toHaveLength(0);
      expect(game1PowerUps).toHaveLength(1);
      expect(game2PowerUps).toHaveLength(1);
    });

    it('should handle rapid spawn-collect-cleanup cycles', async () => {
      const gameId = 'rapid-cycle-game';
      const playerId = 'rapid-cycle-player';
      
      // Perform multiple rapid cycles
      for (let cycle = 0; cycle < 5; cycle++) {
        // Spawn power-ups
        const powerUpIds = [];
        for (let i = 0; i < 3; i++) {
          const powerUpId = await powerUpManager.spawnPowerUp(gameId, 'bomb_upgrade', { x: i, y: cycle });
          powerUpIds.push(powerUpId);
        }
        
        // Verify spawned
        let powerUps = await powerUpManager.getPowerUpsInGame(gameId);
        expect(powerUps).toHaveLength(3);
        
        // Collect some
        await powerUpManager.collectPowerUp(powerUpIds[0], playerId);
        await powerUpManager.collectPowerUp(powerUpIds[1], playerId);
        
        // One should remain
        powerUps = await powerUpManager.getPowerUpsInGame(gameId);
        expect(powerUps).toHaveLength(1);
        
        // Cleanup
        await powerUpManager.cleanup(gameId);
        
        powerUps = await powerUpManager.getPowerUpsInGame(gameId);
        expect(powerUps).toEqual([]);
      }
      
      // Player should have collected 10 bomb upgrades (2 per cycle * 5 cycles)
      // But capped at 10
      const playerState = await powerUpManager.getPlayerPowerUps(playerId);
      expect(playerState!.maxBombs).toBe(10);
    });

    it('should handle large scale operations', async () => {
      const gameCount = 10;
      const powerUpsPerGame = 20;
      
      // Create many games with many power-ups
      const games = [];
      const allPowerUpIds = [];
      
      for (let g = 0; g < gameCount; g++) {
        const gameId = `scale-game-${g}`;
        games.push(gameId);
        
        const gamePowerUps = [];
        for (let p = 0; p < powerUpsPerGame; p++) {
          const type = ['bomb_upgrade', 'blast_radius', 'speed_boost'][p % 3];
          const powerUpId = await powerUpManager.spawnPowerUp(gameId, type as any, { x: p, y: g });
          gamePowerUps.push(powerUpId);
        }
        allPowerUpIds.push(gamePowerUps);
      }
      
      // Verify all power-ups exist
      for (let g = 0; g < gameCount; g++) {
        const powerUps = await powerUpManager.getPowerUpsInGame(games[g]);
        expect(powerUps).toHaveLength(powerUpsPerGame);
      }
      
      // Collect half the power-ups in each game
      for (let g = 0; g < gameCount; g++) {
        const playerId = `scale-player-${g}`;
        const gamePowerUps = allPowerUpIds[g];
        
        for (let p = 0; p < powerUpsPerGame / 2; p++) {
          await powerUpManager.collectPowerUp(gamePowerUps[p], playerId);
        }
      }
      
      // Verify remaining power-ups
      for (let g = 0; g < gameCount; g++) {
        const powerUps = await powerUpManager.getPowerUpsInGame(games[g]);
        expect(powerUps).toHaveLength(powerUpsPerGame / 2);
      }
      
      // Cleanup all games
      const cleanupPromises = games.map(gameId => powerUpManager.cleanup(gameId));
      await Promise.all(cleanupPromises);
      
      // Verify all games are clean
      for (const gameId of games) {
        const powerUps = await powerUpManager.getPowerUpsInGame(gameId);
        expect(powerUps).toEqual([]);
      }
    });
  });

  describe('Memory and Performance', () => {
    it('should not leak memory after cleanup', async () => {
      const gameId = 'memory-test-game';
      
      // Create and cleanup many times
      for (let iteration = 0; iteration < 10; iteration++) {
        // Spawn many power-ups
        const powerUpIds = [];
        for (let i = 0; i < 50; i++) {
          const powerUpId = await powerUpManager.spawnPowerUp(gameId, 'bomb_upgrade', { x: i, y: iteration });
          powerUpIds.push(powerUpId);
        }
        
        // Collect some
        for (let i = 0; i < 25; i++) {
          await powerUpManager.collectPowerUp(powerUpIds[i], `player-${iteration}-${i}`);
        }
        
        // Cleanup
        await powerUpManager.cleanup(gameId);
        
        // Should be empty
        const powerUps = await powerUpManager.getPowerUpsInGame(gameId);
        expect(powerUps).toEqual([]);
      }
    });

    it('should handle cleanup of games with expired invincibility', async () => {
      const gameId = 'invincibility-cleanup-game';
      const playerId = 'invincibility-cleanup-player';
      
      // Apply invincibility effect
      await powerUpManager.applyPowerUpEffect(playerId, 'invincibility');
      
      let playerState = await powerUpManager.getPlayerPowerUps(playerId);
      expect(playerState!.isInvincible).toBe(true);
      
      // Manually expire invincibility
      const expiredTime = new Date(Date.now() - 1000);
      playerState!.invincibilityUntil = expiredTime;
      
      // Create power-ups in game
      await powerUpManager.spawnPowerUp(gameId, 'bomb_upgrade', { x: 1, y: 1 });
      
      // Cleanup should not affect player state
      await powerUpManager.cleanup(gameId);
      
      // Player state should still exist but invincibility should be expired
      playerState = await powerUpManager.getPlayerPowerUps(playerId);
      expect(playerState).not.toBeNull();
      expect(playerState!.isInvincible).toBe(false);
    });
  });
});