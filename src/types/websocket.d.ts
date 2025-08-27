/**
 * WebSocket message protocols and real-time communication types.
 * Defines message formats for client-server communication.
 */

import { EntityId, Timestamp, Position, Direction, AnimationState } from './common';
import { Room, RoomSettings, RoomPlayer, ChatMessage } from './room';
import { Game, GameState, PlayerGameState, Bomb, PowerUp, Monster, Boss, Gate, ObjectiveStatus } from './game';
import { Player, DeviceInfo } from './player';
import { AdminAction, SystemMetrics } from './admin';

/**
 * WebSocket message types
 */
export enum MessageType {
  // Connection Management
  CONNECT = 'connect',
  DISCONNECT = 'disconnect',
  PING = 'ping',
  PONG = 'pong',
  ACK = 'ack',
  ERROR = 'error',

  // Authentication
  AUTH_REQUEST = 'auth_request',
  AUTH_RESPONSE = 'auth_response',
  SESSION_EXPIRED = 'session_expired',

  // Room Management
  ROOM_CREATE = 'room_create',
  ROOM_JOIN = 'room_join',
  ROOM_LEAVE = 'room_leave',
  ROOM_UPDATE = 'room_update',
  ROOM_CLOSED = 'room_closed',
  ROOM_LIST = 'room_list',

  // Lobby Management
  LOBBY_STATE = 'lobby_state',
  PLAYER_READY = 'player_ready',
  PLAYER_JOINED = 'player_joined',
  PLAYER_LEFT = 'player_left',
  CHAT_MESSAGE = 'chat_message',
  SETTINGS_UPDATE = 'settings_update',

  // Game Management
  GAME_START = 'game_start',
  GAME_END = 'game_end',
  GAME_PAUSE = 'game_pause',
  GAME_RESUME = 'game_resume',
  GAME_STATE = 'game_state',

  // Player Actions
  PLAYER_MOVE = 'player_move',
  PLAYER_BOMB = 'player_bomb',
  PLAYER_ACTION = 'player_action',
  PLAYER_INPUT = 'player_input',

  // Game Events
  BOMB_PLACED = 'bomb_placed',
  BOMB_EXPLODED = 'bomb_exploded',
  WALL_DESTROYED = 'wall_destroyed',
  POWERUP_SPAWNED = 'powerup_spawned',
  POWERUP_COLLECTED = 'powerup_collected',
  PLAYER_DIED = 'player_died',
  PLAYER_RESPAWNED = 'player_respawned',
  MONSTER_SPAWNED = 'monster_spawned',
  MONSTER_DIED = 'monster_died',
  BOSS_SPAWNED = 'boss_spawned',
  BOSS_PHASE_CHANGE = 'boss_phase_change',
  GATE_REVEALED = 'gate_revealed',
  GATE_DESTROYED = 'gate_destroyed',
  OBJECTIVE_UPDATE = 'objective_update',

  // Admin Messages
  ADMIN_ACTION = 'admin_action',
  ADMIN_WARNING = 'admin_warning',
  SYSTEM_MESSAGE = 'system_message',
  MAINTENANCE_MODE = 'maintenance_mode'
}

/**
 * Message priority levels
 */
export enum MessagePriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * Base WebSocket message format
 */
export interface WebSocketMessage {
  /** Unique message identifier */
  id: EntityId;
  /** Message category */
  type: MessageType;
  /** Message timestamp */
  timestamp: Timestamp;
  /** Sender identifier (if applicable) */
  senderId?: EntityId;
  /** Target room (if applicable) */
  roomId?: EntityId;
  /** Message-specific data */
  payload: any;
  /** Requires acknowledgment */
  ack?: boolean;
  /** Protocol version */
  version: string;
}

/**
 * Error codes for WebSocket communication
 */
export enum ErrorCode {
  INVALID_MESSAGE = 'invalid_message',
  AUTHENTICATION_FAILED = 'authentication_failed',
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
  ROOM_NOT_FOUND = 'room_not_found',
  ROOM_FULL = 'room_full',
  PERMISSION_DENIED = 'permission_denied',
  GAME_NOT_ACTIVE = 'game_not_active',
  INVALID_ACTION = 'invalid_action',
  SERVER_ERROR = 'server_error',
  MAINTENANCE_MODE = 'maintenance_mode'
}

/**
 * Connection establishment message
 */
export interface ConnectMessage {
  /** Existing player ID */
  playerId?: EntityId;
  /** Authentication token */
  sessionToken?: string;
  /** Client device information */
  deviceInfo: DeviceInfo;
  /** WebSocket protocol version */
  protocolVersion: string;
}

/**
 * Connection response
 */
export interface ConnectResponse {
  /** Connection successful */
  success: boolean;
  /** Assigned/existing player ID */
  playerId: EntityId;
  /** New session identifier */
  sessionId: EntityId;
  /** Server information */
  serverInfo: ServerInfo;
  /** Error message (if failed) */
  error?: string;
}

/**
 * Server information
 */
export interface ServerInfo {
  /** Server version */
  version: string;
  /** Server region */
  region: string;
  /** Server capacity */
  maxPlayers: number;
  /** Supported features */
  features: string[];
}

/**
 * Ping message for latency measurement
 */
export interface PingMessage {
  /** Ping timestamp */
  timestamp: Timestamp;
  /** Client-side timestamp */
  clientTime: number;
}

/**
 * Pong response
 */
export interface PongMessage {
  /** Pong timestamp */
  timestamp: Timestamp;
  /** Original ping timestamp */
  pingTimestamp: Timestamp;
  /** Server-side timestamp */
  serverTime: number;
}

/**
 * Error message
 */
export interface ErrorMessage {
  /** Error category */
  code: ErrorCode;
  /** Human-readable message */
  message: string;
  /** Additional error details */
  details?: any;
  /** Connection should close */
  fatal: boolean;
}

/**
 * Room creation message
 */
export interface RoomCreateMessage {
  /** Room host player ID */
  hostId: EntityId;
  /** Room configuration */
  settings: RoomSettings;
  /** Optional room name */
  name?: string;
}

/**
 * Room creation response
 */
export interface RoomCreateResponse {
  /** Room creation successful */
  success: boolean;
  /** Created room details */
  room?: Room;
  /** Error message (if failed) */
  error?: string;
}

/**
 * Room join message
 */
export interface RoomJoinMessage {
  /** Target room ID */
  roomId: EntityId;
  /** Joining player ID */
  playerId: EntityId;
  /** Player display name */
  playerName: string;
  /** Room password (if required) */
  password?: string;
}

/**
 * Room join response
 */
export interface RoomJoinResponse {
  /** Join successful */
  success: boolean;
  /** Room details */
  room?: Room;
  /** Assigned lobby position */
  playerPosition?: number;
  /** Error message (if failed) */
  error?: string;
}

/**
 * Room update types
 */
export enum RoomUpdateType {
  PLAYER_JOINED = 'player_joined',
  PLAYER_LEFT = 'player_left',
  PLAYER_READY = 'player_ready',
  SETTINGS_CHANGED = 'settings_changed',
  HOST_CHANGED = 'host_changed',
  GAME_STARTING = 'game_starting',
  GAME_STARTED = 'game_started',
  GAME_ENDED = 'game_ended'
}

/**
 * Room update message
 */
export interface RoomUpdateMessage {
  /** Target room */
  roomId: EntityId;
  /** Update category */
  updateType: RoomUpdateType;
  /** Update-specific data */
  data: any;
}

/**
 * Game state synchronization message
 */
export interface GameStateMessage {
  /** Game identifier */
  gameId: EntityId;
  /** State timestamp */
  timestamp: Timestamp;
  /** Game frame/tick number */
  frameNumber: number;
  /** Player states */
  players: PlayerStateUpdate[];
  /** Active bombs */
  bombs: BombStateUpdate[];
  /** Available power-ups */
  powerups: PowerUpStateUpdate[];
  /** Monster states */
  monsters: MonsterStateUpdate[];
  /** Maze changes */
  maze: MazeStateUpdate;
  /** Current objectives */
  objectives: ObjectiveStateUpdate;
  /** Only changed data included */
  deltaOnly: boolean;
}

/**
 * Player state update
 */
export interface PlayerStateUpdate {
  /** Player identifier */
  playerId: EntityId;
  /** Current position */
  position: Position;
  /** Facing direction */
  direction: Direction;
  /** Current health */
  health: number;
  /** Alive status */
  alive: boolean;
  /** Current abilities */
  abilities: PlayerAbilities;
  /** Current animation */
  animation?: AnimationState;
  /** Recent action */
  lastAction?: PlayerAction;
}

/**
 * Bomb state update
 */
export interface BombStateUpdate {
  /** Bomb identifier */
  bombId: EntityId;
  /** Player who placed bomb */
  ownerId: EntityId;
  /** Bomb location */
  position: Position;
  /** Time until explosion (milliseconds) */
  timer: number;
  /** Explosion radius */
  blastRadius: number;
  /** Current bomb status */
  status: BombStatus;
}

/**
 * Power-up state update
 */
export interface PowerUpStateUpdate {
  /** Power-up identifier */
  powerupId: EntityId;
  /** Power-up category */
  type: PowerUpType;
  /** World location */
  position: Position;
  /** Can be collected */
  available: boolean;
  /** Auto-removal time */
  expiresAt?: Timestamp;
}

/**
 * Monster state update
 */
export interface MonsterStateUpdate {
  /** Monster identifier */
  monsterId: EntityId;
  /** Monster category */
  type: MonsterType;
  /** Current position */
  position: Position;
  /** Current health */
  health: number;
  /** Current status */
  status: MonsterStatus;
  /** Target player ID */
  target?: EntityId;
  /** Current animation */
  animation?: AnimationState;
}

/**
 * Maze state changes
 */
export interface MazeStateUpdate {
  /** Modified tiles */
  changes: TileChange[];
  /** New power-up locations */
  newPowerupSpots?: Position[];
  /** Newly revealed gates */
  revealedGates?: Gate[];
  /** Destroyed gate IDs */
  destroyedGates?: EntityId[];
}

/**
 * Tile modification
 */
export interface TileChange {
  /** Tile location */
  position: Position;
  /** Previous tile type */
  oldType: TileType;
  /** New tile type */
  newType: TileType;
  /** Change timestamp */
  timestamp: Timestamp;
}

/**
 * Objective status update
 */
export interface ObjectiveStateUpdate {
  /** Current objective status */
  current: ObjectiveStatus;
  /** Objective completed */
  completed: boolean;
  /** Objective failed */
  failed: boolean;
  /** Next objective (if any) */
  next?: ObjectiveStatus;
  /** Team progress percentage */
  teamProgress: number;
}

/**
 * Player movement message
 */
export interface PlayerMoveMessage {
  /** Moving player */
  playerId: EntityId;
  /** Movement direction */
  direction: Direction;
  /** Movement start point */
  startPosition: Position;
  /** Input timestamp */
  timestamp: Timestamp;
  /** Input sequence number */
  inputSequence: number;
}

/**
 * Player bomb placement message
 */
export interface PlayerBombMessage {
  /** Player placing bomb */
  playerId: EntityId;
  /** Bomb placement location */
  position: Position;
  /** Action timestamp */
  timestamp: Timestamp;
  /** Input sequence number */
  inputSequence: number;
}

/**
 * Player action types
 */
export enum PlayerActionType {
  MOVE_START = 'move_start',
  MOVE_STOP = 'move_stop',
  PLACE_BOMB = 'place_bomb',
  USE_ITEM = 'use_item',
  INTERACT = 'interact',
  SPRINT = 'sprint',
  TAUNT = 'taunt',
  CHAT = 'chat'
}

/**
 * Generic player action message
 */
export interface PlayerActionMessage {
  /** Acting player */
  playerId: EntityId;
  /** Action category */
  action: PlayerActionType;
  /** Action target (if applicable) */
  target?: EntityId;
  /** Action location (if applicable) */
  position?: Position;
  /** Action-specific data */
  data?: any;
  /** Action timestamp */
  timestamp: Timestamp;
  /** Input sequence number */
  inputSequence: number;
}

/**
 * Input synchronization message
 */
export interface InputSyncMessage {
  /** Player identifier */
  playerId: EntityId;
  /** Current input state */
  inputState: InputState;
  /** Input timestamp */
  timestamp: Timestamp;
  /** Estimated network latency */
  latency: number;
}

/**
 * Bomb placement event
 */
export interface BombPlacedMessage {
  /** New bomb identifier */
  bombId: EntityId;
  /** Player who placed bomb */
  playerId: EntityId;
  /** Bomb location */
  position: Position;
  /** Explosion radius */
  blastRadius: number;
  /** Explosion timer (milliseconds) */
  timer: number;
}

/**
 * Bomb explosion event
 */
export interface BombExplodedMessage {
  /** Exploded bomb */
  bombId: EntityId;
  /** Explosion center */
  position: Position;
  /** Tiles in blast radius */
  affectedTiles: Position[];
  /** Explosion damage */
  damage: number;
  /** Walls destroyed */
  destroyedWalls: Position[];
  /** Entities hit */
  damagedEntities: EntityDamage[];
  /** Other bombs triggered */
  chainReaction?: EntityId[];
}

/**
 * Entity types for damage events
 */
export enum EntityType {
  PLAYER = 'player',
  MONSTER = 'monster',
  BOSS = 'boss',
  DESTRUCTIBLE = 'destructible'
}

/**
 * Entity damage information
 */
export interface EntityDamage {
  /** Damaged entity */
  entityId: EntityId;
  /** Entity category */
  entityType: EntityType;
  /** Damage amount */
  damage: number;
  /** Health after damage */
  newHealth: number;
  /** Entity destroyed */
  eliminated: boolean;
}

/**
 * Power-up collection event
 */
export interface PowerUpCollectedMessage {
  /** Collected power-up */
  powerupId: EntityId;
  /** Collecting player */
  playerId: EntityId;
  /** Power-up category */
  powerupType: PowerUpType;
  /** Applied effect */
  effect: PowerUpEffect;
  /** Updated player abilities */
  newAbilities: PlayerAbilities;
}

/**
 * Player elimination event
 */
export interface PlayerDeathMessage {
  /** Eliminated player */
  playerId: EntityId;
  /** How player died */
  cause: DeathCause;
  /** Entity that caused death */
  killerEntity?: EntityId;
  /** Where player died */
  deathPosition: Position;
  /** Respawn countdown (milliseconds) */
  respawnTimer: number;
  /** Power-ups lost on death */
  lostPowerups?: PowerUpType[];
}

/**
 * Admin action types
 */
export enum AdminActionType {
  KICK_PLAYER = 'kick_player',
  BAN_PLAYER = 'ban_player',
  MUTE_PLAYER = 'mute_player',
  TERMINATE_ROOM = 'terminate_room',
  BROADCAST_MESSAGE = 'broadcast_message',
  MAINTENANCE_MODE = 'maintenance_mode',
  FORCE_UPDATE = 'force_update',
  SERVER_SHUTDOWN = 'server_shutdown'
}

/**
 * Admin action message
 */
export interface AdminActionMessage {
  /** Acting administrator */
  adminId: EntityId;
  /** Action category */
  action: AdminActionType;
  /** Target entity ID */
  targetId?: EntityId;
  /** Target room (if applicable) */
  roomId?: EntityId;
  /** Action reason */
  reason?: string;
  /** Action-specific data */
  data?: any;
  /** Broadcast to all players */
  broadcast: boolean;
}

/**
 * System message severity
 */
export enum SystemMessageSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical'
}

/**
 * System message categories
 */
export enum SystemMessageCategory {
  MAINTENANCE = 'maintenance',
  UPDATE = 'update',
  SECURITY = 'security',
  POLICY = 'policy',
  PERFORMANCE = 'performance'
}

/**
 * System action types
 */
export enum SystemActionType {
  UPDATE_CLIENT = 'update_client',
  RECONNECT = 'reconnect',
  READ_ANNOUNCEMENT = 'read_announcement',
  ACCEPT_TERMS = 'accept_terms',
  VERIFY_ACCOUNT = 'verify_account'
}

/**
 * Required system action
 */
export interface SystemAction {
  /** Action category */
  type: SystemActionType;
  /** Action mandatory */
  required: boolean;
  /** Action deadline */
  deadline?: Timestamp;
  /** Action URL */
  url?: string;
}

/**
 * System message
 */
export interface SystemMessageMessage {
  /** Message importance */
  severity: SystemMessageSeverity;
  /** Message type */
  category: SystemMessageCategory;
  /** Message title */
  title: string;
  /** Message body */
  content: string;
  /** Required action */
  action?: SystemAction;
  /** Message expiry */
  expiresAt?: Timestamp;
  /** Specific recipients */
  targetPlayers?: EntityId[];
}

/**
 * Message acknowledgment
 */
export interface AckMessage {
  /** Message being acknowledged */
  originalMessageId: EntityId;
  /** Processing successful */
  success: boolean;
  /** Error message (if failed) */
  error?: string;
  /** Response data */
  data?: any;
  /** Acknowledgment timestamp */
  timestamp: Timestamp;
}

/**
 * Message metadata for routing and processing
 */
export interface MessageMetadata {
  /** Message identifier */
  messageId: EntityId;
  /** Message priority */
  priority: MessagePriority;
  /** Guaranteed delivery */
  reliable: boolean;
  /** Use compression */
  compress: boolean;
  /** Use encryption */
  encrypt: boolean;
  /** Time to live (milliseconds) */
  ttl?: number;
  /** Retry attempts */
  retryCount: number;
}

// Import and re-export types from other modules for convenience
export type {
  PlayerAbilities,
  InputState,
  BombStatus,
  PowerUpType,
  PowerUpEffect,
  MonsterType,
  MonsterStatus,
  TileType,
  DeathCause,
  PlayerAction
} from './game';

export type { ObjectiveStatus } from './game';