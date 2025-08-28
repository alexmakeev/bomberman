/**
 * PowerUpManager Unit Tests - Power-Up Effects
 * Tests power-up effect application, player upgrades, and effect stacking
 * 
 * References:
 * - src/modules/PowerUpManager/index.ts:93-135 - applyPowerUpEffect method
 * - src/modules/PowerUpManager/index.ts:137-148 - getPlayerPowerUps method
 * - Power-up types: bomb_upgrade, blast_radius, speed_boost, bomb_kick, bomb_throw, invincibility, remote_detonator
 * - Effect limits: maxBombs<=10, blastRadius<=10, speedMultiplier<=2.0
 * - Invincibility duration: 10 seconds
 */

import { createEventBusImpl } from '../../src/modules/EventBusImpl';
import { createPowerUpManager } from '../../src/modules/PowerUpManager';
import type { EventBus } from '../../src/interfaces/core/EventBus';

describe('PowerUpManager - Power-Up Effects', () => {
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

  describe('applyPowerUpEffect()', () => {
    it('should create initial player state when applying first effect', async () => {
      const playerId = 'player-1';
      
      // Player should not exist initially
      let playerPowerUps = await powerUpManager.getPlayerPowerUps(playerId);
      expect(playerPowerUps).toBeNull();
      
      await powerUpManager.applyPowerUpEffect(playerId, 'bomb_upgrade');
      
      // Player state should be created with defaults + upgrade
      playerPowerUps = await powerUpManager.getPlayerPowerUps(playerId);
      expect(playerPowerUps).not.toBeNull();
      expect(playerPowerUps!.playerId).toBe(playerId);
      expect(playerPowerUps!.maxBombs).toBe(2); // 1 + 1
      expect(playerPowerUps!.blastRadius).toBe(1);
      expect(playerPowerUps!.speedMultiplier).toBe(1.0);
      expect(playerPowerUps!.canKickBombs).toBe(false);
      expect(playerPowerUps!.canThrowBombs).toBe(false);
      expect(playerPowerUps!.isInvincible).toBe(false);
      expect(playerPowerUps!.hasRemoteDetonator).toBe(false);
    });

    it('should apply bomb upgrade effect correctly', async () => {
      const playerId = 'player-bomb';
      
      await powerUpManager.applyPowerUpEffect(playerId, 'bomb_upgrade');
      let playerPowerUps = await powerUpManager.getPlayerPowerUps(playerId);
      expect(playerPowerUps!.maxBombs).toBe(2);
      
      // Apply multiple bomb upgrades
      await powerUpManager.applyPowerUpEffect(playerId, 'bomb_upgrade');
      await powerUpManager.applyPowerUpEffect(playerId, 'bomb_upgrade');
      
      playerPowerUps = await powerUpManager.getPlayerPowerUps(playerId);
      expect(playerPowerUps!.maxBombs).toBe(4);
    });

    it('should apply blast radius effect correctly', async () => {
      const playerId = 'player-blast';
      
      await powerUpManager.applyPowerUpEffect(playerId, 'blast_radius');
      let playerPowerUps = await powerUpManager.getPlayerPowerUps(playerId);
      expect(playerPowerUps!.blastRadius).toBe(2);
      
      // Apply multiple blast radius upgrades
      await powerUpManager.applyPowerUpEffect(playerId, 'blast_radius');
      await powerUpManager.applyPowerUpEffect(playerId, 'blast_radius');
      
      playerPowerUps = await powerUpManager.getPlayerPowerUps(playerId);
      expect(playerPowerUps!.blastRadius).toBe(4);
    });

    it('should apply speed boost effect correctly', async () => {
      const playerId = 'player-speed';
      
      await powerUpManager.applyPowerUpEffect(playerId, 'speed_boost');
      let playerPowerUps = await powerUpManager.getPlayerPowerUps(playerId);
      expect(playerPowerUps!.speedMultiplier).toBe(1.2);
      
      // Apply multiple speed boosts
      await powerUpManager.applyPowerUpEffect(playerId, 'speed_boost');
      await powerUpManager.applyPowerUpEffect(playerId, 'speed_boost');
      
      playerPowerUps = await powerUpManager.getPlayerPowerUps(playerId);
      expect(playerPowerUps!.speedMultiplier).toBe(1.6);
    });

    it('should apply bomb kick effect correctly', async () => {
      const playerId = 'player-kick';
      
      let playerPowerUps = await powerUpManager.getPlayerPowerUps(playerId);
      expect(playerPowerUps).toBeNull();
      
      await powerUpManager.applyPowerUpEffect(playerId, 'bomb_kick');
      
      playerPowerUps = await powerUpManager.getPlayerPowerUps(playerId);
      expect(playerPowerUps!.canKickBombs).toBe(true);
      
      // Applying again should still be true
      await powerUpManager.applyPowerUpEffect(playerId, 'bomb_kick');
      playerPowerUps = await powerUpManager.getPlayerPowerUps(playerId);
      expect(playerPowerUps!.canKickBombs).toBe(true);
    });

    it('should apply bomb throw effect correctly', async () => {
      const playerId = 'player-throw';
      
      await powerUpManager.applyPowerUpEffect(playerId, 'bomb_throw');
      
      const playerPowerUps = await powerUpManager.getPlayerPowerUps(playerId);
      expect(playerPowerUps!.canThrowBombs).toBe(true);
    });

    it('should apply invincibility effect with correct duration', async () => {
      const playerId = 'player-invincible';
      
      const beforeEffect = Date.now();
      await powerUpManager.applyPowerUpEffect(playerId, 'invincibility');
      const afterEffect = Date.now();
      
      const playerPowerUps = await powerUpManager.getPlayerPowerUps(playerId);
      expect(playerPowerUps!.isInvincible).toBe(true);
      expect(playerPowerUps!.invincibilityUntil).toBeDefined();
      
      // Should have invincibility for 10 seconds
      const expectedEnd = beforeEffect + 10000;
      const actualEnd = playerPowerUps!.invincibilityUntil!.getTime();
      expect(actualEnd).toBeGreaterThanOrEqual(expectedEnd);
      expect(actualEnd).toBeLessThanOrEqual(afterEffect + 10000);
    });

    it('should apply remote detonator effect correctly', async () => {
      const playerId = 'player-remote';
      
      await powerUpManager.applyPowerUpEffect(playerId, 'remote_detonator');
      
      const playerPowerUps = await powerUpManager.getPlayerPowerUps(playerId);
      expect(playerPowerUps!.hasRemoteDetonator).toBe(true);
    });

    it('should handle multiple different effects on same player', async () => {
      const playerId = 'player-multi';
      
      // Apply various effects
      await powerUpManager.applyPowerUpEffect(playerId, 'bomb_upgrade');
      await powerUpManager.applyPowerUpEffect(playerId, 'blast_radius');
      await powerUpManager.applyPowerUpEffect(playerId, 'speed_boost');
      await powerUpManager.applyPowerUpEffect(playerId, 'bomb_kick');
      await powerUpManager.applyPowerUpEffect(playerId, 'remote_detonator');
      
      const playerPowerUps = await powerUpManager.getPlayerPowerUps(playerId);
      expect(playerPowerUps!.maxBombs).toBe(2);
      expect(playerPowerUps!.blastRadius).toBe(2);
      expect(playerPowerUps!.speedMultiplier).toBe(1.2);
      expect(playerPowerUps!.canKickBombs).toBe(true);
      expect(playerPowerUps!.canThrowBombs).toBe(false);
      expect(playerPowerUps!.hasRemoteDetonator).toBe(true);
    });

    it('should handle invalid power-up types gracefully', async () => {
      const playerId = 'player-invalid';
      
      const invalidTypes = ['invalid_type', '', null, undefined];
      
      for (const invalidType of invalidTypes) {
        await expect(powerUpManager.applyPowerUpEffect(playerId, invalidType as any))
          .resolves.not.toThrow();
      }
      
      // Player state should exist but with default values
      const playerPowerUps = await powerUpManager.getPlayerPowerUps(playerId);
      expect(playerPowerUps).not.toBeNull();
      expect(playerPowerUps!.maxBombs).toBe(1);
      expect(playerPowerUps!.blastRadius).toBe(1);
    });
  });

  describe('Effect Limits', () => {
    it('should cap max bombs at 10', async () => {
      const playerId = 'player-bomb-limit';
      
      // Apply 15 bomb upgrades (should cap at 10)
      for (let i = 0; i < 15; i++) {
        await powerUpManager.applyPowerUpEffect(playerId, 'bomb_upgrade');
      }
      
      const playerPowerUps = await powerUpManager.getPlayerPowerUps(playerId);
      expect(playerPowerUps!.maxBombs).toBe(10);
    });

    it('should cap blast radius at 10', async () => {
      const playerId = 'player-blast-limit';
      
      // Apply 15 blast radius upgrades (should cap at 10)
      for (let i = 0; i < 15; i++) {
        await powerUpManager.applyPowerUpEffect(playerId, 'blast_radius');
      }
      
      const playerPowerUps = await powerUpManager.getPlayerPowerUps(playerId);
      expect(playerPowerUps!.blastRadius).toBe(10);
    });

    it('should cap speed multiplier at 2.0', async () => {
      const playerId = 'player-speed-limit';
      
      // Apply 10 speed boosts (should cap at 2.0)
      for (let i = 0; i < 10; i++) {
        await powerUpManager.applyPowerUpEffect(playerId, 'speed_boost');
      }
      
      const playerPowerUps = await powerUpManager.getPlayerPowerUps(playerId);
      expect(playerPowerUps!.speedMultiplier).toBe(2.0);
    });
  });

  describe('getPlayerPowerUps()', () => {
    it('should return null for player with no power-ups', async () => {
      const playerPowerUps = await powerUpManager.getPlayerPowerUps('non-existent-player');
      expect(playerPowerUps).toBeNull();
    });

    it('should return current power-up state for player', async () => {
      const playerId = 'player-state';
      
      await powerUpManager.applyPowerUpEffect(playerId, 'bomb_upgrade');
      await powerUpManager.applyPowerUpEffect(playerId, 'speed_boost');
      
      const playerPowerUps = await powerUpManager.getPlayerPowerUps(playerId);
      expect(playerPowerUps).not.toBeNull();
      expect(playerPowerUps!.playerId).toBe(playerId);
      expect(playerPowerUps!.maxBombs).toBe(2);
      expect(playerPowerUps!.speedMultiplier).toBe(1.2);
    });

    it('should update invincibility status based on time', async () => {
      const playerId = 'player-invincibility-check';
      
      // Apply invincibility
      await powerUpManager.applyPowerUpEffect(playerId, 'invincibility');
      
      let playerPowerUps = await powerUpManager.getPlayerPowerUps(playerId);
      expect(playerPowerUps!.isInvincible).toBe(true);
      expect(playerPowerUps!.invincibilityUntil).toBeDefined();
      
      // Manually expire invincibility
      const expiredTime = new Date(Date.now() - 1000);
      playerPowerUps!.invincibilityUntil = expiredTime;
      
      // Get state again - should clear expired invincibility
      playerPowerUps = await powerUpManager.getPlayerPowerUps(playerId);
      expect(playerPowerUps!.isInvincible).toBe(false);
      expect(playerPowerUps!.invincibilityUntil).toBeUndefined();
    });

    it('should handle invalid player IDs gracefully', async () => {
      const invalidIds = [null, undefined, '', '   '];
      
      for (const invalidId of invalidIds) {
        const result = await powerUpManager.getPlayerPowerUps(invalidId as any);
        expect(result).toBeNull();
      }
    });

    it('should return consistent state across multiple calls', async () => {
      const playerId = 'player-consistent';
      
      await powerUpManager.applyPowerUpEffect(playerId, 'bomb_upgrade');
      await powerUpManager.applyPowerUpEffect(playerId, 'blast_radius');
      
      const state1 = await powerUpManager.getPlayerPowerUps(playerId);
      const state2 = await powerUpManager.getPlayerPowerUps(playerId);
      
      expect(state1).toEqual(state2);
    });
  });

  describe('Player Isolation', () => {
    it('should maintain separate power-up states per player', async () => {
      const player1 = 'player-isolation-1';
      const player2 = 'player-isolation-2';
      
      // Apply different effects to each player
      await powerUpManager.applyPowerUpEffect(player1, 'bomb_upgrade');
      await powerUpManager.applyPowerUpEffect(player1, 'bomb_upgrade');
      await powerUpManager.applyPowerUpEffect(player1, 'speed_boost');
      
      await powerUpManager.applyPowerUpEffect(player2, 'blast_radius');
      await powerUpManager.applyPowerUpEffect(player2, 'bomb_kick');
      
      const player1PowerUps = await powerUpManager.getPlayerPowerUps(player1);
      const player2PowerUps = await powerUpManager.getPlayerPowerUps(player2);
      
      // Player 1 should have bomb upgrades and speed
      expect(player1PowerUps!.maxBombs).toBe(3);
      expect(player1PowerUps!.blastRadius).toBe(1);
      expect(player1PowerUps!.speedMultiplier).toBe(1.2);
      expect(player1PowerUps!.canKickBombs).toBe(false);
      
      // Player 2 should have blast radius and kick
      expect(player2PowerUps!.maxBombs).toBe(1);
      expect(player2PowerUps!.blastRadius).toBe(2);
      expect(player2PowerUps!.speedMultiplier).toBe(1.0);
      expect(player2PowerUps!.canKickBombs).toBe(true);
    });

    it('should handle effects for many players simultaneously', async () => {
      const playerCount = 50;
      const players = [];
      
      // Create many players with different effects
      for (let i = 0; i < playerCount; i++) {
        const playerId = `player-${i}`;
        players.push(playerId);
        
        // Apply different effects based on player index
        if (i % 5 === 0) await powerUpManager.applyPowerUpEffect(playerId, 'bomb_upgrade');
        if (i % 5 === 1) await powerUpManager.applyPowerUpEffect(playerId, 'blast_radius');
        if (i % 5 === 2) await powerUpManager.applyPowerUpEffect(playerId, 'speed_boost');
        if (i % 5 === 3) await powerUpManager.applyPowerUpEffect(playerId, 'bomb_kick');
        if (i % 5 === 4) await powerUpManager.applyPowerUpEffect(playerId, 'invincibility');
      }
      
      // Verify each player has correct effects
      for (let i = 0; i < playerCount; i++) {
        const playerId = `player-${i}`;
        const powerUps = await powerUpManager.getPlayerPowerUps(playerId);
        
        expect(powerUps).not.toBeNull();
        expect(powerUps!.playerId).toBe(playerId);
        
        // Check specific effects
        if (i % 5 === 0) expect(powerUps!.maxBombs).toBe(2);
        if (i % 5 === 1) expect(powerUps!.blastRadius).toBe(2);
        if (i % 5 === 2) expect(powerUps!.speedMultiplier).toBe(1.2);
        if (i % 5 === 3) expect(powerUps!.canKickBombs).toBe(true);
        if (i % 5 === 4) expect(powerUps!.isInvincible).toBe(true);
      }
    });
  });
});