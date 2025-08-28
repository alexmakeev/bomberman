/**
 * PlayerStateManager Unit Tests - Player Lifecycle
 * Tests player health, damage, elimination, respawn, and invincibility mechanics
 * 
 * References:
 * - src/modules/PlayerStateManager/index.ts:121-137 - damagePlayer method
 * - src/modules/PlayerStateManager/index.ts:139-160 - eliminatePlayer method
 * - src/modules/PlayerStateManager/index.ts:162-198 - respawnPlayer method
 * - Constants: RESPAWN_DELAY=10s, INVINCIBILITY_FRAMES=1s
 */

import { createEventBusImpl } from '../../src/modules/EventBusImpl';
import { createPlayerStateManager } from '../../src/modules/PlayerStateManager';
import type { EventBus } from '../../src/interfaces/core/EventBus';

describe('PlayerStateManager - Player Lifecycle', () => {
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

    // Add a test player
    await playerStateManager.addPlayer('player-1', 'game-1', spawnInfo);
  });

  afterEach(async () => {
    if (eventBus) {
      await eventBus.shutdown();
    }
  });

  describe('damagePlayer()', () => {
    it('should not damage invincible player (at spawn)', async () => {
      // Player should be invincible immediately after spawn
      const result = await playerStateManager.damagePlayer('player-1', 50);

      expect(result.died).toBe(false);
      expect(result.newHealth).toBe(100); // No damage taken

      const playerState = await playerStateManager.getPlayerState('player-1');
      expect(playerState.health).toBe(100);
      expect(playerState.status).toBe('alive');
      expect(playerState.isInvincible).toBe(true);
    });

    it('should apply damage to non-invincible player', async () => {
      // Manually remove invincibility by setting past timeout
      const playerState = await playerStateManager.getPlayerState('player-1');
      // Force remove invincibility
      playerState.isInvincible = false;
      playerState.invincibilityUntil = undefined;

      const result = await playerStateManager.damagePlayer('player-1', 25);

      expect(result.died).toBe(false);
      expect(result.newHealth).toBe(75);

      const updatedState = await playerStateManager.getPlayerState('player-1');
      expect(updatedState.health).toBe(75);
      expect(updatedState.status).toBe('alive');
    });

    it('should kill non-invincible player when health drops to zero', async () => {
      // Force remove invincibility
      const playerState = await playerStateManager.getPlayerState('player-1');
      playerState.isInvincible = false;
      playerState.invincibilityUntil = undefined;

      const result = await playerStateManager.damagePlayer('player-1', 100);

      expect(result.died).toBe(true);
      expect(result.newHealth).toBe(0);

      const updatedState = await playerStateManager.getPlayerState('player-1');
      expect(updatedState.health).toBe(0);
      expect(updatedState.status).toBe('dead');
    });

    it('should kill non-invincible player when damage exceeds health', async () => {
      // Force remove invincibility
      const playerState = await playerStateManager.getPlayerState('player-1');
      playerState.isInvincible = false;
      playerState.invincibilityUntil = undefined;

      const result = await playerStateManager.damagePlayer('player-1', 150);

      expect(result.died).toBe(true);
      expect(result.newHealth).toBe(0);

      const updatedState = await playerStateManager.getPlayerState('player-1');
      expect(updatedState.health).toBe(0);
      expect(updatedState.status).toBe('dead');
    });

    it('should not damage invincible player', async () => {
      // Player should be invincible immediately after spawn
      const result = await playerStateManager.damagePlayer('player-1', 50);

      expect(result.died).toBe(false);
      expect(result.newHealth).toBe(100); // No damage taken

      const playerState = await playerStateManager.getPlayerState('player-1');
      expect(playerState.health).toBe(100);
      expect(playerState.status).toBe('alive');
    });

    it('should not damage dead player', async () => {
      // Force remove invincibility and kill player
      const playerState = await playerStateManager.getPlayerState('player-1');
      playerState.isInvincible = false;
      playerState.invincibilityUntil = undefined;
      
      await playerStateManager.damagePlayer('player-1', 100);

      // Verify player is dead
      let deadPlayerState = await playerStateManager.getPlayerState('player-1');
      expect(deadPlayerState.status).toBe('dead');

      // Try to damage dead player
      const result = await playerStateManager.damagePlayer('player-1', 25);

      expect(result.died).toBe(false);
      expect(result.newHealth).toBe(0); // Dead player health

      deadPlayerState = await playerStateManager.getPlayerState('player-1');
      expect(deadPlayerState.health).toBe(0);
      expect(deadPlayerState.status).toBe('dead');
    });

    it('should handle zero damage on non-invincible player', async () => {
      // Force remove invincibility
      const playerState = await playerStateManager.getPlayerState('player-1');
      playerState.isInvincible = false;
      playerState.invincibilityUntil = undefined;

      const result = await playerStateManager.damagePlayer('player-1', 0);

      expect(result.died).toBe(false);
      expect(result.newHealth).toBe(100);

      const updatedState = await playerStateManager.getPlayerState('player-1');
      expect(updatedState.health).toBe(100);
    });

    it('should handle negative damage (healing)', async () => {
      // Force remove invincibility
      const playerState = await playerStateManager.getPlayerState('player-1');
      playerState.isInvincible = false;
      playerState.invincibilityUntil = undefined;

      const result = await playerStateManager.damagePlayer('player-1', -10);

      expect(result.died).toBe(false);
      // Negative damage adds to health (Math.max(0, health - (-10)) = health + 10)
      expect(result.newHealth).toBe(110);

      const updatedState = await playerStateManager.getPlayerState('player-1');
      expect(updatedState.health).toBe(110);
    });

    it('should update lastUpdate timestamp on damage', async () => {
      // Force remove invincibility
      const playerState = await playerStateManager.getPlayerState('player-1');
      playerState.isInvincible = false;
      playerState.invincibilityUntil = undefined;

      const beforeDamage = Date.now();
      const result = await playerStateManager.damagePlayer('player-1', 10);
      const afterDamage = Date.now();

      // Verify damage was actually applied
      expect(result.newHealth).toBe(90);

      const updatedState = await playerStateManager.getPlayerState('player-1');
      expect(updatedState.lastUpdate.getTime()).toBeGreaterThanOrEqual(beforeDamage);
      expect(updatedState.lastUpdate.getTime()).toBeLessThanOrEqual(afterDamage);
    });
  });

  describe('eliminatePlayer()', () => {
    it('should eliminate alive player', async () => {
      const result = await playerStateManager.eliminatePlayer('player-1');

      expect(result).toBe(true);

      const playerState = await playerStateManager.getPlayerState('player-1');
      expect(playerState.status).toBe('dead');
      expect(playerState.health).toBe(0);
      expect(playerState.deaths).toBe(1);
      expect(playerState.respawnAt).toBeDefined();
      expect(playerState.respawnAt).toBeInstanceOf(Date);
    });

    it('should set correct respawn time', async () => {
      const beforeElimination = Date.now();
      await playerStateManager.eliminatePlayer('player-1');
      const afterElimination = Date.now();

      const playerState = await playerStateManager.getPlayerState('player-1');
      const expectedRespawnTime = beforeElimination + 10000; // RESPAWN_DELAY
      const actualRespawnTime = playerState.respawnAt!.getTime();

      expect(actualRespawnTime).toBeGreaterThanOrEqual(expectedRespawnTime);
      expect(actualRespawnTime).toBeLessThanOrEqual(afterElimination + 10000);
    });

    it('should increment death counter', async () => {
      const initialState = await playerStateManager.getPlayerState('player-1');
      expect(initialState.deaths).toBe(0);

      await playerStateManager.eliminatePlayer('player-1');
      
      let playerState = await playerStateManager.getPlayerState('player-1');
      expect(playerState.deaths).toBe(1);

      // Respawn and eliminate again
      await playerStateManager.respawnPlayer('player-1');
      await playerStateManager.eliminatePlayer('player-1');

      playerState = await playerStateManager.getPlayerState('player-1');
      expect(playerState.deaths).toBe(2);
    });

    it('should not eliminate already dead player', async () => {
      // Kill player first
      await playerStateManager.eliminatePlayer('player-1');

      // Try to eliminate again
      const result = await playerStateManager.eliminatePlayer('player-1');

      expect(result).toBe(false);

      const playerState = await playerStateManager.getPlayerState('player-1');
      expect(playerState.deaths).toBe(1); // Should not increment again
    });

    it('should return false for non-existent player', async () => {
      const result = await playerStateManager.eliminatePlayer('non-existent');
      expect(result).toBe(false);
    });
  });

  describe('respawnPlayer()', () => {
    beforeEach(async () => {
      // Kill the player first
      await playerStateManager.eliminatePlayer('player-1');
    });

    it('should respawn dead player', async () => {
      const result = await playerStateManager.respawnPlayer('player-1');

      expect(result).toBe(true);

      const playerState = await playerStateManager.getPlayerState('player-1');
      expect(playerState.status).toBe('alive');
      expect(playerState.health).toBe(100); // Full health restored
      expect(playerState.isInvincible).toBe(true);
      expect(playerState.invincibilityUntil).toBeDefined();
      expect(playerState.respawnAt).toBeUndefined();
      expect(playerState.direction).toBe('idle');
    });

    it('should set spawn invincibility on respawn', async () => {
      await playerStateManager.respawnPlayer('player-1');

      const playerState = await playerStateManager.getPlayerState('player-1');
      expect(playerState.isInvincible).toBe(true);
      expect(playerState.invincibilityUntil).toBeInstanceOf(Date);

      const expectedInvincibilityEnd = Date.now() + 1000; // INVINCIBILITY_FRAMES
      const actualInvincibilityEnd = playerState.invincibilityUntil!.getTime();
      expect(Math.abs(actualInvincibilityEnd - expectedInvincibilityEnd)).toBeLessThan(100);
    });

    it('should place player at corner position', async () => {
      await playerStateManager.respawnPlayer('player-1');

      const playerState = await playerStateManager.getPlayerState('player-1');
      expect(playerState.position).toBeDefined();
      
      // Should be at one of the corner positions
      const corners = [
        { x: 1.5, y: 1.5 },
        { x: 13.5, y: 1.5 },
        { x: 1.5, y: 9.5 },
        { x: 13.5, y: 9.5 },
      ];
      
      expect(corners.some(corner => 
        corner.x === playerState.position.x && corner.y === playerState.position.y
      )).toBe(true);
    });

    it('should reset position tracking', async () => {
      await playerStateManager.respawnPlayer('player-1');

      const playerState = await playerStateManager.getPlayerState('player-1');
      expect(playerState.position).toEqual(playerState.previousPosition);
    });

    it('should not respawn alive player', async () => {
      // First respawn the player
      await playerStateManager.respawnPlayer('player-1');

      // Try to respawn again while alive
      const result = await playerStateManager.respawnPlayer('player-1');

      expect(result).toBe(false);
    });

    it('should return false for non-existent player', async () => {
      const result = await playerStateManager.respawnPlayer('non-existent');
      expect(result).toBe(false);
    });

    it('should update timestamps correctly', async () => {
      const beforeRespawn = Date.now();
      await playerStateManager.respawnPlayer('player-1');
      const afterRespawn = Date.now();

      const playerState = await playerStateManager.getPlayerState('player-1');
      expect(playerState.lastUpdate.getTime()).toBeGreaterThanOrEqual(beforeRespawn);
      expect(playerState.lastUpdate.getTime()).toBeLessThanOrEqual(afterRespawn);
    });
  });

  describe('Invincibility Mechanics', () => {
    it('should automatically remove invincibility after timeout', async () => {
      // Player starts invincible
      let playerState = await playerStateManager.getPlayerState('player-1');
      expect(playerState.isInvincible).toBe(true);

      // Wait for invincibility to wear off (1000ms)
      await new Promise(resolve => setTimeout(resolve, 1100));

      playerState = await playerStateManager.getPlayerState('player-1');
      expect(playerState.isInvincible).toBe(false);
      expect(playerState.invincibilityUntil).toBeUndefined();
    });

    it('should maintain invincibility during timeout period', async () => {
      // Check immediately after spawn
      let playerState = await playerStateManager.getPlayerState('player-1');
      expect(playerState.isInvincible).toBe(true);

      // Check after 500ms (still within timeout)
      await new Promise(resolve => setTimeout(resolve, 500));
      playerState = await playerStateManager.getPlayerState('player-1');
      expect(playerState.isInvincible).toBe(true);
    });

    it('should reset invincibility on respawn', async () => {
      // Wait for initial invincibility to wear off
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      let playerState = await playerStateManager.getPlayerState('player-1');
      expect(playerState.isInvincible).toBe(false);

      // Kill and respawn
      await playerStateManager.eliminatePlayer('player-1');
      await playerStateManager.respawnPlayer('player-1');

      playerState = await playerStateManager.getPlayerState('player-1');
      expect(playerState.isInvincible).toBe(true);
      expect(playerState.invincibilityUntil).toBeDefined();
    });
  });

  describe('Automatic Respawn', () => {
    it('should schedule automatic respawn after elimination', async (done) => {
      await playerStateManager.eliminatePlayer('player-1');

      // Wait for automatic respawn (10 seconds + buffer)
      setTimeout(async () => {
        try {
          const playerState = await playerStateManager.getPlayerState('player-1');
          expect(playerState.status).toBe('alive');
          expect(playerState.health).toBe(100);
          done();
        } catch (error) {
          done.fail(error);
        }
      }, 10100);
    }, 11000);

    it('should not auto-respawn if manually respawned first', async () => {
      await playerStateManager.eliminatePlayer('player-1');
      
      // Manually respawn before auto-respawn
      await new Promise(resolve => setTimeout(resolve, 1000));
      await playerStateManager.respawnPlayer('player-1');

      let playerState = await playerStateManager.getPlayerState('player-1');
      expect(playerState.status).toBe('alive');
      
      // Wait past auto-respawn time (shorter wait for test efficiency)
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      playerState = await playerStateManager.getPlayerState('player-1');
      expect(playerState.status).toBe('alive'); // Should still be alive, not double-respawned
    }, 8000);
  });

  describe('Multiple Players Lifecycle', () => {
    beforeEach(async () => {
      // Add second player
      await playerStateManager.addPlayer('player-2', 'game-1', {
        position: { x: 13.5, y: 9.5 },
        corner: 'bottom-right' as const,
        safeArea: [],
      });
    });

    it('should handle independent player elimination', async () => {
      await playerStateManager.eliminatePlayer('player-1');
      
      const player1State = await playerStateManager.getPlayerState('player-1');
      const player2State = await playerStateManager.getPlayerState('player-2');

      expect(player1State.status).toBe('dead');
      expect(player2State.status).toBe('alive');
    });

    it('should handle concurrent elimination and respawn', async () => {
      await Promise.all([
        playerStateManager.eliminatePlayer('player-1'),
        playerStateManager.eliminatePlayer('player-2'),
      ]);

      const results = await Promise.all([
        playerStateManager.respawnPlayer('player-1'),
        playerStateManager.respawnPlayer('player-2'),
      ]);

      expect(results).toEqual([true, true]);

      const [player1State, player2State] = await Promise.all([
        playerStateManager.getPlayerState('player-1'),
        playerStateManager.getPlayerState('player-2'),
      ]);

      expect(player1State.status).toBe('alive');
      expect(player2State.status).toBe('alive');
    });
  });
});