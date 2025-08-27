/**
 * Game Event Handler - Specialized event handling for game-related events
 * Extends the unified EventBus for game-specific functionality
 */

import { EntityId } from '../../types/common';
import { UniversalEvent, EventCategory, GameEventData } from '../../types/events';
import { EventBus, EventHandler, SubscriptionResult, EventPublishResult } from '../core/EventBus';
import { Game, GameState, PlayerGameState } from '../../types/game';
import { Position, Direction } from '../../types/common';

/**
 * Game-specific event types
 */
export enum GameEventType {
  // Player actions
  PLAYER_MOVE = 'player_move',
  PLAYER_BOMB_PLACE = 'player_bomb_place',
  PLAYER_POWERUP_COLLECT = 'player_powerup_collect',
  PLAYER_ELIMINATED = 'player_eliminated',
  PLAYER_RESPAWNED = 'player_respawned',
  
  // Game mechanics
  BOMB_EXPLODED = 'bomb_exploded',
  WALL_DESTROYED = 'wall_destroyed',
  POWERUP_SPAWNED = 'powerup_spawned',
  MONSTER_SPAWNED = 'monster_spawned',
  MONSTER_ELIMINATED = 'monster_eliminated',
  
  // Game state
  GAME_STARTED = 'game_started',
  GAME_PAUSED = 'game_paused',
  GAME_RESUMED = 'game_resumed',
  GAME_ENDED = 'game_ended',
  ROUND_STARTED = 'round_started',
  ROUND_ENDED = 'round_ended',
  
  // Objectives
  GATE_REVEALED = 'gate_revealed',
  GATE_DESTROYED = 'gate_destroyed',
  BOSS_SPAWNED = 'boss_spawned',
  BOSS_PHASE_CHANGE = 'boss_phase_change',
  BOSS_DEFEATED = 'boss_defeated',
  OBJECTIVE_COMPLETED = 'objective_completed',
  
  // Team events
  FRIENDLY_FIRE = 'friendly_fire',
  TEAM_VICTORY = 'team_victory',
  TEAM_DEFEAT = 'team_defeat'
}

/**
 * Specialized event data interfaces
 */
export interface PlayerMoveEventData {
  playerId: EntityId;
  gameId: EntityId;
  fromPosition: Position;
  toPosition: Position;
  direction: Direction;
  timestamp: number;
  inputSequence: number;
}

export interface BombPlaceEventData {
  playerId: EntityId;
  gameId: EntityId;
  bombId: EntityId;
  position: Position;
  blastRadius: number;
  timer: number;
  timestamp: number;
}

export interface BombExplodeEventData {
  bombId: EntityId;
  gameId: EntityId;
  ownerId: EntityId;
  position: Position;
  affectedTiles: Position[];
  destroyedWalls: Position[];
  damagedEntities: EntityId[];
  chainReaction?: EntityId[];
  timestamp: number;
}

export interface PowerUpCollectEventData {
  playerId: EntityId;
  gameId: EntityId;
  powerUpId: EntityId;
  powerUpType: string;
  position: Position;
  newAbilities: any;
  timestamp: number;
}

export interface PlayerEliminatedEventData {
  playerId: EntityId;
  gameId: EntityId;
  cause: string;
  killerEntityId?: EntityId;
  deathPosition: Position;
  respawnTimer: number;
  lostPowerUps?: string[];
  timestamp: number;
}

export interface GameStateUpdateEventData {
  gameId: EntityId;
  deltaUpdate: boolean;
  players: PlayerGameState[];
  bombs: any[];
  powerUps: any[];
  monsters: any[];
  mazeChanges: any[];
  objectives: any[];
  frameNumber: number;
  timestamp: number;
}

/**
 * Game Event Handler interface extending EventBus
 */
export interface GameEventHandler {
  /** Reference to underlying event bus */
  readonly eventBus: EventBus;

  // Player Action Events

  /**
   * Publish player movement event
   * @param data - Player movement data
   * @returns Promise resolving to publish result
   */
  publishPlayerMove(data: PlayerMoveEventData): Promise<EventPublishResult>;

  /**
   * Publish bomb placement event
   * @param data - Bomb placement data
   * @returns Promise resolving to publish result
   */
  publishBombPlace(data: BombPlaceEventData): Promise<EventPublishResult>;

  /**
   * Publish power-up collection event
   * @param data - Power-up collection data
   * @returns Promise resolving to publish result
   */
  publishPowerUpCollect(data: PowerUpCollectEventData): Promise<EventPublishResult>;

  // Game Mechanics Events

  /**
   * Publish bomb explosion event
   * @param data - Bomb explosion data
   * @returns Promise resolving to publish result
   */
  publishBombExplode(data: BombExplodeEventData): Promise<EventPublishResult>;

  /**
   * Publish player elimination event
   * @param data - Player elimination data
   * @returns Promise resolving to publish result
   */
  publishPlayerEliminated(data: PlayerEliminatedEventData): Promise<EventPublishResult>;

  /**
   * Publish game state update (delta or full)
   * @param data - Game state data
   * @returns Promise resolving to publish result
   */
  publishGameStateUpdate(data: GameStateUpdateEventData): Promise<EventPublishResult>;

  // Game Lifecycle Events

  /**
   * Publish game started event
   * @param gameId - Game identifier
   * @param gameData - Game initialization data
   * @returns Promise resolving to publish result
   */
  publishGameStarted(gameId: EntityId, gameData: Game): Promise<EventPublishResult>;

  /**
   * Publish game ended event
   * @param gameId - Game identifier
   * @param result - Game result data
   * @returns Promise resolving to publish result
   */
  publishGameEnded(gameId: EntityId, result: any): Promise<EventPublishResult>;

  // Subscription Methods

  /**
   * Subscribe to all events for a specific game
   * @param gameId - Game to subscribe to
   * @param handler - Event handler function
   * @returns Promise resolving to subscription result
   */
  subscribeToGame(gameId: EntityId, handler: EventHandler<GameEventData>): Promise<SubscriptionResult>;

  /**
   * Subscribe to player-specific events within a game
   * @param gameId - Game identifier
   * @param playerId - Player identifier
   * @param handler - Event handler function
   * @returns Promise resolving to subscription result
   */
  subscribeToPlayerEvents(
    gameId: EntityId, 
    playerId: EntityId, 
    handler: EventHandler<GameEventData>
  ): Promise<SubscriptionResult>;

  /**
   * Subscribe to specific game event types
   * @param gameId - Game identifier
   * @param eventTypes - Event types to subscribe to
   * @param handler - Event handler function
   * @returns Promise resolving to subscription result
   */
  subscribeToGameEventTypes(
    gameId: EntityId, 
    eventTypes: GameEventType[], 
    handler: EventHandler<GameEventData>
  ): Promise<SubscriptionResult>;

  /**
   * Subscribe to team events for cooperative gameplay
   * @param gameId - Game identifier
   * @param teamId - Team identifier (or player IDs for team)
   * @param handler - Event handler function
   * @returns Promise resolving to subscription result
   */
  subscribeToTeamEvents(
    gameId: EntityId, 
    teamId: string, 
    handler: EventHandler<GameEventData>
  ): Promise<SubscriptionResult>;

  // Broadcast Methods

  /**
   * Broadcast event to all players in game
   * @param gameId - Game identifier
   * @param eventType - Event type
   * @param data - Event data
   * @returns Promise resolving to publish result
   */
  broadcastToGame(
    gameId: EntityId, 
    eventType: GameEventType, 
    data: any
  ): Promise<EventPublishResult>;

  /**
   * Broadcast to specific players in game
   * @param gameId - Game identifier
   * @param playerIds - Target player IDs
   * @param eventType - Event type
   * @param data - Event data
   * @returns Promise resolving to publish result
   */
  broadcastToPlayers(
    gameId: EntityId, 
    playerIds: EntityId[], 
    eventType: GameEventType, 
    data: any
  ): Promise<EventPublishResult>;

  /**
   * Broadcast to players within radius of position (for proximity events)
   * @param gameId - Game identifier
   * @param center - Center position
   * @param radius - Radius in tiles
   * @param eventType - Event type
   * @param data - Event data
   * @returns Promise resolving to publish result
   */
  broadcastToRadius(
    gameId: EntityId, 
    center: Position, 
    radius: number, 
    eventType: GameEventType, 
    data: any
  ): Promise<EventPublishResult>;

  // Game State Management

  /**
   * Get current game state from events
   * @param gameId - Game identifier
   * @returns Promise resolving to current game state
   */
  getCurrentGameState(gameId: EntityId): Promise<GameState>;

  /**
   * Replay game events from a specific point in time
   * @param gameId - Game identifier
   * @param fromTimestamp - Starting timestamp
   * @param handler - Event handler for replay
   * @returns Promise that resolves when replay is complete
   */
  replayGameEvents(
    gameId: EntityId, 
    fromTimestamp: number, 
    handler: EventHandler<GameEventData>
  ): Promise<void>;

  /**
   * Get game event history for debugging/analysis
   * @param gameId - Game identifier
   * @param eventTypes - Optional filter by event types
   * @param timeRange - Optional time range
   * @returns Promise resolving to event history
   */
  getGameEventHistory(
    gameId: EntityId, 
    eventTypes?: GameEventType[], 
    timeRange?: { start: Date; end: Date }
  ): Promise<UniversalEvent<GameEventData>[]>;

  // Performance Optimization

  /**
   * Enable event batching for high-frequency updates
   * @param gameId - Game identifier
   * @param batchSize - Maximum batch size
   * @param batchTimeoutMs - Maximum batch timeout
   * @returns Promise that resolves when enabled
   */
  enableEventBatching(
    gameId: EntityId, 
    batchSize: number, 
    batchTimeoutMs: number
  ): Promise<void>;

  /**
   * Set event priority for different event types
   * @param eventTypePriorities - Map of event types to priorities
   * @returns Promise that resolves when priorities are set
   */
  setEventPriorities(eventTypePriorities: Map<GameEventType, number>): Promise<void>;

  /**
   * Configure event compression for bandwidth optimization
   * @param gameId - Game identifier
   * @param compressionLevel - Compression level (0-9)
   * @returns Promise that resolves when configured
   */
  configureEventCompression(gameId: EntityId, compressionLevel: number): Promise<void>;
}

/**
 * Game Event Handler factory function
 */
export type GameEventHandlerFactory = (eventBus: EventBus) => GameEventHandler;