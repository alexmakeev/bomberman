/**
 * @fileoverview Unit tests for BossAI behavior and combat mechanics
 * Testing boss phases, attacks, and AI decision making
 * See docs/schema/monster.md for boss specifications
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createBossAI } from '../../src/modules/BossAI';
import { createEventBusImpl } from '../../src/modules/EventBusImpl';
import type { EventBus } from '../../src/interfaces/core/EventBus';

describe('BossAI - Boss Behavior', () => {
  let eventBus: EventBus;
  let bossAI: any;

  beforeEach(async () => {
    eventBus = createEventBusImpl();
    await eventBus.initialize({
      defaultTTL: 300000,
      maxEventSize: 1024,
      enablePersistence: false,
      enableTracing: true,
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
        samplingRate: 0,
        alertThresholds: {
          maxLatencyMs: 1000,
          maxErrorRate: 10,
          maxQueueDepth: 1000,
          maxMemoryBytes: 512 * 1024 * 1024,
        },
      },
    });

    bossAI = createBossAI(eventBus);
    await bossAI.initialize();
  });

  afterEach(async () => {
    await bossAI.shutdown();
    await eventBus.shutdown();
  });

  describe('Boss Spawning', () => {
    it('should spawn boss with correct initial properties', async () => {
      const gameId = 'game-123';
      const spawnPosition = { x: 7, y: 5 };
      
      const bossId = await bossAI.spawnBoss(gameId, spawnPosition, 'FLAME_MASTER');
      
      expect(bossId).toBeDefined();
      expect(bossId).toMatch(/^boss_/);

      const boss = await bossAI.getBoss(bossId);
      expect(boss.type).toBe('FLAME_MASTER');
      expect(boss.position).toEqual(spawnPosition);
      expect(boss.health).toBe(boss.maxHealth);
      expect(boss.currentPhase).toBe(1);
      expect(boss.state).toBe('SPAWNING');
    });

    it('should initialize boss with appropriate stats for type', async () => {
      const gameId = 'game-123';
      const position = { x: 7, y: 5 };
      
      const flameBossId = await bossAI.spawnBoss(gameId, position, 'FLAME_MASTER');
      const flameBoss = await bossAI.getBoss(flameBossId);
      
      expect(flameBoss.maxHealth).toBe(500);
      expect(flameBoss.damage).toBe(50);
      expect(flameBoss.moveSpeed).toBe(1.5);
      expect(flameBoss.attackRange).toBe(3);

      const iceBossId = await bossAI.spawnBoss(gameId, position, 'ICE_QUEEN');
      const iceBoss = await bossAI.getBoss(iceBossId);
      
      expect(iceBoss.maxHealth).toBe(400);
      expect(iceBoss.damage).toBe(40);
      expect(iceBoss.moveSpeed).toBe(2.0);
      expect(iceBoss.attackRange).toBe(4);
    });

    it('should trigger boss spawn event', async () => {
      const publishSpy = vi.spyOn(eventBus, 'publish');
      
      const gameId = 'game-123';
      const position = { x: 7, y: 5 };
      
      await bossAI.spawnBoss(gameId, position, 'FLAME_MASTER');
      
      expect(publishSpy).toHaveBeenCalledWith({
        eventId: expect.any(String),
        category: 'GAME_STATE',
        type: 'boss_spawned',
        sourceId: 'boss_ai',
        targets: [{ type: 'game', id: gameId }],
        data: {
          bossId: expect.any(String),
          type: 'FLAME_MASTER',
          position,
          phase: 1,
        },
        metadata: expect.any(Object),
        timestamp: expect.any(Number),
        version: '1.0.0',
      });
    });
  });

  describe('Boss Phases', () => {
    let bossId: string;
    
    beforeEach(async () => {
      bossId = await bossAI.spawnBoss('game-123', { x: 7, y: 5 }, 'FLAME_MASTER');
    });

    it('should start in phase 1 with normal behavior', async () => {
      const boss = await bossAI.getBoss(bossId);
      expect(boss.currentPhase).toBe(1);
      expect(boss.phaseData.attackPattern).toBe('NORMAL');
      expect(boss.phaseData.attackSpeed).toBe(1.0);
    });

    it('should transition to phase 2 at 66% health', async () => {
      const boss = await bossAI.getBoss(bossId);
      
      // Damage boss to 66% health
      await bossAI.takeDamage(bossId, boss.maxHealth * 0.34);
      
      const updatedBoss = await bossAI.getBoss(bossId);
      expect(updatedBoss.currentPhase).toBe(2);
      expect(updatedBoss.phaseData.attackPattern).toBe('AGGRESSIVE');
      expect(updatedBoss.phaseData.attackSpeed).toBe(1.5);
    });

    it('should transition to phase 3 at 33% health', async () => {
      const boss = await bossAI.getBoss(bossId);
      
      // Damage boss to 33% health
      await bossAI.takeDamage(bossId, boss.maxHealth * 0.67);
      
      const updatedBoss = await bossAI.getBoss(bossId);
      expect(updatedBoss.currentPhase).toBe(3);
      expect(updatedBoss.phaseData.attackPattern).toBe('ENRAGED');
      expect(updatedBoss.phaseData.attackSpeed).toBe(2.0);
      expect(updatedBoss.phaseData.hasSpecialAbilities).toBe(true);
    });

    it('should publish phase transition events', async () => {
      const publishSpy = vi.spyOn(eventBus, 'publish');
      const boss = await bossAI.getBoss(bossId);
      
      await bossAI.takeDamage(bossId, boss.maxHealth * 0.34);
      
      expect(publishSpy).toHaveBeenCalledWith({
        eventId: expect.any(String),
        category: 'GAME_STATE',
        type: 'boss_phase_changed',
        sourceId: 'boss_ai',
        targets: [{ type: 'game', id: 'game-123' }],
        data: {
          bossId,
          oldPhase: 1,
          newPhase: 2,
          healthPercentage: expect.any(Number),
        },
        metadata: expect.any(Object),
        timestamp: expect.any(Number),
        version: '1.0.0',
      });
    });
  });

  describe('Boss AI Decision Making', () => {
    let bossId: string;
    
    beforeEach(async () => {
      bossId = await bossAI.spawnBoss('game-123', { x: 7, y: 5 }, 'FLAME_MASTER');
    });

    it('should select target player within range', async () => {
      const gameState = {
        players: new Map([
          ['player1', { position: { x: 6, y: 5 }, health: 100 }], // Distance 1
          ['player2', { position: { x: 10, y: 8 }, health: 100 }], // Distance 5
          ['player3', { position: { x: 4, y: 5 }, health: 50 }],   // Distance 3, lower health
        ]),
      };
      
      const targetId = await bossAI.selectTarget(bossId, gameState);
      
      // Should prefer closer target or lower health target
      expect(['player1', 'player3']).toContain(targetId);
    });

    it('should choose appropriate attack based on distance and phase', async () => {
      const gameState = {
        players: new Map([
          ['player1', { position: { x: 6, y: 5 }, health: 100 }], // Close
          ['player2', { position: { x: 10, y: 8 }, health: 100 }], // Far
        ]),
      };
      
      // Phase 1: Basic attacks
      let attack = await bossAI.selectAttack(bossId, gameState, 'player1');
      expect(['MELEE_ATTACK', 'FLAME_BREATH']).toContain(attack.type);
      
      // Transition to phase 3 for special attacks
      const boss = await bossAI.getBoss(bossId);
      await bossAI.takeDamage(bossId, boss.maxHealth * 0.67);
      
      attack = await bossAI.selectAttack(bossId, gameState, 'player1');
      expect(['MELEE_ATTACK', 'FLAME_BREATH', 'METEOR_STORM', 'FIRE_WALL']).toContain(attack.type);
    });

    it('should use area attacks when multiple players are close', async () => {
      const gameState = {
        players: new Map([
          ['player1', { position: { x: 6, y: 5 }, health: 100 }],
          ['player2', { position: { x: 6, y: 6 }, health: 100 }],
          ['player3', { position: { x: 7, y: 6 }, health: 100 }],
        ]),
      };
      
      // Transition to phase with area attacks
      const boss = await bossAI.getBoss(bossId);
      await bossAI.takeDamage(bossId, boss.maxHealth * 0.67);
      
      const attack = await bossAI.selectAttack(bossId, gameState, 'player1');
      
      // Should prefer area attacks when multiple targets are clustered
      expect(['METEOR_STORM', 'FIRE_WALL']).toContain(attack.type);
    });
  });

  describe('Boss Attacks', () => {
    let bossId: string;
    
    beforeEach(async () => {
      bossId = await bossAI.spawnBoss('game-123', { x: 7, y: 5 }, 'FLAME_MASTER');
    });

    it('should execute melee attack with correct damage', async () => {
      const publishSpy = vi.spyOn(eventBus, 'publish');
      const targetPlayer = { id: 'player1', position: { x: 6, y: 5 }, health: 100 };
      
      const attackResult = await bossAI.executeAttack(bossId, {
        type: 'MELEE_ATTACK',
        damage: 50,
        range: 1,
        targets: [targetPlayer.id],
        position: targetPlayer.position,
      });
      
      expect(attackResult.success).toBe(true);
      expect(attackResult.damage).toBe(50);
      expect(attackResult.hitTargets).toContain(targetPlayer.id);
      
      expect(publishSpy).toHaveBeenCalledWith({
        eventId: expect.any(String),
        category: 'GAME_STATE',
        type: 'boss_attack',
        sourceId: 'boss_ai',
        targets: [{ type: 'game', id: 'game-123' }],
        data: {
          bossId,
          attackType: 'MELEE_ATTACK',
          damage: 50,
          targetPosition: targetPlayer.position,
          hitTargets: [targetPlayer.id],
        },
        metadata: expect.any(Object),
        timestamp: expect.any(Number),
        version: '1.0.0',
      });
    });

    it('should execute area attacks affecting multiple targets', async () => {
      const publishSpy = vi.spyOn(eventBus, 'publish');
      
      const attackResult = await bossAI.executeAttack(bossId, {
        type: 'METEOR_STORM',
        damage: 75,
        range: 2,
        area: { center: { x: 6, y: 5 }, radius: 2 },
        targets: ['player1', 'player2'],
      });
      
      expect(attackResult.success).toBe(true);
      expect(attackResult.hitTargets.length).toBeGreaterThanOrEqual(1);
      
      expect(publishSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          category: 'GAME_STATE',
          type: 'boss_attack',
          data: expect.objectContaining({
            attackType: 'METEOR_STORM',
            damage: 75,
          }),
        })
      );
    });

    it('should handle attack cooldowns correctly', async () => {
      // Execute attack
      await bossAI.executeAttack(bossId, {
        type: 'METEOR_STORM',
        damage: 75,
        range: 2,
        cooldown: 5000, // 5 second cooldown
      });
      
      // Should not be able to use same attack immediately
      const canUse = await bossAI.canUseAttack(bossId, 'METEOR_STORM');
      expect(canUse).toBe(false);
      
      // Fast forward time
      vi.advanceTimersByTime(5100);
      
      const canUseAfterCooldown = await bossAI.canUseAttack(bossId, 'METEOR_STORM');
      expect(canUseAfterCooldown).toBe(true);
    });
  });

  describe('Boss Movement', () => {
    let bossId: string;
    
    beforeEach(async () => {
      bossId = await bossAI.spawnBoss('game-123', { x: 7, y: 5 }, 'FLAME_MASTER');
    });

    it('should move toward target player', async () => {
      const gameState = {
        maze: {
          width: 15,
          height: 11,
          walls: [],
          destructibleWalls: [],
        },
        players: new Map([
          ['player1', { position: { x: 10, y: 5 }, health: 100 }],
        ]),
      };
      
      const moveResult = await bossAI.updateMovement(bossId, gameState, 'player1', 1000); // 1 second
      
      expect(moveResult.moved).toBe(true);
      expect(moveResult.newPosition.x).toBeGreaterThan(7); // Should move right toward player
      expect(moveResult.newPosition.y).toBe(5); // Should maintain Y coordinate
    });

    it('should avoid walls and obstacles', async () => {
      const gameState = {
        maze: {
          width: 15,
          height: 11,
          walls: [{ x: 8, y: 5 }], // Wall blocking direct path
          destructibleWalls: [],
        },
        players: new Map([
          ['player1', { position: { x: 10, y: 5 }, health: 100 }],
        ]),
      };
      
      const moveResult = await bossAI.updateMovement(bossId, gameState, 'player1', 1000);
      
      expect(moveResult.moved).toBe(true);
      // Should find alternate path around wall
      expect(moveResult.newPosition).not.toEqual({ x: 8, y: 5 });
    });

    it('should respect boss movement speed', async () => {
      const boss = await bossAI.getBoss(bossId);
      const initialPosition = { ...boss.position };
      
      const gameState = {
        maze: { width: 15, height: 11, walls: [], destructibleWalls: [] },
        players: new Map([['player1', { position: { x: 10, y: 5 }, health: 100 }]]),
      };
      
      // Update movement for 500ms (half second)
      await bossAI.updateMovement(bossId, gameState, 'player1', 500);
      
      const updatedBoss = await bossAI.getBoss(bossId);
      const distance = Math.sqrt(
        Math.pow(updatedBoss.position.x - initialPosition.x, 2) +
        Math.pow(updatedBoss.position.y - initialPosition.y, 2)
      );
      
      // Movement should be approximately moveSpeed * deltaTime
      // Boss speed is 1.5, so in 0.5 seconds should move ~0.75 units
      expect(distance).toBeLessThanOrEqual(boss.moveSpeed * 0.5 + 0.1); // Small tolerance
    });
  });

  describe('Boss Death', () => {
    let bossId: string;
    
    beforeEach(async () => {
      bossId = await bossAI.spawnBoss('game-123', { x: 7, y: 5 }, 'FLAME_MASTER');
    });

    it('should handle boss death when health reaches zero', async () => {
      const publishSpy = vi.spyOn(eventBus, 'publish');
      const boss = await bossAI.getBoss(bossId);
      
      // Deal enough damage to kill boss
      const deathResult = await bossAI.takeDamage(bossId, boss.health);
      
      expect(deathResult.died).toBe(true);
      expect(deathResult.remainingHealth).toBe(0);
      
      const deadBoss = await bossAI.getBoss(bossId);
      expect(deadBoss.state).toBe('DEAD');
      
      expect(publishSpy).toHaveBeenCalledWith({
        eventId: expect.any(String),
        category: 'GAME_STATE',
        type: 'boss_defeated',
        sourceId: 'boss_ai',
        targets: [{ type: 'game', id: 'game-123' }],
        data: {
          bossId,
          type: 'FLAME_MASTER',
          finalPhase: boss.currentPhase,
          position: boss.position,
        },
        metadata: expect.any(Object),
        timestamp: expect.any(Number),
        version: '1.0.0',
      });
    });

    it('should spawn rewards on boss death', async () => {
      const boss = await bossAI.getBoss(bossId);
      
      const deathResult = await bossAI.takeDamage(bossId, boss.health);
      
      expect(deathResult.rewards).toBeDefined();
      expect(deathResult.rewards.powerUps).toContain('BOMB_UP');
      expect(deathResult.rewards.powerUps).toContain('FLAME_UP');
      expect(deathResult.rewards.score).toBeGreaterThan(1000);
    });
  });
});