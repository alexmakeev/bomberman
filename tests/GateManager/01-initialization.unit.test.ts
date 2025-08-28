/**
 * GateManager Unit Tests - Initialization
 * Tests basic GateManager initialization and configuration
 */

import { createGateManager } from '../../src/modules/GateManager';
import { EventBusImpl } from '../../src/modules/EventBusImpl';
import type { EventBus, EventBusConfig } from '../../src/interfaces/core/EventBus';
import { EventCategory, EventPriority, DeliveryMode } from '../../src/types/events.d.ts';

describe('GateManager - Initialization', () => {
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
    it('should create GateManager instance', () => {
      const gateManager = createGateManager(eventBus);
      
      expect(gateManager).toBeDefined();
      expect(gateManager.eventBus).toBe(eventBus);
    });

    it('should have eventBus property accessible', () => {
      const gateManager = createGateManager(eventBus);
      
      expect(gateManager).toHaveProperty('eventBus');
      expect(gateManager.eventBus).toBeInstanceOf(EventBusImpl);
    });
  });

  describe('Interface Compliance', () => {
    it('should implement all required methods', () => {
      const gateManager = createGateManager(eventBus);
      
      // Core methods
      expect(typeof gateManager.initialize).toBe('function');
      expect(typeof gateManager.revealGate).toBe('function');
      expect(typeof gateManager.destroyGate).toBe('function');
    });

    it('should have async methods that return Promises', async () => {
      const gateManager = createGateManager(eventBus);
      
      const initializeResult = gateManager.initialize();
      expect(initializeResult).toBeInstanceOf(Promise);
      await initializeResult;

      const revealResult = gateManager.revealGate('game-1', { x: 5, y: 5 });
      expect(revealResult).toBeInstanceOf(Promise);
      await revealResult;

      const destroyResult = gateManager.destroyGate('game-1', 'gate-1');
      expect(destroyResult).toBeInstanceOf(Promise);
      await destroyResult;
    });
  });

  describe('initialize()', () => {
    it('should initialize successfully', async () => {
      const gateManager = createGateManager(eventBus);
      
      await expect(gateManager.initialize()).resolves.toBeUndefined();
    });

    it('should handle multiple initializations gracefully', async () => {
      const gateManager = createGateManager(eventBus);
      
      await gateManager.initialize();
      await expect(gateManager.initialize()).resolves.toBeUndefined();
    });
  });

  describe('revealGate()', () => {
    it('should reveal gate successfully', async () => {
      const gateManager = createGateManager(eventBus);
      await gateManager.initialize();
      
      const gameId = 'test-game';
      const position = { x: 7, y: 7 };
      
      const result = await gateManager.revealGate(gameId, position);
      
      expect(result).toBeDefined();
      expect(typeof result).toBe('boolean');
      expect(result).toBe(true);
    });

    it('should handle various gate positions', async () => {
      const gateManager = createGateManager(eventBus);
      await gateManager.initialize();
      
      const gameId = 'test-game-positions';
      const positions = [
        { x: 0, y: 0 },
        { x: 10, y: 10 },
        { x: 15, y: 11 },
        { x: 7.5, y: 5.5 }
      ];
      
      for (const position of positions) {
        const result = await gateManager.revealGate(gameId, position);
        expect(result).toBe(true);
      }
    });
  });

  describe('destroyGate()', () => {
    it('should destroy gate successfully', async () => {
      const gateManager = createGateManager(eventBus);
      await gateManager.initialize();
      
      const gameId = 'test-game';
      const gateId = 'gate-1';
      
      await expect(gateManager.destroyGate(gameId, gateId)).resolves.toBeUndefined();
    });

    it('should handle multiple gate destructions', async () => {
      const gateManager = createGateManager(eventBus);
      await gateManager.initialize();
      
      const gameId = 'test-game-multiple';
      const gateIds = ['gate-1', 'gate-2', 'gate-3'];
      
      for (const gateId of gateIds) {
        await expect(gateManager.destroyGate(gameId, gateId)).resolves.toBeUndefined();
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle operations with uninitialized GateManager', async () => {
      const gateManager = createGateManager(eventBus);
      
      // Should still work without initialization for now (stub implementation)
      await expect(gateManager.revealGate('game-1', { x: 5, y: 5 })).resolves.toBe(true);
      await expect(gateManager.destroyGate('game-1', 'gate-1')).resolves.toBeUndefined();
    });

    it('should handle invalid positions gracefully', async () => {
      const gateManager = createGateManager(eventBus);
      await gateManager.initialize();
      
      const gameId = 'test-game-invalid';
      
      // Test edge cases
      await expect(gateManager.revealGate(gameId, { x: -1, y: -1 })).resolves.toBe(true);
      await expect(gateManager.revealGate(gameId, { x: 1000, y: 1000 })).resolves.toBe(true);
      await expect(gateManager.revealGate(gameId, { x: null as any, y: null as any })).resolves.toBe(true);
      await expect(gateManager.revealGate(gameId, { x: undefined as any, y: undefined as any })).resolves.toBe(true);
    });

    it('should handle null/undefined game IDs gracefully', async () => {
      const gateManager = createGateManager(eventBus);
      await gateManager.initialize();
      
      const position = { x: 5, y: 5 };
      const gateId = 'gate-1';
      
      await expect(gateManager.revealGate(null as any, position)).resolves.toBe(true);
      await expect(gateManager.revealGate(undefined as any, position)).resolves.toBe(true);
      await expect(gateManager.revealGate('' as any, position)).resolves.toBe(true);
      
      await expect(gateManager.destroyGate(null as any, gateId)).resolves.toBeUndefined();
      await expect(gateManager.destroyGate(undefined as any, gateId)).resolves.toBeUndefined();
      await expect(gateManager.destroyGate('' as any, gateId)).resolves.toBeUndefined();
    });

    it('should handle null/undefined gate IDs gracefully', async () => {
      const gateManager = createGateManager(eventBus);
      await gateManager.initialize();
      
      const gameId = 'test-game';
      
      await expect(gateManager.destroyGate(gameId, null as any)).resolves.toBeUndefined();
      await expect(gateManager.destroyGate(gameId, undefined as any)).resolves.toBeUndefined();
      await expect(gateManager.destroyGate(gameId, '' as any)).resolves.toBeUndefined();
      await expect(gateManager.destroyGate(gameId, '   ' as any)).resolves.toBeUndefined();
    });
  });

  describe('Gate Management Workflow', () => {
    it('should handle complete gate lifecycle', async () => {
      const gateManager = createGateManager(eventBus);
      await gateManager.initialize();
      
      const gameId = 'test-game-lifecycle';
      const position = { x: 8, y: 6 };
      
      // Reveal gate
      const revealed = await gateManager.revealGate(gameId, position);
      expect(revealed).toBe(true);
      
      // Destroy gate
      await expect(gateManager.destroyGate(gameId, 'gate-revealed')).resolves.toBeUndefined();
    });

    it('should handle multiple gates in same game', async () => {
      const gateManager = createGateManager(eventBus);
      await gateManager.initialize();
      
      const gameId = 'test-game-multiple-gates';
      const positions = [
        { x: 2, y: 2 },
        { x: 8, y: 6 },
        { x: 13, y: 9 }
      ];
      
      // Reveal multiple gates
      for (let i = 0; i < positions.length; i++) {
        const revealed = await gateManager.revealGate(gameId, positions[i]);
        expect(revealed).toBe(true);
      }
      
      // Destroy all gates
      for (let i = 0; i < positions.length; i++) {
        await expect(gateManager.destroyGate(gameId, `gate-${i}`)).resolves.toBeUndefined();
      }
    });
  });
});