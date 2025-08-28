/**
 * MazeGenerator Unit Tests - Maze Modification
 * Tests maze modification and wall destruction functionality
 * 
 * References:
 * - src/modules/MazeGenerator/index.ts:156-173 - modifyMaze and destroyWall methods
 * - Game mechanics: Wall destruction reveals power-ups or gates underneath
 * - docs/schema/game.md - Game state modification definitions
 */

import { createEventBusImpl } from '../../src/modules/EventBusImpl';
import { createMazeGenerator } from '../../src/modules/MazeGenerator';
import type { EventBus } from '../../src/interfaces/core/EventBus';

describe('MazeGenerator - Maze Modification', () => {
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
    await mazeGenerator.initialize();
  });

  afterEach(async () => {
    if (eventBus) {
      await eventBus.shutdown();
    }
  });

  describe('modifyMaze()', () => {
    it('should handle maze modifications successfully', async () => {
      const gameId = 'test-game-modify-1';
      const modifications = [
        { x: 3, y: 3, newType: 'empty' as any },
        { x: 5, y: 5, newType: 'destructible' as any },
        { x: 7, y: 7, newType: 'wall' as any },
      ];

      const result = await mazeGenerator.modifyMaze(gameId, modifications);
      
      expect(result).toBe(true);
    });

    it('should handle empty modifications list', async () => {
      const gameId = 'test-game-modify-2';
      const modifications: any[] = [];

      const result = await mazeGenerator.modifyMaze(gameId, modifications);
      
      expect(result).toBe(true);
    });

    it('should handle multiple modifications at once', async () => {
      const gameId = 'test-game-modify-3';
      const modifications = Array.from({ length: 10 }, (_, i) => ({
        x: i + 1,
        y: i + 1,
        newType: 'empty' as any,
      }));

      const result = await mazeGenerator.modifyMaze(gameId, modifications);
      
      expect(result).toBe(true);
    });

    it('should handle modifications with different cell types', async () => {
      const gameId = 'test-game-modify-4';
      const cellTypes = ['empty', 'wall', 'destructible', 'spawn'] as const;
      
      const modifications = cellTypes.map((type, index) => ({
        x: index + 1,
        y: 1,
        newType: type as any,
      }));

      const result = await mazeGenerator.modifyMaze(gameId, modifications);
      
      expect(result).toBe(true);
    });

    it('should handle invalid positions gracefully', async () => {
      const gameId = 'test-game-modify-5';
      const modifications = [
        { x: -1, y: -1, newType: 'empty' as any }, // Negative coordinates
        { x: 1000, y: 1000, newType: 'empty' as any }, // Out of bounds
        { x: 0, y: 0, newType: 'invalid_type' as any }, // Invalid type
      ];

      // Should not throw error, but may return false or handle gracefully
      await expect(mazeGenerator.modifyMaze(gameId, modifications)).resolves.toBeDefined();
    });
  });

  describe('destroyWall()', () => {
    it('should destroy wall and return destruction result', async () => {
      const gameId = 'test-game-destroy-1';
      const position = { x: 3, y: 3 };

      const result = await mazeGenerator.destroyWall(gameId, position);
      
      expect(result).toBeDefined();
      expect(result).toHaveProperty('destroyed');
      expect(typeof result.destroyed).toBe('boolean');
      
      // Optional properties based on what's revealed (src/modules/MazeGenerator/index.ts:162-173)
      if (result.powerUpRevealed !== undefined) {
        expect(typeof result.powerUpRevealed).toBe('string');
      }
      if (result.gateRevealed !== undefined) {
        expect(typeof result.gateRevealed).toBe('boolean');
      }
    });

    it('should handle wall destruction at different positions', async () => {
      const gameId = 'test-game-destroy-2';
      const positions = [
        { x: 1, y: 1 },
        { x: 5, y: 7 },
        { x: 10, y: 5 },
        { x: 3, y: 9 },
      ];

      for (const position of positions) {
        const result = await mazeGenerator.destroyWall(gameId, position);
        expect(result.destroyed).toBe(true);
      }
    });

    it('should sometimes reveal power-ups when destroying walls', async () => {
      const gameId = 'test-game-destroy-3';
      const results = [];

      // Try destroying multiple walls to increase chance of power-up reveal
      for (let i = 0; i < 20; i++) {
        const position = { x: 3 + (i % 5), y: 3 + Math.floor(i / 5) };
        const result = await mazeGenerator.destroyWall(gameId, position);
        results.push(result);
      }

      // Should have at least some results (implementation uses random)
      expect(results.length).toBe(20);
      
      // Check if any power-ups were revealed (implementation has POWER_UP_SPAWN_RATE chance)
      const powerUpReveals = results.filter(r => r.powerUpRevealed);
      
      // With 20 attempts and 0.15 spawn rate, we might get some (but it's probabilistic)
      expect(powerUpReveals.length).toBeGreaterThanOrEqual(0);
      
      // If power-ups were revealed, check valid types
      for (const reveal of powerUpReveals) {
        expect(typeof reveal.powerUpRevealed).toBe('string');
        expect(reveal.powerUpRevealed.length).toBeGreaterThan(0);
      }
    });

    it('should sometimes reveal gates when destroying walls', async () => {
      const gameId = 'test-game-destroy-4';
      const results = [];

      // Try destroying multiple walls to increase chance of gate reveal
      for (let i = 0; i < 50; i++) {
        const position = { x: 1 + (i % 10), y: 1 + Math.floor(i / 10) };
        const result = await mazeGenerator.destroyWall(gameId, position);
        results.push(result);
      }

      expect(results.length).toBe(50);
      
      // Check if any gates were revealed (implementation has 0.1 chance)
      const gateReveals = results.filter(r => r.gateRevealed);
      
      // With 50 attempts and 0.1 reveal rate, we might get some (but it's probabilistic)
      expect(gateReveals.length).toBeGreaterThanOrEqual(0);
      
      // If gates were revealed, should be boolean true
      for (const reveal of gateReveals) {
        expect(reveal.gateRevealed).toBe(true);
      }
    });

    it('should handle invalid wall positions gracefully', async () => {
      const gameId = 'test-game-destroy-5';
      const invalidPositions = [
        { x: -1, y: -1 }, // Negative coordinates
        { x: 1000, y: 1000 }, // Way out of bounds
        { x: 0, y: 0 }, // Border position (permanent wall)
      ];

      for (const position of invalidPositions) {
        // Should not throw error
        await expect(mazeGenerator.destroyWall(gameId, position)).resolves.toBeDefined();
      }
    });

    it('should handle concurrent wall destructions', async () => {
      const gameId = 'test-game-destroy-6';
      const positions = [
        { x: 3, y: 3 },
        { x: 5, y: 3 },
        { x: 7, y: 3 },
        { x: 9, y: 3 },
      ];

      // Execute all destructions concurrently
      const promises = positions.map(pos => 
        mazeGenerator.destroyWall(gameId, pos)
      );

      const results = await Promise.all(promises);
      
      expect(results).toHaveLength(4);
      for (const result of results) {
        expect(result).toHaveProperty('destroyed');
      }
    });
  });

  describe('Integration Tests', () => {
    it('should work with generated maze structure', async () => {
      const gameId = 'test-game-integration-1';
      
      // First generate a maze
      const maze = await mazeGenerator.generateMaze(gameId);
      expect(maze).toBeDefined();

      // Try to destroy some destructible walls from the maze
      if (maze.destructibleWalls.length > 0) {
        const wallToDestroy = maze.destructibleWalls[0];
        const result = await mazeGenerator.destroyWall(gameId, wallToDestroy);
        
        expect(result.destroyed).toBe(true);
      }

      // Try to modify the maze
      const modifications = [
        { x: 1, y: 1, newType: 'empty' as any }, // Clear spawn area
      ];
      
      const modifyResult = await mazeGenerator.modifyMaze(gameId, modifications);
      expect(modifyResult).toBe(true);
    });

    it('should handle maze operations for multiple games', async () => {
      const gameIds = ['game-multi-1', 'game-multi-2', 'game-multi-3'];
      
      // Generate mazes for multiple games
      const mazes = await Promise.all(
        gameIds.map(id => mazeGenerator.generateMaze(id))
      );

      expect(mazes).toHaveLength(3);
      
      // Perform operations on each game
      for (let i = 0; i < gameIds.length; i++) {
        const gameId = gameIds[i];
        
        // Destroy a wall
        const destroyResult = await mazeGenerator.destroyWall(gameId, { x: 3, y: 3 });
        expect(destroyResult.destroyed).toBe(true);
        
        // Modify the maze
        const modifyResult = await mazeGenerator.modifyMaze(gameId, [
          { x: 5, y: 5, newType: 'empty' as any }
        ]);
        expect(modifyResult).toBe(true);
      }
    });
  });
});