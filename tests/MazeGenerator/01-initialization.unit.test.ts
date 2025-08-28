/**
 * MazeGenerator Unit Tests - Initialization
 * Tests basic MazeGenerator initialization and configuration
 * 
 * References:
 * - src/modules/MazeGenerator/index.ts - Implementation
 * - Interface compliance based on method signatures
 */

import { createEventBusImpl } from '../../src/modules/EventBusImpl';
import { createMazeGenerator } from '../../src/modules/MazeGenerator';
import type { EventBus } from '../../src/interfaces/core/EventBus';

describe('MazeGenerator - Initialization', () => {
  let eventBus: EventBus;
  let mazeGenerator: any;

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

    mazeGenerator = createMazeGenerator(eventBus);
  });

  afterEach(async () => {
    if (eventBus) {
      await eventBus.shutdown();
    }
  });

  describe('Constructor', () => {
    it('should create MazeGenerator instance with eventBus reference', () => {
      expect(mazeGenerator).toBeDefined();
      expect(mazeGenerator.eventBus).toBe(eventBus);
    });

    it('should have eventBus property accessible', () => {
      expect(mazeGenerator.eventBus).toBe(eventBus);
      expect(mazeGenerator.eventBus).toBeDefined();
      expect(typeof mazeGenerator.eventBus).toBe('object');
    });
  });

  describe('Interface Compliance', () => {
    it('should implement all required methods', () => {
      // Core methods based on src/modules/MazeGenerator/index.ts
      expect(typeof mazeGenerator.initialize).toBe('function');
      expect(typeof mazeGenerator.generateMaze).toBe('function');
      expect(typeof mazeGenerator.modifyMaze).toBe('function');
      expect(typeof mazeGenerator.destroyWall).toBe('function');
      expect(typeof mazeGenerator.validateMazeStructure).toBe('function');
    });

    it('should have async methods that return Promises', async () => {
      const initResult = mazeGenerator.initialize();
      expect(initResult).toBeInstanceOf(Promise);
      await initResult;

      const generateResult = mazeGenerator.generateMaze('test-game-1');
      expect(generateResult).toBeInstanceOf(Promise);
      await generateResult;

      const modifyResult = mazeGenerator.modifyMaze('test-game-1', []);
      expect(modifyResult).toBeInstanceOf(Promise);
      await modifyResult;

      const destroyResult = mazeGenerator.destroyWall('test-game-1', { x: 1, y: 1 });
      expect(destroyResult).toBeInstanceOf(Promise);
      await destroyResult;
    });
  });

  describe('initialize()', () => {
    it('should initialize successfully', async () => {
      await expect(mazeGenerator.initialize()).resolves.not.toThrow();
    });

    it('should handle multiple initializations gracefully', async () => {
      await mazeGenerator.initialize();
      await expect(mazeGenerator.initialize()).resolves.not.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should handle operations with uninitialized EventBus', async () => {
      // Create generator with uninitialized EventBus
      const uninitializedEventBus = createEventBusImpl();
      const uninitializedGenerator = createMazeGenerator(uninitializedEventBus);

      // Should not throw during maze generation (EventBus not required for generation)
      await expect(uninitializedGenerator.generateMaze('test-game')).resolves.not.toThrow();
    });

    it('should handle invalid game IDs gracefully', async () => {
      await mazeGenerator.initialize();

      // Test with null, undefined, empty string
      const invalidIds = [null, undefined, '', '   '];

      for (const invalidId of invalidIds) {
        await expect(mazeGenerator.generateMaze(invalidId as any)).resolves.toBeDefined();
        await expect(mazeGenerator.modifyMaze(invalidId as any, [])).resolves.toBeDefined();
        await expect(mazeGenerator.destroyWall(invalidId as any, { x: 1, y: 1 })).resolves.toBeDefined();
      }
    });
  });
});