/**
 * MonsterAI Unit Tests - Initialization
 * Tests basic MonsterAI initialization and configuration
 */

import { createMonsterAI } from '../../src/modules/MonsterAI';
import { EventBusImpl } from '../../src/modules/EventBusImpl';
import type { EventBus, EventBusConfig } from '../../src/interfaces/core/EventBus';
import { EventCategory, EventPriority, DeliveryMode } from '../../src/types/events.d.ts';

describe('MonsterAI - Initialization', () => {
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
    it('should create MonsterAI instance', () => {
      const monsterAI = createMonsterAI(eventBus);
      
      expect(monsterAI).toBeDefined();
      expect(monsterAI.eventBus).toBe(eventBus);
    });

    it('should have eventBus property accessible', () => {
      const monsterAI = createMonsterAI(eventBus);
      
      expect(monsterAI).toHaveProperty('eventBus');
      expect(monsterAI.eventBus).toBeInstanceOf(EventBusImpl);
    });
  });

  describe('Interface Compliance', () => {
    it('should implement all required methods', () => {
      const monsterAI = createMonsterAI(eventBus);
      
      // Core methods
      expect(typeof monsterAI.initialize).toBe('function');
      expect(typeof monsterAI.spawnMonsterWave).toBe('function');
      expect(typeof monsterAI.updateMonsterBehavior).toBe('function');
    });

    it('should have async methods that return Promises', async () => {
      const monsterAI = createMonsterAI(eventBus);
      
      const initializeResult = monsterAI.initialize();
      expect(initializeResult).toBeInstanceOf(Promise);
      await initializeResult;

      const spawnResult = monsterAI.spawnMonsterWave('game-1', { x: 5, y: 5 });
      expect(spawnResult).toBeInstanceOf(Promise);
      await spawnResult;

      const updateResult = monsterAI.updateMonsterBehavior('game-1');
      expect(updateResult).toBeInstanceOf(Promise);
      await updateResult;
    });
  });

  describe('initialize()', () => {
    it('should initialize successfully', async () => {
      const monsterAI = createMonsterAI(eventBus);
      
      await expect(monsterAI.initialize()).resolves.toBeUndefined();
    });

    it('should handle multiple initializations gracefully', async () => {
      const monsterAI = createMonsterAI(eventBus);
      
      await monsterAI.initialize();
      await expect(monsterAI.initialize()).resolves.toBeUndefined();
    });
  });

  describe('spawnMonsterWave()', () => {
    it('should spawn monster wave successfully', async () => {
      const monsterAI = createMonsterAI(eventBus);
      await monsterAI.initialize();
      
      const gameId = 'test-game';
      const gatePosition = { x: 7, y: 7 };
      
      await expect(monsterAI.spawnMonsterWave(gameId, gatePosition)).resolves.toBeUndefined();
    });

    it('should handle various spawn positions', async () => {
      const monsterAI = createMonsterAI(eventBus);
      await monsterAI.initialize();
      
      const gameId = 'test-game-positions';
      const positions = [
        { x: 0, y: 0 },
        { x: 10, y: 10 },
        { x: 15, y: 11 },
        { x: 7.5, y: 5.5 }
      ];
      
      for (const position of positions) {
        await expect(monsterAI.spawnMonsterWave(gameId, position)).resolves.toBeUndefined();
      }
    });

    it('should handle multiple waves for same game', async () => {
      const monsterAI = createMonsterAI(eventBus);
      await monsterAI.initialize();
      
      const gameId = 'test-game-multiple-waves';
      const positions = [
        { x: 2, y: 2 },
        { x: 8, y: 6 },
        { x: 13, y: 9 }
      ];
      
      for (const position of positions) {
        await expect(monsterAI.spawnMonsterWave(gameId, position)).resolves.toBeUndefined();
      }
    });
  });

  describe('updateMonsterBehavior()', () => {
    it('should update monster behavior successfully', async () => {
      const monsterAI = createMonsterAI(eventBus);
      await monsterAI.initialize();
      
      const gameId = 'test-game-behavior';
      
      await expect(monsterAI.updateMonsterBehavior(gameId)).resolves.toBeUndefined();
    });

    it('should handle behavior updates for multiple games', async () => {
      const monsterAI = createMonsterAI(eventBus);
      await monsterAI.initialize();
      
      const gameIds = ['game-1', 'game-2', 'game-3'];
      
      for (const gameId of gameIds) {
        await expect(monsterAI.updateMonsterBehavior(gameId)).resolves.toBeUndefined();
      }
    });

    it('should handle concurrent behavior updates', async () => {
      const monsterAI = createMonsterAI(eventBus);
      await monsterAI.initialize();
      
      const gameIds = Array.from({ length: 5 }, (_, i) => `concurrent-game-${i}`);
      const updatePromises = gameIds.map(gameId => monsterAI.updateMonsterBehavior(gameId));
      
      await expect(Promise.all(updatePromises)).resolves.toEqual([
        undefined, undefined, undefined, undefined, undefined
      ]);
    });
  });

  describe('Error Handling', () => {
    it('should handle operations with uninitialized MonsterAI', async () => {
      const monsterAI = createMonsterAI(eventBus);
      
      // Should still work without initialization for now (stub implementation)
      await expect(monsterAI.spawnMonsterWave('game-1', { x: 5, y: 5 })).resolves.toBeUndefined();
      await expect(monsterAI.updateMonsterBehavior('game-1')).resolves.toBeUndefined();
    });

    it('should handle invalid positions gracefully', async () => {
      const monsterAI = createMonsterAI(eventBus);
      await monsterAI.initialize();
      
      const gameId = 'test-game-invalid';
      
      // Test edge cases
      await expect(monsterAI.spawnMonsterWave(gameId, { x: -1, y: -1 })).resolves.toBeUndefined();
      await expect(monsterAI.spawnMonsterWave(gameId, { x: 1000, y: 1000 })).resolves.toBeUndefined();
      await expect(monsterAI.spawnMonsterWave(gameId, { x: null as any, y: null as any })).resolves.toBeUndefined();
      await expect(monsterAI.spawnMonsterWave(gameId, { x: undefined as any, y: undefined as any })).resolves.toBeUndefined();
    });

    it('should handle null/undefined game IDs gracefully', async () => {
      const monsterAI = createMonsterAI(eventBus);
      await monsterAI.initialize();
      
      const position = { x: 5, y: 5 };
      
      await expect(monsterAI.spawnMonsterWave(null as any, position)).resolves.toBeUndefined();
      await expect(monsterAI.spawnMonsterWave(undefined as any, position)).resolves.toBeUndefined();
      await expect(monsterAI.spawnMonsterWave('' as any, position)).resolves.toBeUndefined();
      
      await expect(monsterAI.updateMonsterBehavior(null as any)).resolves.toBeUndefined();
      await expect(monsterAI.updateMonsterBehavior(undefined as any)).resolves.toBeUndefined();
      await expect(monsterAI.updateMonsterBehavior('' as any)).resolves.toBeUndefined();
    });
  });

  describe('Monster Wave Management', () => {
    it('should handle complete monster wave lifecycle', async () => {
      const monsterAI = createMonsterAI(eventBus);
      await monsterAI.initialize();
      
      const gameId = 'test-game-lifecycle';
      const gatePosition = { x: 8, y: 6 };
      
      // Spawn wave
      await expect(monsterAI.spawnMonsterWave(gameId, gatePosition)).resolves.toBeUndefined();
      
      // Update behavior
      await expect(monsterAI.updateMonsterBehavior(gameId)).resolves.toBeUndefined();
    });

    it('should handle escalating monster waves', async () => {
      const monsterAI = createMonsterAI(eventBus);
      await monsterAI.initialize();
      
      const gameId = 'test-game-escalating';
      const gatePositions = [
        { x: 2, y: 2 },   // First gate destroyed
        { x: 8, y: 6 },   // Second gate destroyed - harder wave
        { x: 13, y: 9 }   // Third gate destroyed - hardest wave
      ];
      
      // Simulate escalating difficulty with multiple gate destructions
      for (let i = 0; i < gatePositions.length; i++) {
        await expect(monsterAI.spawnMonsterWave(gameId, gatePositions[i])).resolves.toBeUndefined();
        await expect(monsterAI.updateMonsterBehavior(gameId)).resolves.toBeUndefined();
      }
    });
  });
});