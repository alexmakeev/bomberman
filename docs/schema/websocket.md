# WebSocket Schema

This document defines WebSocket message formats and protocols for real-time client-server communication.

## Base Message Format

All WebSocket messages follow a standard envelope format for consistency and routing.

```typescript
interface WebSocketMessage {
  id: string;                    // Unique message identifier
  type: MessageType;             // Message category
  timestamp: Date;               // Message timestamp
  senderId?: string;             // Sender identifier (if applicable)
  roomId?: string;               // Target room (if applicable)
  payload: any;                  // Message-specific data
  ack?: boolean;                 // Requires acknowledgment
  version: string;               // Protocol version
}

enum MessageType {
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
```

## Connection Messages

Messages for establishing and maintaining WebSocket connections.

```typescript
interface ConnectMessage {
  playerId?: string;             // Existing player ID
  sessionToken?: string;         // Authentication token
  deviceInfo: DeviceInfo;        // Client device information
  protocolVersion: string;       // WebSocket protocol version
}

interface ConnectResponse {
  success: boolean;              // Connection successful
  playerId: string;              // Assigned/existing player ID
  sessionId: string;             // New session identifier
  serverInfo: ServerInfo;        // Server information
  error?: string;                // Error message (if failed)
}

interface ServerInfo {
  version: string;               // Server version
  region: string;                // Server region
  maxPlayers: number;            // Server capacity
  features: string[];            // Supported features
}

interface PingMessage {
  timestamp: Date;               // Ping timestamp
  clientTime: number;            // Client-side timestamp
}

interface PongMessage {
  timestamp: Date;               // Pong timestamp
  pingTimestamp: Date;           // Original ping timestamp
  serverTime: number;            // Server-side timestamp
}

interface ErrorMessage {
  code: ErrorCode;               // Error category
  message: string;               // Human-readable message
  details?: any;                 // Additional error details
  fatal: boolean;                // Connection should close
}

enum ErrorCode {
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
```

## Room Management Messages

Messages for creating, joining, and managing game rooms.

```typescript
interface RoomCreateMessage {
  hostId: string;                // Room host player ID
  settings: RoomSettings;        // Room configuration
  name?: string;                 // Optional room name
}

interface RoomCreateResponse {
  success: boolean;              // Room creation successful
  room?: Room;                   // Created room details
  error?: string;                // Error message (if failed)
}

interface RoomJoinMessage {
  roomId: string;                // Target room ID
  playerId: string;              // Joining player ID
  playerName: string;            // Player display name
  password?: string;             // Room password (if required)
}

interface RoomJoinResponse {
  success: boolean;              // Join successful
  room?: Room;                   // Room details
  playerPosition?: number;       // Assigned lobby position
  error?: string;                // Error message (if failed)
}

interface RoomUpdateMessage {
  roomId: string;                // Target room
  updateType: RoomUpdateType;    // Update category
  data: any;                     // Update-specific data
}

enum RoomUpdateType {
  PLAYER_JOINED = 'player_joined',
  PLAYER_LEFT = 'player_left',
  PLAYER_READY = 'player_ready',
  SETTINGS_CHANGED = 'settings_changed',
  HOST_CHANGED = 'host_changed',
  GAME_STARTING = 'game_starting',
  GAME_STARTED = 'game_started',
  GAME_ENDED = 'game_ended'
}
```

## Game State Messages

Messages for synchronizing game state across all clients.

```typescript
interface GameStateMessage {
  gameId: string;                // Game identifier
  timestamp: Date;               // State timestamp
  frameNumber: number;           // Game frame/tick number
  players: PlayerStateUpdate[];  // Player states
  bombs: BombStateUpdate[];      // Active bombs
  powerups: PowerUpStateUpdate[]; // Available power-ups
  monsters: MonsterStateUpdate[]; // Monster states
  maze: MazeStateUpdate;         // Maze changes
  objectives: ObjectiveStateUpdate; // Current objectives
  deltaOnly: boolean;            // Only changed data included
}

interface PlayerStateUpdate {
  playerId: string;              // Player identifier
  position: Position;            // Current position
  direction: Direction;          // Facing direction
  health: number;                // Current health
  alive: boolean;                // Alive status
  abilities: PlayerAbilities;    // Current abilities
  animation?: AnimationState;    // Current animation
  lastAction?: PlayerAction;     // Recent action
}

interface BombStateUpdate {
  bombId: string;                // Bomb identifier
  ownerId: string;               // Player who placed bomb
  position: Position;            // Bomb location
  timer: number;                 // Time until explosion (ms)
  blastRadius: number;           // Explosion radius
  status: BombStatus;            // Current bomb status
}

interface PowerUpStateUpdate {
  powerupId: string;             // Power-up identifier
  type: PowerUpType;             // Power-up category
  position: Position;            // World location
  available: boolean;            // Can be collected
  expiresAt?: Date;              // Auto-removal time
}

interface MonsterStateUpdate {
  monsterId: string;             // Monster identifier
  type: MonsterType;             // Monster category
  position: Position;            // Current position
  health: number;                // Current health
  status: MonsterStatus;         // Current status
  target?: string;               // Target player ID
  animation?: AnimationState;    // Current animation
}

interface MazeStateUpdate {
  changes: TileChange[];         // Modified tiles
  newPowerupSpots?: Position[];  // New power-up locations
  revealedGates?: Gate[];        // Newly revealed gates
  destroyedGates?: string[];     // Destroyed gate IDs
}

interface TileChange {
  position: Position;            // Tile location
  oldType: TileType;             // Previous tile type
  newType: TileType;             // New tile type
  timestamp: Date;               // Change time
}
```

## Player Action Messages

Messages for player input and actions.

```typescript
interface PlayerMoveMessage {
  playerId: string;              // Moving player
  direction: Direction;          // Movement direction
  startPosition: Position;       // Movement start point
  timestamp: Date;               // Input timestamp
  inputSequence: number;         // Input sequence number
}

interface PlayerBombMessage {
  playerId: string;              // Player placing bomb
  position: Position;            // Bomb placement location
  timestamp: Date;               // Action timestamp
  inputSequence: number;         // Input sequence number
}

interface PlayerActionMessage {
  playerId: string;              // Acting player
  action: PlayerActionType;      // Action category
  target?: string;               // Action target (if applicable)
  position?: Position;           // Action location (if applicable)
  data?: any;                    // Action-specific data
  timestamp: Date;               // Action timestamp
  inputSequence: number;         // Input sequence number
}

enum PlayerActionType {
  MOVE_START = 'move_start',     // Begin movement
  MOVE_STOP = 'move_stop',       // Stop movement
  PLACE_BOMB = 'place_bomb',     // Place bomb
  USE_ITEM = 'use_item',         // Use consumable
  INTERACT = 'interact',         // Interact with object
  SPRINT = 'sprint',             // Speed boost
  TAUNT = 'taunt',              // Player emote
  CHAT = 'chat'                  // Chat message
}

interface InputSyncMessage {
  playerId: string;              // Player identifier
  inputState: InputState;        // Current input state
  timestamp: Date;               // Input timestamp
  latency: number;               // Estimated network latency
}
```

## Game Event Messages

Messages for significant game events and state changes.

```typescript
interface BombPlacedMessage {
  bombId: string;                // New bomb identifier
  playerId: string;              // Player who placed bomb
  position: Position;            // Bomb location
  blastRadius: number;           // Explosion radius
  timer: number;                 // Explosion timer (ms)
}

interface BombExplodedMessage {
  bombId: string;                // Exploded bomb
  position: Position;            // Explosion center
  affectedTiles: Position[];     // Tiles in blast radius
  damage: number;                // Explosion damage
  destroyedWalls: Position[];    // Walls destroyed
  damagedEntities: EntityDamage[]; // Entities hit
  chainReaction?: string[];      // Other bombs triggered
}

interface EntityDamage {
  entityId: string;              // Damaged entity
  entityType: EntityType;        // Entity category
  damage: number;                // Damage amount
  newHealth: number;             // Health after damage
  eliminated: boolean;           // Entity destroyed
}

enum EntityType {
  PLAYER = 'player',             // Player entity
  MONSTER = 'monster',           // Monster entity
  BOSS = 'boss',                 // Boss entity
  DESTRUCTIBLE = 'destructible'  // Destructible wall
}

interface PowerUpCollectedMessage {
  powerupId: string;             // Collected power-up
  playerId: string;              // Collecting player
  powerupType: PowerUpType;      // Power-up category
  effect: PowerUpEffect;         // Applied effect
  newAbilities: PlayerAbilities; // Updated player abilities
}

interface PlayerDeathMessage {
  playerId: string;              // Eliminated player
  cause: DeathCause;             // How player died
  killerEntity?: string;         // Entity that caused death
  deathPosition: Position;       // Where player died
  respawnTimer: number;          // Respawn countdown (ms)
  lostPowerups?: PowerUpType[];  // Power-ups lost on death
}

interface ObjectiveUpdateMessage {
  gameId: string;                // Associated game
  objective: ObjectiveStatus;    // Current objective state
  completed: boolean;            // Objective completed
  failed: boolean;               // Objective failed
  newObjective?: ObjectiveStatus; // Next objective (if any)
  teamProgress: number;          // Overall team progress
}
```

## Chat Messages

Messages for in-game and lobby chat communication.

```typescript
interface ChatMessage {
  messageId: string;             // Message identifier
  senderId: string;              // Message sender
  senderName: string;            // Sender display name
  roomId?: string;               // Target room (if room chat)
  content: string;               // Message text
  type: ChatMessageType;         // Message category
  timestamp: Date;               // Send time
  mentions?: string[];           // Mentioned players
  filtered: boolean;             // Content was filtered
}

enum ChatMessageType {
  USER = 'user',                 // Regular user message
  SYSTEM = 'system',             // System notification
  ANNOUNCEMENT = 'announcement', // Important announcement
  WHISPER = 'whisper',          // Private message
  TEAM = 'team',                // Team-only message
  ADMIN = 'admin'               // Admin message
}

interface ChatModerationAction {
  messageId: string;             // Affected message
  action: ModerationActionType;  // Action taken
  reason: string;                // Moderation reason
  moderatorId: string;           // Acting moderator
  duration?: number;             // Action duration (ms)
}

enum ModerationActionType {
  WARNING = 'warning',           // Warning issued
  MUTE = 'mute',                // Player muted
  KICK = 'kick',                // Player kicked
  BAN = 'ban',                  // Player banned
  MESSAGE_DELETE = 'message_delete' // Message removed
}
```

## Admin Messages

Messages for administrative actions and system management.

```typescript
interface AdminActionMessage {
  adminId: string;               // Acting administrator
  action: AdminActionType;       // Action category
  targetId?: string;             // Target entity ID
  roomId?: string;               // Target room (if applicable)
  reason?: string;               // Action reason
  data?: any;                    // Action-specific data
  broadcast: boolean;            // Broadcast to all players
}

enum AdminActionType {
  KICK_PLAYER = 'kick_player',   // Remove player from room
  BAN_PLAYER = 'ban_player',     // Ban player from system
  MUTE_PLAYER = 'mute_player',   // Mute player chat
  TERMINATE_ROOM = 'terminate_room', // Close room
  BROADCAST_MESSAGE = 'broadcast_message', // Send announcement
  MAINTENANCE_MODE = 'maintenance_mode',   // Enable maintenance
  FORCE_UPDATE = 'force_update', // Force client update
  SERVER_SHUTDOWN = 'server_shutdown'     // Server shutdown warning
}

interface SystemMessageMessage {
  severity: SystemMessageSeverity; // Message importance
  category: SystemMessageCategory; // Message type
  title: string;                 // Message title
  content: string;               // Message body
  action?: SystemAction;         // Required action
  expiresAt?: Date;              // Message expiry
  targetPlayers?: string[];      // Specific recipients
}

enum SystemMessageSeverity {
  INFO = 'info',                 // Informational
  WARNING = 'warning',           // Warning
  ERROR = 'error',               // Error condition
  CRITICAL = 'critical'          // Critical alert
}

enum SystemMessageCategory {
  MAINTENANCE = 'maintenance',   // Maintenance notification
  UPDATE = 'update',            // System update
  SECURITY = 'security',        // Security alert
  POLICY = 'policy',            // Policy change
  PERFORMANCE = 'performance'   // Performance issue
}

interface SystemAction {
  type: SystemActionType;        // Action category
  required: boolean;             // Action mandatory
  deadline?: Date;               // Action deadline
  url?: string;                  // Action URL
}

enum SystemActionType {
  UPDATE_CLIENT = 'update_client', // Update game client
  RECONNECT = 'reconnect',       // Reconnect to server
  READ_ANNOUNCEMENT = 'read_announcement', // Read message
  ACCEPT_TERMS = 'accept_terms', // Accept new terms
  VERIFY_ACCOUNT = 'verify_account'        // Account verification
}
```

## Message Acknowledgment

System for confirming message delivery and processing.

```typescript
interface AckMessage {
  originalMessageId: string;     // Message being acknowledged
  success: boolean;              // Processing successful
  error?: string;                // Error message (if failed)
  data?: any;                    // Response data
  timestamp: Date;               // Acknowledgment time
}

interface MessageMetadata {
  messageId: string;             // Message identifier
  priority: MessagePriority;     // Message priority
  reliable: boolean;             // Guaranteed delivery
  compress: boolean;             // Use compression
  encrypt: boolean;              // Use encryption
  ttl?: number;                  // Time to live (ms)
  retryCount: number;           // Retry attempts
}

enum MessagePriority {
  LOW = 'low',                   // Background messages
  NORMAL = 'normal',             // Standard messages
  HIGH = 'high',                 // Important messages
  CRITICAL = 'critical'          // Critical messages
}
```

## Usage Notes

- All messages include unique IDs for tracking and deduplication
- Game state messages use delta compression for efficiency
- Player actions include sequence numbers for ordering and duplicate detection
- Critical messages require acknowledgment to ensure delivery
- Message timestamps enable latency compensation and synchronization
- Admin messages have elevated security and logging requirements
- Chat messages support moderation and filtering
- System messages provide maintenance and update notifications
- WebSocket connections support automatic reconnection with state recovery
- Message compression and encryption can be enabled for performance and security