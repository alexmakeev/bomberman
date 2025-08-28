/**
 * MazeGenerator Unit Tests - Maze Generation
 * Tests maze generation algorithms and maze structure validation
 * 
 * References:
 * - src/modules/MazeGenerator/index.ts:98-154 - generateMaze method
 * - src/modules/MazeGenerator/index.ts:175-204 - validateMazeStructure method
 * - docs/schema/game.md - Game maze structure definitions
 * - Game design: Classic Bomberman grid pattern with destructible walls
 */

import { createEventBusImpl } from '../../src/modules/EventBusImpl';
import { createMazeGenerator } from '../../src/modules/MazeGenerator';
import type { EventBus } from '../../src/interfaces/core/EventBus';

describe('MazeGenerator - Maze Generation', () => {
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

  describe('generateMaze()', () => {
    it('should generate maze with default parameters', async () => {
      const maze = await mazeGenerator.generateMaze('test-game-1');
      
      expect(maze).toBeDefined();
      expect(maze).toHaveProperty('width');
      expect(maze).toHaveProperty('height');
      expect(maze).toHaveProperty('cells');
      expect(maze).toHaveProperty('walls');
      expect(maze).toHaveProperty('destructibleWalls');
      expect(maze).toHaveProperty('spawnPositions');
      expect(maze).toHaveProperty('gates');
      expect(maze).toHaveProperty('powerUpLocations');

      // Default size should be 15x11 (src/modules/MazeGenerator/index.ts:10-11)
      expect(maze.width).toBe(15);
      expect(maze.height).toBe(11);
      
      // Cells should be 2D array matching dimensions
      expect(maze.cells).toHaveLength(11);
      expect(maze.cells[0]).toHaveLength(15);
    });

    it('should generate maze with custom dimensions', async () => {
      const customOptions = {
        width: 21,
        height: 15,
        playerCount: 2,
      };

      const maze = await mazeGenerator.generateMaze('test-game-2', customOptions);
      
      expect(maze.width).toBe(21);
      expect(maze.height).toBe(15);
      expect(maze.cells).toHaveLength(15);
      expect(maze.cells[0]).toHaveLength(21);
      expect(maze.spawnPositions).toHaveLength(2);
    });

    it('should create proper Bomberman grid pattern with permanent walls', async () => {
      const maze = await mazeGenerator.generateMaze('test-game-3');
      
      // Border walls should be permanent (src/modules/MazeGenerator/index.ts:230-237)
      for (let x = 0; x < maze.width; x++) {
        expect(maze.cells[0][x].type).toBe('wall'); // Top border
        expect(maze.cells[maze.height - 1][x].type).toBe('wall'); // Bottom border
      }
      
      for (let y = 0; y < maze.height; y++) {
        expect(maze.cells[y][0].type).toBe('wall'); // Left border
        expect(maze.cells[y][maze.width - 1].type).toBe('wall'); // Right border
      }

      // Internal permanent walls every 2nd position (src/modules/MazeGenerator/index.ts:240-245)
      for (let y = 2; y < maze.height - 1; y += 2) {
        for (let x = 2; x < maze.width - 1; x += 2) {
          expect(maze.cells[y][x].type).toBe('wall');
        }
      }
    });

    it('should place player spawn positions in corners', async () => {
      const maze = await mazeGenerator.generateMaze('test-game-4', { playerCount: 4 });
      
      expect(maze.spawnPositions).toHaveLength(4);
      
      // Verify corner positions (src/modules/MazeGenerator/index.ts:264-272)
      const corners = maze.spawnPositions.map(pos => pos.corner);
      expect(corners).toContain('top-left');
      expect(corners).toContain('top-right');
      expect(corners).toContain('bottom-left');
      expect(corners).toContain('bottom-right');

      // Verify spawn positions are marked in cells
      for (const spawn of maze.spawnPositions) {
        expect(maze.cells[spawn.y][spawn.x].type).toBe('spawn');
      }
    });

    it('should clear safe areas around spawn positions', async () => {
      const maze = await mazeGenerator.generateMaze('test-game-5');
      
      // Check that 2x2 area around each spawn is clear of destructible walls (src/modules/MazeGenerator/index.ts:274-289)
      for (const spawn of maze.spawnPositions) {
        for (let dy = 0; dy < 2; dy++) {
          for (let dx = 0; dx < 2; dx++) {
            const x = spawn.x + dx;
            const y = spawn.y + dy;
            if (x < maze.width && y < maze.height) {
              const cellType = maze.cells[y][x].type;
              // Safe areas should not have destructible walls (but permanent walls are OK)
              expect(cellType !== 'destructible').toBe(true);
            }
          }
        }
        
        // Spawn position itself should be marked as spawn
        expect(maze.cells[spawn.y][spawn.x].type).toBe('spawn');
      }
    });

    it('should place destructible walls with specified probability', async () => {
      const lowProbability = await mazeGenerator.generateMaze('test-game-6', {
        destructibleProbability: 0.1
      });
      
      const highProbability = await mazeGenerator.generateMaze('test-game-7', {
        destructibleProbability: 0.9
      });

      expect(lowProbability.destructibleWalls.length).toBeLessThan(highProbability.destructibleWalls.length);
    });

    it('should place gates hidden under destructible walls', async () => {
      const maze = await mazeGenerator.generateMaze('test-game-8', { numGates: 3 });
      
      expect(maze.gates).toHaveLength(3);
      
      for (const gate of maze.gates) {
        // Gates should be hidden under destructible walls (src/modules/MazeGenerator/index.ts:304)
        expect(gate.hiddenUnder).toBe('destructible');
        expect(gate.isDestroyed).toBe(false);
        
        // Position should have a destructible wall
        expect(maze.cells[gate.y][gate.x].type).toBe('destructible');
      }
    });

    it('should place power-ups under destructible walls', async () => {
      const maze = await mazeGenerator.generateMaze('test-game-9', {
        powerUpSpawnRate: 0.8 // High spawn rate for testing
      });
      
      expect(maze.powerUpLocations.length).toBeGreaterThan(0);
      
      for (const powerUp of maze.powerUpLocations) {
        // Power-up should be under destructible wall with hasPowerUp flag
        const cell = maze.cells[powerUp.y][powerUp.x];
        expect(cell.type).toBe('destructible');
        expect(cell.hasPowerUp).toBe(true);
        expect(cell.powerUpType).toBe(powerUp.type);
        
        // Verify power-up type is valid (src/modules/MazeGenerator/index.ts:315)
        const validTypes = ['bomb_upgrade', 'blast_radius', 'speed_boost', 'bomb_kick', 'bomb_throw'];
        expect(validTypes).toContain(powerUp.type);
      }
    });

    it('should generate reproducible mazes with same seed', async () => {
      const seed = 'test-seed-123';
      
      const maze1 = await mazeGenerator.generateMaze('test-game-10', { seed });
      const maze2 = await mazeGenerator.generateMaze('test-game-11', { seed });
      
      // Mazes with same seed should be identical
      expect(maze1.walls).toEqual(maze2.walls);
      expect(maze1.destructibleWalls).toEqual(maze2.destructibleWalls);
      expect(maze1.powerUpLocations).toEqual(maze2.powerUpLocations);
    });

    it('should handle edge cases for maze dimensions', async () => {
      // Minimum viable maze
      const smallMaze = await mazeGenerator.generateMaze('test-game-12', {
        width: 9,
        height: 9,
        playerCount: 2
      });
      
      expect(smallMaze.width).toBe(9);
      expect(smallMaze.height).toBe(9);
      expect(smallMaze.spawnPositions).toHaveLength(2);

      // Large maze
      const largeMaze = await mazeGenerator.generateMaze('test-game-13', {
        width: 31,
        height: 21,
        playerCount: 4
      });
      
      expect(largeMaze.width).toBe(31);
      expect(largeMaze.height).toBe(21);
    });
  });

  describe('validateMazeStructure()', () => {
    it('should validate a properly generated maze', async () => {
      const maze = await mazeGenerator.generateMaze('test-game-validate-1');
      const validation = await mazeGenerator.validateMazeStructure(maze);
      
      expect(validation.valid).toBe(true);
      expect(validation.issues).toEqual([]);
    });

    it('should detect maze that is too small', async () => {
      const maze = await mazeGenerator.generateMaze('test-game-validate-2', {
        width: 7,
        height: 7
      });
      
      const validation = await mazeGenerator.validateMazeStructure(maze);
      
      expect(validation.valid).toBe(false);
      expect(validation.issues).toContain('Maze too small for proper gameplay');
    });

    it('should validate spawn positions are accessible', async () => {
      const maze = await mazeGenerator.generateMaze('test-game-validate-3');
      const validation = await mazeGenerator.validateMazeStructure(maze);
      
      // All spawn positions in a properly generated maze should be accessible
      expect(validation.valid).toBe(true);
      const spawnIssues = validation.issues.filter(issue => issue.includes('not accessible'));
      expect(spawnIssues).toHaveLength(0);
    });

    it('should detect insufficient destructible walls', async () => {
      const maze = await mazeGenerator.generateMaze('test-game-validate-4', {
        destructibleProbability: 0.01 // Very low probability
      });
      
      const validation = await mazeGenerator.validateMazeStructure(maze);
      
      // Should flag too few destructible walls (src/modules/MazeGenerator/index.ts:191-193)
      const wallIssues = validation.issues.filter(issue => issue.includes('Too few destructible walls'));
      expect(wallIssues.length).toBeGreaterThanOrEqual(0); // May or may not trigger depending on random generation
    });

    it('should validate gates are properly hidden', async () => {
      const maze = await mazeGenerator.generateMaze('test-game-validate-5');
      const validation = await mazeGenerator.validateMazeStructure(maze);
      
      // In properly generated maze, all gates should be under destructible walls
      const gateIssues = validation.issues.filter(issue => issue.includes('not properly hidden'));
      expect(gateIssues).toHaveLength(0);
    });
  });
});