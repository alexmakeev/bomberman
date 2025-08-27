/**
 * Room and multiplayer lobby type definitions.
 * Includes room management, lobby state, chat systems, and invitations.
 */

import { EntityId, Timestamp, ValidationResult, PaginatedResponse } from './common';
import { Game, GameMode, DifficultyLevel, PowerUpType, MapSize, MapTheme, MapLayout } from './game';
import { Player, DeviceInfo } from './player';

/**
 * Room status states
 */
export enum RoomStatus {
  WAITING = 'waiting',
  READY = 'ready',
  STARTING = 'starting',
  IN_GAME = 'in_game',
  FINISHED = 'finished',
  CLOSED = 'closed'
}

/**
 * Main room entity for multiplayer sessions
 */
export interface Room {
  /** Unique room identifier */
  id: EntityId;
  /** Shareable room URL */
  url: string;
  /** Optional room name */
  name?: string;
  /** Room creator/host player ID */
  hostId: EntityId;
  /** Players in room */
  players: Map<EntityId, RoomPlayer>;
  /** Room configuration */
  settings: RoomSettings;
  /** Current room status */
  status: RoomStatus;
  /** Lobby management state */
  lobby: LobbyState;
  /** Active game (if started) */
  game?: Game;
  /** Room metadata and statistics */
  metadata: RoomMetadata;
  /** Room creation timestamp */
  createdAt: Timestamp;
  /** Last update timestamp */
  updatedAt: Timestamp;
}

/**
 * Player status within a room
 */
export enum PlayerRoomStatus {
  JOINING = 'joining',
  CONNECTED = 'connected',
  READY = 'ready',
  PLAYING = 'playing',
  SPECTATING = 'spectating',
  DISCONNECTED = 'disconnected',
  LEFT = 'left'
}

/**
 * Player in room context
 */
export interface RoomPlayer {
  /** Player identifier */
  playerId: EntityId;
  /** Display name */
  name: string;
  /** Player status in room */
  status: PlayerRoomStatus;
  /** Has host privileges */
  isHost: boolean;
  /** Room join timestamp */
  joinedAt: Timestamp;
  /** Ready for game start */
  ready: boolean;
  /** Lobby position/slot */
  position?: number;
  /** Team assignment (if applicable) */
  team?: string;
  /** Room-specific preferences */
  preferences: PlayerRoomPreferences;
  /** Connection information */
  connection: ConnectionInfo;
}

/**
 * Player preferences within a room
 */
export interface PlayerRoomPreferences {
  /** Player identifier */
  playerId: EntityId;
  /** Preferred lobby slot */
  preferredPosition?: number;
  /** Auto-ready for next game */
  autoReady: boolean;
  /** Spectate instead of play */
  spectateMode: boolean;
  /** Room event notifications */
  notifications: boolean;
}

/**
 * Player connection status
 */
export interface ConnectionInfo {
  /** WebSocket connection ID */
  connectionId: EntityId;
  /** Connection latency (milliseconds) */
  latency: number;
  /** Connection stability */
  stable: boolean;
  /** Last heartbeat timestamp */
  lastPingAt: Timestamp;
  /** Failed reconnection attempts */
  reconnectAttempts: number;
}

/**
 * Spectator configuration
 */
export interface SpectatorSettings {
  /** Allow non-playing observers */
  allowSpectators: boolean;
  /** Maximum spectator count */
  maxSpectators: number;
  /** Spectators can use chat */
  spectatorChat: boolean;
  /** Stream delay (milliseconds) */
  spectatorDelay: number;
}

/**
 * Map generation settings
 */
export interface MapSettings {
  /** Map dimensions */
  size: MapSize;
  /** Visual theme */
  theme: MapTheme;
  /** Maze generation pattern */
  layout: MapLayout;
  /** Percentage of destructible walls */
  destructibleWalls: number;
  /** Power-up spawn frequency */
  powerUpDensity: number;
  /** Number of exit gates */
  exitGates: number;
}

/**
 * Power-up spawn configuration
 */
export interface PowerUpSettings {
  /** Spawn frequency multiplier */
  spawnRate: number;
  /** Maximum active power-ups */
  maxActive: number;
  /** Allowed power-up types */
  types: PowerUpType[];
  /** Spawn probability weights */
  rarityWeights: Map<PowerUpType, number>;
}

/**
 * Game timing settings
 */
export interface TimeSettings {
  /** Maximum game duration (milliseconds) */
  gameTimeout: number;
  /** Maximum round duration (milliseconds) */
  roundTimeout: number;
  /** Start countdown duration (seconds) */
  startCountdown: number;
  /** Player respawn time (seconds) */
  respawnTime: number;
}

/**
 * Reconnection policy
 */
export interface ReconnectPolicy {
  /** Allow reconnection */
  allowReconnect: boolean;
  /** Reconnection window (milliseconds) */
  reconnectTimeout: number;
  /** Maximum reconnection attempts */
  maxReconnectAttempts: number;
  /** Preserve progress on reconnect */
  preserveProgress: boolean;
}

/**
 * Room configuration settings
 */
export interface RoomSettings {
  /** Maximum player capacity (2-8) */
  maxPlayers: number;
  /** Minimum players to start (2) */
  minPlayers: number;
  /** Private room (invite only) */
  isPrivate: boolean;
  /** Room password (if protected) */
  password?: string;
  /** Spectator configuration */
  spectators: SpectatorSettings;
  /** Game mode selection */
  gameMode: GameMode;
  /** AI difficulty level */
  difficulty: DifficultyLevel;
  /** Map/level configuration */
  mapSettings: MapSettings;
  /** Power-up spawn rules */
  powerupSettings: PowerUpSettings;
  /** Game timing settings */
  timeSettings: TimeSettings;
  /** Reconnection rules */
  reconnectPolicy: ReconnectPolicy;
}

/**
 * Lobby slot assignment
 */
export interface LobbySlot {
  /** Slot number (0-7) */
  position: number;
  /** Assigned player (if occupied) */
  playerId?: EntityId;
  /** Reserved for specific player */
  reserved: boolean;
  /** Team assignment */
  team?: string;
  /** Player ready status */
  ready: boolean;
}

/**
 * Ready check state
 */
export interface ReadyCheckState {
  /** Ready check active */
  initiated: boolean;
  /** Player who started check */
  initiatedBy: EntityId;
  /** Player responses */
  responses: Map<EntityId, boolean>;
  /** Ready check timeout */
  timeout: Timestamp;
  /** All players must be ready */
  required: boolean;
}

/**
 * Countdown timer state
 */
export interface CountdownTimer {
  /** Countdown active */
  active: boolean;
  /** Countdown start time */
  startTime: Timestamp;
  /** Countdown duration (milliseconds) */
  duration: number;
  /** Time remaining (milliseconds) */
  remaining: number;
  /** Can be cancelled */
  canCancel: boolean;
}

/**
 * Lobby state management
 */
export interface LobbyState {
  /** Associated room ID */
  roomId: EntityId;
  /** Player position slots */
  slots: LobbySlot[];
  /** Chat system */
  chat: ChatSystem;
  /** Ready status tracking */
  readyCheck: ReadyCheckState;
  /** Game start countdown */
  countdown: CountdownTimer;
  /** Pending invitations */
  invitations: RoomInvitation[];
}

/**
 * Chat message types
 */
export enum MessageType {
  USER = 'user',
  SYSTEM = 'system',
  JOIN = 'join',
  LEAVE = 'leave',
  READY = 'ready',
  GAME_START = 'game_start',
  GAME_END = 'game_end'
}

/**
 * Chat message entity
 */
export interface ChatMessage {
  /** Message identifier */
  id: EntityId;
  /** Message sender */
  senderId: EntityId;
  /** Sender display name */
  senderName: string;
  /** Message content */
  content: string;
  /** Message category */
  type: MessageType;
  /** Send timestamp */
  timestamp: Timestamp;
  /** Message was edited */
  edited: boolean;
  /** Message was deleted */
  deleted: boolean;
}

/**
 * Chat system settings
 */
export interface ChatSettings {
  /** Chat enabled */
  enabled: boolean;
  /** Message history limit */
  maxMessages: number;
  /** Maximum message length */
  messageLength: number;
  /** Messages per minute limit */
  rateLimitPerMinute: number;
  /** Filter inappropriate content */
  profanityFilter: boolean;
  /** Allow URL links */
  allowLinks: boolean;
}

/**
 * Chat moderation features
 */
export interface ChatModeration {
  /** Blocked words/phrases */
  wordFilter: string[];
  /** Detect spam patterns */
  spamDetection: boolean;
  /** Muted player IDs */
  mutedPlayers: Set<EntityId>;
  /** Message ID -> reporter IDs */
  reportedMessages: Map<EntityId, EntityId[]>;
}

/**
 * Room chat system
 */
export interface ChatSystem {
  /** Associated room ID */
  roomId: EntityId;
  /** Chat message history */
  messages: ChatMessage[];
  /** Chat configuration */
  settings: ChatSettings;
  /** Moderation features */
  moderation: ChatModeration;
}

/**
 * Invitation status
 */
export enum InvitationStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  DECLINED = 'declined',
  EXPIRED = 'expired',
  REVOKED = 'revoked'
}

/**
 * Room invitation
 */
export interface RoomInvitation {
  /** Invitation identifier */
  id: EntityId;
  /** Target room ID */
  roomId: EntityId;
  /** Player sending invite */
  inviterId: EntityId;
  /** Specific invitee (optional) */
  inviteeId?: EntityId;
  /** Shareable invite code */
  inviteCode?: string;
  /** Invitation expiry */
  expiresAt: Timestamp;
  /** Usage limit */
  maxUses?: number;
  /** Current usage count */
  currentUses: number;
  /** Invitation status */
  status: InvitationStatus;
  /** Creation timestamp */
  createdAt: Timestamp;
}

/**
 * Invitation response
 */
export interface InvitationResponse {
  /** Associated invitation ID */
  invitationId: EntityId;
  /** Responding player ID */
  playerId: EntityId;
  /** Accept/decline response */
  response: InvitationStatus;
  /** Response timestamp */
  timestamp: Timestamp;
}

/**
 * Room usage statistics
 */
export interface RoomStatistics {
  /** All-time unique players */
  totalPlayers: number;
  /** Games completed in room */
  gamesPlayed: number;
  /** Average game duration (milliseconds) */
  averageGameDuration: number;
  /** Average concurrent players */
  averagePlayersPerGame: number;
  /** Peak concurrent players */
  peakConcurrentPlayers: number;
  /** Room lifetime (milliseconds) */
  totalUptime: number;
}

/**
 * Room performance metrics
 */
export interface RoomPerformance {
  /** Average player latency (milliseconds) */
  averageLatency: number;
  /** Average packet loss (%) */
  packetLoss: number;
  /** Total reconnections */
  reconnections: number;
  /** Server/client crashes */
  crashes: number;
  /** Last performance check */
  lastPerformanceCheck: Timestamp;
}

/**
 * Room event types
 */
export enum RoomEventType {
  ROOM_CREATED = 'room_created',
  PLAYER_JOINED = 'player_joined',
  PLAYER_LEFT = 'player_left',
  PLAYER_READY = 'player_ready',
  GAME_STARTED = 'game_started',
  GAME_ENDED = 'game_ended',
  SETTINGS_CHANGED = 'settings_changed',
  HOST_CHANGED = 'host_changed',
  ROOM_CLOSED = 'room_closed'
}

/**
 * Room event
 */
export interface RoomEvent {
  /** Event identifier */
  id: EntityId;
  /** Event category */
  type: RoomEventType;
  /** Associated player */
  playerId?: EntityId;
  /** Event-specific data */
  data: any;
  /** Event timestamp */
  timestamp: Timestamp;
}

/**
 * Room metadata and information
 */
export interface RoomMetadata {
  /** Associated room ID */
  roomId: EntityId;
  /** Server region */
  region: string;
  /** Game version */
  version: string;
  /** Room tags/categories */
  tags: string[];
  /** Usage statistics */
  statistics: RoomStatistics;
  /** Performance metrics */
  performance: RoomPerformance;
  /** Event history */
  history: RoomEvent[];
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
 * Room creation parameters
 */
export interface RoomCreationParams {
  /** Room host player ID */
  hostId: EntityId;
  /** Room configuration */
  settings: RoomSettings;
  /** Optional room name */
  name?: string;
}

/**
 * Room join parameters
 */
export interface RoomJoinParams {
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
 * Room join result
 */
export interface RoomJoinResult {
  /** Join operation successful */
  success: boolean;
  /** Room details (if successful) */
  room?: Room;
  /** Assigned lobby position */
  playerPosition?: number;
  /** Error message (if failed) */
  error?: string;
}

/**
 * Room search criteria
 */
export interface RoomSearchCriteria {
  /** Game mode filter */
  gameMode?: GameMode;
  /** Difficulty filter */
  difficulty?: DifficultyLevel;
  /** Available slots filter */
  availableSlots?: number;
  /** Public rooms only */
  publicOnly?: boolean;
  /** Room name pattern */
  namePattern?: string;
  /** Region filter */
  region?: string;
}

/**
 * Room list data for display
 */
export interface RoomListData extends PaginatedResponse<RoomSummary> {
  /** Available filters */
  availableFilters: {
    gameModes: GameMode[];
    difficulties: DifficultyLevel[];
    regions: string[];
  };
}

/**
 * Room summary for lists
 */
export interface RoomSummary {
  /** Room identifier */
  id: EntityId;
  /** Room name */
  name?: string;
  /** Current player count */
  playerCount: number;
  /** Maximum players */
  maxPlayers: number;
  /** Room status */
  status: RoomStatus;
  /** Game mode */
  gameMode: GameMode;
  /** Difficulty level */
  difficulty: DifficultyLevel;
  /** Server region */
  region: string;
  /** Room is private */
  isPrivate: boolean;
  /** Creation timestamp */
  createdAt: Timestamp;
}

/**
 * Moderation action types
 */
export enum ModerationActionType {
  WARNING = 'warning',
  MUTE = 'mute',
  KICK = 'kick',
  BAN = 'ban',
  MESSAGE_DELETE = 'message_delete'
}

/**
 * Chat moderation action
 */
export interface ChatModerationAction {
  /** Target message ID */
  messageId: EntityId;
  /** Action taken */
  action: ModerationActionType;
  /** Moderation reason */
  reason: string;
  /** Acting moderator ID */
  moderatorId: EntityId;
  /** Action duration (milliseconds) */
  duration?: number;
}

// Re-export types from other modules for convenience
export type { GameMode, DifficultyLevel, PowerUpType, MapSize, MapTheme, MapLayout } from './game';