/**
 * PlayerStateManager Implementation
 * Manages player positions, health, abilities, and state synchronization
 */

import type { EventBus } from '../../interfaces/core/EventBus';
import type { EntityId } from '../../types/common';

// Player states and constants
const DEFAULT_PLAYER_HEALTH = 100;
const DEFAULT_MOVEMENT_SPEED = 2.0;
const RESPAWN_DELAY = 10000; // 10 seconds
const INVINCIBILITY_FRAMES = 1000; // 1 second after respawn

type PlayerStatus = 'alive' | 'dead' | 'respawning' | 'spectating';
type PlayerDirection = 'up' | 'down' | 'left' | 'right' | 'idle';

interface PlayerState {
  playerId: EntityId;
  gameId: EntityId;
  position: { x: number; y: number };
  previousPosition: { x: number; y: number };
  direction: PlayerDirection;
  status: PlayerStatus;
  health: number;
  maxHealth: number;
  movementSpeed: number;
  isInvincible: boolean;
  invincibilityUntil?: Date;
  lastMovement: Date;
  lastBombPlace?: Date;
  respawnAt?: Date;
  deaths: number;
  bombsPlaced: number;
  wallsDestroyed: number;
  powerUpsCollected: number;
  connectedAt: Date;
  lastUpdate: Date;
}

interface MovementUpdate {
  playerId: EntityId;
  position: { x: number; y: number };
  direction: PlayerDirection;
  timestamp: Date;
}

interface PlayerSpawnInfo {
  position: { x: number; y: number };
  corner: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  safeArea: Array<{ x: number; y: number }>;
}

class PlayerStateManagerImpl {
  readonly eventBus: EventBus;
  private readonly _playerStates = new Map<EntityId, PlayerState>();
  private readonly _gamePlayerLists = new Map<EntityId, Set<EntityId>>();
  private readonly _respawnTimers = new Map<EntityId, NodeJS.Timeout>();

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
    console.log('🚶 PlayerStateManager created');
  }

  async initialize(): Promise<void> {
    console.log('🚶 PlayerStateManager initialized');
  }

  async addPlayer(playerId: EntityId, gameId: EntityId, spawnInfo: PlayerSpawnInfo): Promise<PlayerState> {
    const playerState: PlayerState = {
      playerId,
      gameId,
      position: spawnInfo.position,
      previousPosition: spawnInfo.position,
      direction: 'idle',
      status: 'alive',
      health: DEFAULT_PLAYER_HEALTH,
      maxHealth: DEFAULT_PLAYER_HEALTH,
      movementSpeed: DEFAULT_MOVEMENT_SPEED,
      isInvincible: true, // Brief invincibility when spawning
      invincibilityUntil: new Date(Date.now() + INVINCIBILITY_FRAMES),
      lastMovement: new Date(),
      deaths: 0,
      bombsPlaced: 0,
      wallsDestroyed: 0,
      powerUpsCollected: 0,
      connectedAt: new Date(),
      lastUpdate: new Date(),
    };

    this._playerStates.set(playerId, playerState);
    
    // Add to game player list
    let gamePlayerList = this._gamePlayerLists.get(gameId);
    if (!gamePlayerList) {
      gamePlayerList = new Set();
      this._gamePlayerLists.set(gameId, gamePlayerList);
    }
    gamePlayerList.add(playerId);

    console.log(`🚶 Player added: ${playerId} at (${spawnInfo.position.x}, ${spawnInfo.position.y})`);
    return playerState;
  }

  async updatePlayerPosition(update: MovementUpdate): Promise<boolean> {
    const playerState = this._playerStates.get(update.playerId);
    if (!playerState || playerState.status !== 'alive') {
      return false;
    }

    playerState.previousPosition = { ...playerState.position };
    playerState.position = update.position;
    playerState.direction = update.direction;
    playerState.lastMovement = update.timestamp;
    playerState.lastUpdate = new Date();

    console.log(`🚶 Player ${update.playerId} moved to (${update.position.x}, ${update.position.y})`);
    return true;
  }

  async damagePlayer(playerId: EntityId, damage: number): Promise<{ died: boolean; newHealth: number }> {
    const playerState = this._playerStates.get(playerId);
    if (!playerState || playerState.status !== 'alive' || playerState.isInvincible) {
      return { died: false, newHealth: playerState?.health || 0 };
    }

    playerState.health = Math.max(0, playerState.health - damage);
    playerState.lastUpdate = new Date();

    if (playerState.health <= 0) {
      await this.eliminatePlayer(playerId);
      return { died: true, newHealth: 0 };
    }

    console.log(`🚶 Player ${playerId} damaged: ${damage} (health: ${playerState.health})`);
    return { died: false, newHealth: playerState.health };
  }

  async eliminatePlayer(playerId: EntityId): Promise<boolean> {
    const playerState = this._playerStates.get(playerId);
    if (!playerState || playerState.status === 'dead') {
      return false;
    }

    playerState.status = 'dead';
    playerState.health = 0;
    playerState.deaths++;
    playerState.respawnAt = new Date(Date.now() + RESPAWN_DELAY);
    playerState.lastUpdate = new Date();

    // Schedule respawn
    const respawnTimer = setTimeout(() => {
      this.respawnPlayer(playerId).catch(console.error);
    }, RESPAWN_DELAY);
    
    this._respawnTimers.set(playerId, respawnTimer);

    console.log(`🚶 Player eliminated: ${playerId} (respawn in ${RESPAWN_DELAY}ms)`);
    return true;
  }

  async respawnPlayer(playerId: EntityId): Promise<boolean> {
    const playerState = this._playerStates.get(playerId);
    if (!playerState || playerState.status !== 'dead') {
      return false;
    }

    // Find available spawn position (corner positions)
    const spawnPosition = await this.findRespawnPosition(playerState.gameId);
    if (!spawnPosition) {
      // Schedule another respawn attempt
      const respawnTimer = setTimeout(() => {
        this.respawnPlayer(playerId).catch(console.error);
      }, 2000);
      this._respawnTimers.set(playerId, respawnTimer);
      return false;
    }

    playerState.status = 'alive';
    playerState.health = DEFAULT_PLAYER_HEALTH;
    playerState.position = spawnPosition;
    playerState.previousPosition = spawnPosition;
    playerState.direction = 'idle';
    playerState.isInvincible = true;
    playerState.invincibilityUntil = new Date(Date.now() + INVINCIBILITY_FRAMES);
    playerState.respawnAt = undefined;
    playerState.lastUpdate = new Date();

    // Clear respawn timer
    const timer = this._respawnTimers.get(playerId);
    if (timer) {
      clearTimeout(timer);
      this._respawnTimers.delete(playerId);
    }

    console.log(`🚶 Player respawned: ${playerId} at (${spawnPosition.x}, ${spawnPosition.y})`);
    return true;
  }

  async getPlayerState(playerId: EntityId): Promise<PlayerState | null> {
    const state = this._playerStates.get(playerId);
    
    // Update invincibility status
    if (state?.isInvincible && state.invincibilityUntil && 
        new Date() > state.invincibilityUntil) {
      state.isInvincible = false;
      state.invincibilityUntil = undefined;
    }
    
    return state || null;
  }

  async getPlayersInGame(gameId: EntityId): Promise<PlayerState[]> {
    const playerIds = this._gamePlayerLists.get(gameId);
    if (!playerIds) return [];

    const players: PlayerState[] = [];
    for (const playerId of playerIds) {
      const state = await this.getPlayerState(playerId);
      if (state) players.push(state);
    }

    return players;
  }

  async updatePlayerStats(playerId: EntityId, stats: Partial<Pick<PlayerState, 'bombsPlaced' | 'wallsDestroyed' | 'powerUpsCollected'>>): Promise<void> {
    const playerState = this._playerStates.get(playerId);
    if (!playerState) return;

    if (stats.bombsPlaced !== undefined) playerState.bombsPlaced += stats.bombsPlaced;
    if (stats.wallsDestroyed !== undefined) playerState.wallsDestroyed += stats.wallsDestroyed;
    if (stats.powerUpsCollected !== undefined) playerState.powerUpsCollected += stats.powerUpsCollected;
    
    playerState.lastUpdate = new Date();
  }

  async removePlayer(playerId: EntityId): Promise<boolean> {
    const playerState = this._playerStates.get(playerId);
    if (!playerState) return false;

    // Clear respawn timer if exists
    const timer = this._respawnTimers.get(playerId);
    if (timer) {
      clearTimeout(timer);
      this._respawnTimers.delete(playerId);
    }

    // Remove from game player list
    const gamePlayerList = this._gamePlayerLists.get(playerState.gameId);
    if (gamePlayerList) {
      gamePlayerList.delete(playerId);
      if (gamePlayerList.size === 0) {
        this._gamePlayerLists.delete(playerState.gameId);
      }
    }

    this._playerStates.delete(playerId);
    console.log(`🚶 Player removed: ${playerId}`);
    return true;
  }

  async cleanup(gameId: EntityId): Promise<void> {
    console.log(`🚶 Cleaning up players for game: ${gameId}`);
    
    const playerIds = this._gamePlayerLists.get(gameId);
    if (playerIds) {
      for (const playerId of playerIds) {
        await this.removePlayer(playerId);
      }
    }
  }

  private async findRespawnPosition(gameId: EntityId): Promise<{ x: number; y: number } | null> {
    // TODO: Find safe corner positions, check for obstacles
    // For now, return random corner
    const corners = [
      { x: 1.5, y: 1.5 },
      { x: 13.5, y: 1.5 },
      { x: 1.5, y: 9.5 },
      { x: 13.5, y: 9.5 },
    ];
    
    return corners[Math.floor(Math.random() * corners.length)];
  }
}

export function createPlayerStateManager(eventBus: EventBus): PlayerStateManagerImpl {
  return new PlayerStateManagerImpl(eventBus);
}