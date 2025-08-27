/**
 * BombManager Implementation
 * Handles bomb placement, timing, explosions, and damage calculation
 */

import type { EventBus } from '../../interfaces/core/EventBus';
import type { EntityId } from '../../types/common';

// Constants for bomb mechanics
const DEFAULT_BOMB_TIMER = 3000; // 3 seconds
const DEFAULT_BLAST_RADIUS = 1;
const MAX_BOMBS_PER_PLAYER = 1;
const EXPLOSION_DURATION = 500; // 0.5 seconds

/**
 * Represents a bomb in the game
 */
interface Bomb {
  bombId: EntityId;
  playerId: EntityId;
  gameId: EntityId;
  position: { x: number; y: number };
  timer: number;
  blastRadius: number;
  placedAt: Date;
  explodeAt: Date;
  status: 'active' | 'exploded' | 'defused';
}

/**
 * Represents an explosion area
 */
interface Explosion {
  explosionId: EntityId;
  bombId: EntityId;
  gameId: EntityId;
  center: { x: number; y: number };
  affectedCells: Array<{ x: number; y: number }>;
  createdAt: Date;
  expiresAt: Date;
  damage: number;
}

/**
 * Bomb placement validation result
 */
interface BombPlacementResult {
  success: boolean;
  bombId?: EntityId;
  error?: string;
  reason?: 'max_bombs_reached' | 'invalid_position' | 'player_not_found';
}

/**
 * Explosion calculation result
 */
interface ExplosionResult {
  explosionId: EntityId;
  affectedCells: Array<{ x: number; y: number; cellType: 'empty' | 'wall' | 'destructible' | 'player' | 'powerup' }>;
  destroyedWalls: Array<{ x: number; y: number }>;
  affectedPlayers: Array<{ playerId: EntityId; damage: number }>;
  chainReactionBombs: EntityId[];
}

/**
 * BombManager implementation stub
 */
class BombManagerImpl {
  readonly eventBus: EventBus;
  private readonly _activeBombs = new Map<EntityId, Bomb>();
  private readonly _activeExplosions = new Map<EntityId, Explosion>();
  private readonly _playerBombCounts = new Map<EntityId, number>();
  private readonly _explosionTimers = new Map<EntityId, NodeJS.Timeout>();

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
    console.log('💣 BombManager created');
  }

  async initialize(): Promise<void> {
    console.log('💣 BombManager initialized');
    // TODO: Setup bomb explosion handlers, chain reaction logic
  }

  async placeBomb(gameId: EntityId, playerId: EntityId, position: { x: number; y: number }): Promise<BombPlacementResult> {
    console.log(`💣 Bomb placement request: ${playerId} at (${position.x}, ${position.y})`);
    
    // Check player bomb limit
    const currentBombs = this._playerBombCounts.get(playerId) || 0;
    if (currentBombs >= MAX_BOMBS_PER_PLAYER) {
      return { success: false, reason: 'max_bombs_reached', error: 'Player has reached maximum bomb limit' };
    }

    // TODO: Validate position against maze walls and other bombs
    
    const bombId = `bomb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date();
    const explodeAt = new Date(now.getTime() + DEFAULT_BOMB_TIMER);

    const bomb: Bomb = {
      bombId,
      playerId,
      gameId,
      position,
      timer: DEFAULT_BOMB_TIMER,
      blastRadius: DEFAULT_BLAST_RADIUS,
      placedAt: now,
      explodeAt,
      status: 'active',
    };

    this._activeBombs.set(bombId, bomb);
    this._playerBombCounts.set(playerId, currentBombs + 1);

    // Schedule explosion
    const timer = setTimeout(() => {
      this.explodeBomb(bombId).catch(console.error);
    }, DEFAULT_BOMB_TIMER);
    
    this._explosionTimers.set(bombId, timer);

    console.log(`💣 Bomb placed: ${bombId} (explodes in ${DEFAULT_BOMB_TIMER}ms)`);
    return { success: true, bombId };
  }

  async explodeBomb(bombId: EntityId): Promise<ExplosionResult | null> {
    const bomb = this._activeBombs.get(bombId);
    if (!bomb || bomb.status !== 'active') {
      return null;
    }

    console.log(`💥 Bomb exploding: ${bombId}`);
    bomb.status = 'exploded';

    // Calculate explosion pattern (cross shape with blast radius)
    const affectedCells = this.calculateExplosionPattern(bomb.position, bomb.blastRadius);
    
    const explosionId = `explosion_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const explosion: Explosion = {
      explosionId,
      bombId,
      gameId: bomb.gameId,
      center: bomb.position,
      affectedCells: affectedCells.map(cell => ({ x: cell.x, y: cell.y })),
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + EXPLOSION_DURATION),
      damage: 100, // Full damage for now
    };

    this._activeExplosions.set(explosionId, explosion);

    // TODO: Calculate actual cell contents, wall destruction, player damage
    const explosionResult: ExplosionResult = {
      explosionId,
      affectedCells: affectedCells.map(cell => ({ ...cell, cellType: 'empty' as const })),
      destroyedWalls: [],
      affectedPlayers: [],
      chainReactionBombs: [],
    };

    // Clean up bomb
    this._activeBombs.delete(bombId);
    const currentCount = this._playerBombCounts.get(bomb.playerId) || 1;
    this._playerBombCounts.set(bomb.playerId, currentCount - 1);

    // Clear explosion timer
    const timer = this._explosionTimers.get(bombId);
    if (timer) {
      clearTimeout(timer);
      this._explosionTimers.delete(bombId);
    }

    // Schedule explosion cleanup
    setTimeout(() => {
      this._activeExplosions.delete(explosionId);
      console.log(`💥 Explosion cleaned up: ${explosionId}`);
    }, EXPLOSION_DURATION);

    console.log(`💥 Explosion result: ${affectedCells.length} cells affected`);
    return explosionResult;
  }

  async defuseBomb(bombId: EntityId): Promise<boolean> {
    const bomb = this._activeBombs.get(bombId);
    if (!bomb || bomb.status !== 'active') {
      return false;
    }

    bomb.status = 'defused';
    this._activeBombs.delete(bombId);
    
    // Update player bomb count
    const currentCount = this._playerBombCounts.get(bomb.playerId) || 1;
    this._playerBombCounts.set(bomb.playerId, currentCount - 1);

    // Cancel explosion timer
    const timer = this._explosionTimers.get(bombId);
    if (timer) {
      clearTimeout(timer);
      this._explosionTimers.delete(bombId);
    }

    console.log(`💣 Bomb defused: ${bombId}`);
    return true;
  }

  async getBombsInGame(gameId: EntityId): Promise<Bomb[]> {
    return Array.from(this._activeBombs.values()).filter(bomb => bomb.gameId === gameId);
  }

  async getExplosionsInGame(gameId: EntityId): Promise<Explosion[]> {
    return Array.from(this._activeExplosions.values()).filter(explosion => explosion.gameId === gameId);
  }

  async getPlayerBombCount(playerId: EntityId): Promise<number> {
    return this._playerBombCounts.get(playerId) || 0;
  }

  async cleanup(gameId: EntityId): Promise<void> {
    console.log(`💣 Cleaning up bombs for game: ${gameId}`);
    
    // Clean up bombs for this game
    for (const [bombId, bomb] of this._activeBombs.entries()) {
      if (bomb.gameId === gameId) {
        const timer = this._explosionTimers.get(bombId);
        if (timer) {
          clearTimeout(timer);
          this._explosionTimers.delete(bombId);
        }
        this._activeBombs.delete(bombId);
        
        // Update player bomb count
        const currentCount = this._playerBombCounts.get(bomb.playerId) || 1;
        this._playerBombCounts.set(bomb.playerId, Math.max(0, currentCount - 1));
      }
    }

    // Clean up explosions for this game
    for (const [explosionId, explosion] of this._activeExplosions.entries()) {
      if (explosion.gameId === gameId) {
        this._activeExplosions.delete(explosionId);
      }
    }
  }

  private calculateExplosionPattern(center: { x: number; y: number }, radius: number): Array<{ x: number; y: number }> {
    const cells: Array<{ x: number; y: number }> = [center]; // Include center cell
    
    // Add horizontal line (left and right)
    for (let i = 1; i <= radius; i++) {
      cells.push({ x: center.x - i, y: center.y }); // Left
      cells.push({ x: center.x + i, y: center.y }); // Right
    }
    
    // Add vertical line (up and down)
    for (let i = 1; i <= radius; i++) {
      cells.push({ x: center.x, y: center.y - i }); // Up
      cells.push({ x: center.x, y: center.y + i }); // Down
    }
    
    return cells;
  }
}

/**
 * Factory function to create BombManager instance
 */
export function createBombManager(eventBus: EventBus): BombManagerImpl {
  return new BombManagerImpl(eventBus);
}