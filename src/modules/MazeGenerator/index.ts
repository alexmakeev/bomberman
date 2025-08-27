/**
 * MazeGenerator Implementation
 * Procedural maze generation with destructible walls and strategic layouts
 */

import type { EventBus } from '../../interfaces/core/EventBus';
import type { EntityId } from '../../types/common';

// Constants for maze generation
const DEFAULT_MAZE_WIDTH = 15;
const DEFAULT_MAZE_HEIGHT = 11;
const DESTRUCTIBLE_WALL_PROBABILITY = 0.75;
const POWER_UP_SPAWN_RATE = 0.15;
const MIN_PLAYER_SAFE_RADIUS = 2;

/**
 * Maze cell types
 */
export type CellType = 'empty' | 'wall' | 'destructible' | 'spawn' | 'gate';

/**
 * Maze cell definition
 */
interface MazeCell {
  x: number;
  y: number;
  type: CellType;
  hasPlayer: boolean;
  hasBomb: boolean;
  hasPowerUp: boolean;
  powerUpType?: string;
}

/**
 * Player spawn position
 */
interface SpawnPosition {
  x: number;
  y: number;
  playerId?: EntityId;
  corner: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}

/**
 * Gate position for level exit
 */
interface GatePosition {
  x: number;
  y: number;
  isDestroyed: boolean;
  hiddenUnder: 'destructible' | 'powerup';
}

/**
 * Generated maze structure
 */
interface GeneratedMaze {
  width: number;
  height: number;
  cells: MazeCell[][];
  walls: Array<{ x: number; y: number }>;
  destructibleWalls: Array<{ x: number; y: number }>;
  spawnPositions: SpawnPosition[];
  gates: GatePosition[];
  powerUpLocations: Array<{ x: number; y: number; type: string }>;
}

/**
 * Maze generation options
 */
interface MazeGenerationOptions {
  width?: number;
  height?: number;
  destructibleProbability?: number;
  powerUpSpawnRate?: number;
  numGates?: number;
  playerCount?: number;
  seed?: string;
}

/**
 * MazeGenerator implementation
 */
class MazeGeneratorImpl {
  readonly eventBus: EventBus;
  private _seed: number = Date.now();

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
    console.log('🗺️ MazeGenerator created');
  }

  async initialize(): Promise<void> {
    console.log('🗺️ MazeGenerator initialized');
    // TODO: Load maze templates, power-up configurations
  }

  async generateMaze(gameId: EntityId, options?: MazeGenerationOptions): Promise<GeneratedMaze> {
    const opts = {
      width: DEFAULT_MAZE_WIDTH,
      height: DEFAULT_MAZE_HEIGHT,
      destructibleProbability: DESTRUCTIBLE_WALL_PROBABILITY,
      powerUpSpawnRate: POWER_UP_SPAWN_RATE,
      numGates: 2,
      playerCount: 4,
      ...options,
    };

    console.log(`🗺️ Generating maze for game ${gameId}: ${opts.width}x${opts.height}`);

    // Initialize seed for reproducible generation
    if (options?.seed) {
      this._seed = this.hashString(options.seed);
    }

    // Create base grid
    const cells = this.createBaseGrid(opts.width, opts.height);
    
    // Place permanent walls (creates the classic Bomberman grid pattern)
    this.placePermanentWalls(cells);
    
    // Place destructible walls
    this.placeDestructibleWalls(cells, opts.destructibleProbability);
    
    // Create player spawn positions
    const spawnPositions = this.createSpawnPositions(cells, opts.playerCount);
    
    // Clear safe areas around spawn points
    this.clearSpawnAreas(cells, spawnPositions);
    
    // Place gates (hidden under destructible walls)
    const gates = this.placeGates(cells, opts.numGates);
    
    // Place power-ups under destructible walls
    const powerUpLocations = this.placePowerUps(cells, opts.powerUpSpawnRate);

    // Extract wall positions
    const walls = this.extractWalls(cells, 'wall');
    const destructibleWalls = this.extractWalls(cells, 'destructible');

    const maze: GeneratedMaze = {
      width: opts.width,
      height: opts.height,
      cells,
      walls,
      destructibleWalls,
      spawnPositions,
      gates,
      powerUpLocations,
    };

    console.log(`🗺️ Maze generated: ${walls.length} walls, ${destructibleWalls.length} destructible, ${powerUpLocations.length} power-ups`);
    return maze;
  }

  async modifyMaze(gameId: EntityId, modifications: Array<{ x: number; y: number; newType: CellType }>): Promise<boolean> {
    console.log(`🗺️ Modifying maze for game ${gameId}: ${modifications.length} changes`);
    // TODO: Apply maze modifications, validate changes, notify players
    return true;
  }

  async destroyWall(gameId: EntityId, position: { x: number; y: number }): Promise<{ destroyed: boolean; powerUpRevealed?: string; gateRevealed?: boolean }> {
    console.log(`🗺️ Destroying wall at (${position.x}, ${position.y})`);
    
    // TODO: Check if wall is destructible, reveal power-ups or gates underneath
    const result = {
      destroyed: true,
      powerUpRevealed: this.random() < POWER_UP_SPAWN_RATE ? 'bomb_upgrade' : undefined,
      gateRevealed: this.random() < 0.1 ? true : undefined,
    };

    return result;
  }

  async validateMazeStructure(maze: GeneratedMaze): Promise<{ valid: boolean; issues: string[] }> {
    const issues: string[] = [];

    // Check maze dimensions
    if (maze.width < 9 || maze.height < 9) {
      issues.push('Maze too small for proper gameplay');
    }

    // Validate spawn positions are accessible
    for (const spawn of maze.spawnPositions) {
      if (!this.isPositionAccessible(maze.cells, spawn)) {
        issues.push(`Spawn position (${spawn.x}, ${spawn.y}) is not accessible`);
      }
    }

    // Check for sufficient destructible walls
    if (maze.destructibleWalls.length < maze.width * maze.height * 0.2) {
      issues.push('Too few destructible walls for balanced gameplay');
    }

    // Validate gates are properly hidden
    for (const gate of maze.gates) {
      const cell = maze.cells[gate.y][gate.x];
      if (cell.type !== 'destructible') {
        issues.push(`Gate at (${gate.x}, ${gate.y}) is not properly hidden`);
      }
    }

    return { valid: issues.length === 0, issues };
  }

  private createBaseGrid(width: number, height: number): MazeCell[][] {
    const cells: MazeCell[][] = [];
    
    for (let y = 0; y < height; y++) {
      cells[y] = [];
      for (let x = 0; x < width; x++) {
        cells[y][x] = {
          x,
          y,
          type: 'empty',
          hasPlayer: false,
          hasBomb: false,
          hasPowerUp: false,
        };
      }
    }
    
    return cells;
  }

  private placePermanentWalls(cells: MazeCell[][]): void {
    const height = cells.length;
    const width = cells[0].length;

    // Place border walls
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (x === 0 || x === width - 1 || y === 0 || y === height - 1) {
          cells[y][x].type = 'wall';
        }
      }
    }

    // Place internal permanent walls (every other row/column starting from 2)
    for (let y = 2; y < height - 1; y += 2) {
      for (let x = 2; x < width - 1; x += 2) {
        cells[y][x].type = 'wall';
      }
    }
  }

  private placeDestructibleWalls(cells: MazeCell[][], probability: number): void {
    const height = cells.length;
    const width = cells[0].length;

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        if (cells[y][x].type === 'empty' && this.random() < probability) {
          cells[y][x].type = 'destructible';
        }
      }
    }
  }

  private createSpawnPositions(cells: MazeCell[][], playerCount: number): SpawnPosition[] {
    const height = cells.length;
    const width = cells[0].length;
    
    const positions: SpawnPosition[] = [
      { x: 1, y: 1, corner: 'top-left' },
      { x: width - 2, y: 1, corner: 'top-right' },
      { x: 1, y: height - 2, corner: 'bottom-left' },
      { x: width - 2, y: height - 2, corner: 'bottom-right' },
    ];

    return positions.slice(0, playerCount);
  }

  private clearSpawnAreas(cells: MazeCell[][], spawnPositions: SpawnPosition[]): void {
    for (const spawn of spawnPositions) {
      // Clear 2x2 area around each spawn point
      for (let dy = 0; dy < MIN_PLAYER_SAFE_RADIUS; dy++) {
        for (let dx = 0; dx < MIN_PLAYER_SAFE_RADIUS; dx++) {
          const x = spawn.x + dx;
          const y = spawn.y + dy;
          if (x < cells[0].length && y < cells.length && cells[y][x].type === 'destructible') {
            cells[y][x].type = 'empty';
          }
        }
      }
      
      cells[spawn.y][spawn.x].type = 'spawn';
    }
  }

  private placeGates(cells: MazeCell[][], numGates: number): GatePosition[] {
    const gates: GatePosition[] = [];
    const destructiblePositions = this.getDestructiblePositions(cells);
    
    // Randomly select positions for gates
    for (let i = 0; i < numGates && i < destructiblePositions.length; i++) {
      const randomIndex = Math.floor(this.random() * destructiblePositions.length);
      const position = destructiblePositions.splice(randomIndex, 1)[0];
      
      gates.push({
        x: position.x,
        y: position.y,
        isDestroyed: false,
        hiddenUnder: 'destructible',
      });
    }

    return gates;
  }

  private placePowerUps(cells: MazeCell[][], spawnRate: number): Array<{ x: number; y: number; type: string }> {
    const powerUps: Array<{ x: number; y: number; type: string }> = [];
    const destructiblePositions = this.getDestructiblePositions(cells);
    
    const powerUpTypes = ['bomb_upgrade', 'blast_radius', 'speed_boost', 'bomb_kick', 'bomb_throw'];
    
    for (const pos of destructiblePositions) {
      if (this.random() < spawnRate) {
        const randomType = powerUpTypes[Math.floor(this.random() * powerUpTypes.length)];
        powerUps.push({
          x: pos.x,
          y: pos.y,
          type: randomType,
        });
        
        cells[pos.y][pos.x].hasPowerUp = true;
        cells[pos.y][pos.x].powerUpType = randomType;
      }
    }

    return powerUps;
  }

  private getDestructiblePositions(cells: MazeCell[][]): Array<{ x: number; y: number }> {
    const positions: Array<{ x: number; y: number }> = [];
    
    for (let y = 0; y < cells.length; y++) {
      for (let x = 0; x < cells[y].length; x++) {
        if (cells[y][x].type === 'destructible') {
          positions.push({ x, y });
        }
      }
    }
    
    return positions;
  }

  private extractWalls(cells: MazeCell[][], wallType: CellType): Array<{ x: number; y: number }> {
    const walls: Array<{ x: number; y: number }> = [];
    
    for (let y = 0; y < cells.length; y++) {
      for (let x = 0; x < cells[y].length; x++) {
        if (cells[y][x].type === wallType) {
          walls.push({ x, y });
        }
      }
    }
    
    return walls;
  }

  private isPositionAccessible(cells: MazeCell[][], position: { x: number; y: number }): boolean {
    // Simple check - position should be empty or spawn type
    if (position.x < 0 || position.y < 0 || position.y >= cells.length || position.x >= cells[0].length) {
      return false;
    }
    
    const cellType = cells[position.y][position.x].type;
    return cellType === 'empty' || cellType === 'spawn';
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }

  private random(): number {
    // Simple LCG for reproducible randomness
    this._seed = (this._seed * 9301 + 49297) % 233280;
    return this._seed / 233280;
  }
}

/**
 * Factory function to create MazeGenerator instance
 */
export function createMazeGenerator(eventBus: EventBus): MazeGeneratorImpl {
  return new MazeGeneratorImpl(eventBus);
}