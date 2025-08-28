/**
 * BossAI Unit Tests - Initialization
 * Tests basic BossAI initialization and configuration
 */

import { createBossAI } from '../../src/modules/BossAI';
import { EventBusImpl } from '../../src/modules/EventBusImpl';
import type { EventBus, EventBusConfig } from '../../src/interfaces/core/EventBus';
import { EventCategory, EventPriority, DeliveryMode } from '../../src/types/events.d.ts';

describe('BossAI - Initialization', () => {
  let eventBus: EventBus;
  let mockConfig: EventBusConfig;

  beforeEach(async () => {
    eventBus = new EventBusImpl();
    mockConfig = {
      redisUrl: 'redis://localhost:6379',
      postgresUrl: 'postgresql://localhost:5432/bomberman',
      eventCategories: [
        EventCategory.GAME_STATE,
        EventCategory.PLAYER_ACTION,
        EventCategory.SYSTEM_STATUS
      ],
      rateLimiting: {
        enabled: true,
        maxEventsPerSecond: 100,
        burstLimit: 500,
      },
      middleware: {
        enabled: true,
        logEvents: true,
        validateEvents: true,
      },
      persistence: {
        enabled: true,
        retentionDays: 30,
      },
    };
    await eventBus.initialize(mockConfig);
  });

  afterEach(async () => {
    await eventBus.shutdown();
  });

  describe('Constructor', () => {
    it('should create BossAI instance', () => {
      const bossAI = createBossAI(eventBus);
      
      expect(bossAI).toBeDefined();
      expect(bossAI.eventBus).toBe(eventBus);
    });

    it('should have eventBus property accessible', () => {
      const bossAI = createBossAI(eventBus);
      
      expect(bossAI).toHaveProperty('eventBus');
      expect(bossAI.eventBus).toBeInstanceOf(EventBusImpl);
    });
  });

  describe('Interface Compliance', () => {
    it('should implement all required methods', () => {
      const bossAI = createBossAI(eventBus);
      
      // Core methods
      expect(typeof bossAI.initialize).toBe('function');
      expect(typeof bossAI.spawnBoss).toBe('function');
    });

    it('should have async methods that return Promises', async () => {
      const bossAI = createBossAI(eventBus);
      
      const initializeResult = bossAI.initialize();
      expect(initializeResult).toBeInstanceOf(Promise);
      await initializeResult;

      const spawnResult = bossAI.spawnBoss('game-1', { x: 5, y: 5 });
      expect(spawnResult).toBeInstanceOf(Promise);
      await spawnResult;
    });
  });

  describe('initialize()', () => {
    it('should initialize successfully', async () => {
      const bossAI = createBossAI(eventBus);
      
      await expect(bossAI.initialize()).resolves.toBeUndefined();
    });

    it('should handle multiple initializations gracefully', async () => {
      const bossAI = createBossAI(eventBus);
      
      await bossAI.initialize();
      await expect(bossAI.initialize()).resolves.toBeUndefined();
    });
  });

  describe('spawnBoss()', () => {
    it('should spawn boss successfully', async () => {
      const bossAI = createBossAI(eventBus);
      await bossAI.initialize();
      
      const gameId = 'test-game';
      const position = { x: 7, y: 7 };
      
      const bossId = await bossAI.spawnBoss(gameId, position);
      
      expect(bossId).toBeDefined();
      expect(typeof bossId).toBe('string');
      expect(bossId.length).toBeGreaterThan(0);
    });

    it('should handle various spawn positions', async () => {
      const bossAI = createBossAI(eventBus);
      await bossAI.initialize();
      
      const gameId = 'test-game-positions';
      const positions = [
        { x: 0, y: 0 },
        { x: 10, y: 10 },
        { x: 15, y: 11 },
        { x: 7.5, y: 5.5 }
      ];
      
      for (const position of positions) {
        const bossId = await bossAI.spawnBoss(gameId, position);
        expect(bossId).toBeDefined();
        expect(typeof bossId).toBe('string');
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle operations with uninitialized BossAI', async () => {
      const bossAI = createBossAI(eventBus);
      
      // Should still work without initialization for now (stub implementation)
      await expect(bossAI.spawnBoss('game-1', { x: 5, y: 5 })).resolves.toBeDefined();
    });

    it('should handle invalid positions gracefully', async () => {
      const bossAI = createBossAI(eventBus);
      await bossAI.initialize();
      
      const gameId = 'test-game-invalid';
      
      // Test edge cases
      await expect(bossAI.spawnBoss(gameId, { x: -1, y: -1 })).resolves.toBeDefined();
      await expect(bossAI.spawnBoss(gameId, { x: 1000, y: 1000 })).resolves.toBeDefined();
      await expect(bossAI.spawnBoss(gameId, { x: null as any, y: null as any })).resolves.toBeDefined();
      await expect(bossAI.spawnBoss(gameId, { x: undefined as any, y: undefined as any })).resolves.toBeDefined();
    });

    it('should handle null/undefined game IDs gracefully', async () => {
      const bossAI = createBossAI(eventBus);
      await bossAI.initialize();
      
      const position = { x: 5, y: 5 };
      
      await expect(bossAI.spawnBoss(null as any, position)).resolves.toBeDefined();
      await expect(bossAI.spawnBoss(undefined as any, position)).resolves.toBeDefined();
      await expect(bossAI.spawnBoss('' as any, position)).resolves.toBeDefined();
      await expect(bossAI.spawnBoss('   ' as any, position)).resolves.toBeDefined();
    });
  });
});