# Room Schema

This document defines room and multiplayer lobby entities for session management and coordination.

## Room Entity

Represents a multiplayer game room where players gather before and during gameplay.

```typescript
interface Room {
  id: string;                    // Unique room identifier
  url: string;                   // Shareable room URL
  name?: string;                 // Optional room name
  hostId: string;                // Room creator/host player ID
  players: Map<string, RoomPlayer>; // Players in room
  settings: RoomSettings;        // Room configuration
  status: RoomStatus;            // Current room state
  lobby: LobbyState;             // Lobby management
  game?: Game;                   // Active game (if started)
  metadata: RoomMetadata;        // Room information
  createdAt: Date;
  updatedAt: Date;
}

enum RoomStatus {
  WAITING = 'waiting',           // Waiting for players
  READY = 'ready',               // Ready to start game
  STARTING = 'starting',         // Game countdown
  IN_GAME = 'in_game',          // Game in progress
  FINISHED = 'finished',         // Game completed
  CLOSED = 'closed'              // Room closed/archived
}
```

## Room Player

Represents a player within a specific room context.

```typescript
interface RoomPlayer {
  playerId: string;              // Player identifier
  name: string;                  // Display name
  status: PlayerRoomStatus;      // Player state in room
  isHost: boolean;               // Room host privileges
  joinedAt: Date;                // When player joined room
  ready: boolean;                // Ready for game start
  position?: number;             // Lobby position/slot
  team?: string;                 // Team assignment (if applicable)
  preferences: PlayerRoomPreferences; // Room-specific settings
  connection: ConnectionInfo;    // Connection status
}

enum PlayerRoomStatus {
  JOINING = 'joining',           // In process of joining
  CONNECTED = 'connected',       // Connected and in lobby
  READY = 'ready',              // Ready to start game
  PLAYING = 'playing',          // In active game
  SPECTATING = 'spectating',    // Watching game
  DISCONNECTED = 'disconnected', // Temporarily disconnected
  LEFT = 'left'                 // Left the room
}

interface PlayerRoomPreferences {
  playerId: string;
  preferredPosition?: number;    // Preferred lobby slot
  autoReady: boolean;           // Auto-ready for next game
  spectateMode: boolean;        // Spectate instead of play
  notifications: boolean;       // Room event notifications
}

interface ConnectionInfo {
  connectionId: string;          // WebSocket connection ID
  latency: number;               // Connection latency (ms)
  stable: boolean;               // Connection stability
  lastPingAt: Date;              // Last heartbeat
  reconnectAttempts: number;     // Failed reconnection attempts
}
```

## Room Settings

Configurable room parameters and game options.

```typescript
interface RoomSettings {
  maxPlayers: number;            // Maximum player capacity (2-8)
  minPlayers: number;            // Minimum players to start (2)
  isPrivate: boolean;            // Private room (invite only)
  password?: string;             // Room password (if protected)
  spectators: SpectatorSettings; // Spectator configuration
  gameMode: GameMode;            // Game mode selection
  difficulty: DifficultyLevel;   // AI difficulty
  mapSettings: MapSettings;      // Level/map configuration
  powerupSettings: PowerUpSettings; // Power-up spawn rules
  timeSettings: TimeSettings;    // Game timing
  reconnectPolicy: ReconnectPolicy; // Reconnection rules
}

interface SpectatorSettings {
  allowSpectators: boolean;      // Allow non-playing observers
  maxSpectators: number;         // Maximum spectator count
  spectatorChat: boolean;        // Spectators can chat
  spectatorDelay: number;        // Stream delay (ms)
}

enum GameMode {
  COOPERATIVE = 'cooperative',   // Team vs AI/objectives
  SURVIVAL = 'survival',         // Endless waves
  TIME_ATTACK = 'time_attack',   // Speed completion
  EXPLORATION = 'exploration'    // Open-ended exploration
}

enum DifficultyLevel {
  EASY = 'easy',
  MEDIUM = 'medium',
  HARD = 'hard',
  EXPERT = 'expert'
}

interface MapSettings {
  size: MapSize;                 // Map dimensions
  theme: MapTheme;               // Visual theme
  layout: MapLayout;             // Maze generation type
  destructibleWalls: number;     // Percentage of destructible walls
  powerUpDensity: number;        // Power-up spawn frequency
  exitGates: number;             // Number of exit gates
}

enum MapSize {
  SMALL = 'small',              // 15x11 tiles
  MEDIUM = 'medium',            // 19x15 tiles
  LARGE = 'large'               // 23x19 tiles
}

enum MapTheme {
  CLASSIC = 'classic',          // Original Bomberman theme
  DUNGEON = 'dungeon',          // Dark dungeon theme
  FOREST = 'forest',            // Nature/forest theme
  INDUSTRIAL = 'industrial'     // Factory/tech theme
}

enum MapLayout {
  CLASSIC = 'classic',          // Traditional maze
  OPEN = 'open',               // More open spaces
  DENSE = 'dense',             // Many walls/corridors
  RANDOM = 'random'            // Fully randomized
}

interface PowerUpSettings {
  spawnRate: number;            // Spawn frequency multiplier
  maxActive: number;            // Max power-ups on map
  types: PowerUpType[];         // Allowed power-up types
  rarityWeights: Map<PowerUpType, number>; // Spawn probability weights
}

interface TimeSettings {
  gameTimeout: number;          // Max game duration (ms)
  roundTimeout: number;         // Max round duration (ms)
  startCountdown: number;       // Start countdown duration (s)
  respawnTime: number;          // Player respawn time (s)
}

interface ReconnectPolicy {
  allowReconnect: boolean;      // Allow reconnection
  reconnectTimeout: number;     // Reconnection window (ms)
  maxReconnectAttempts: number; // Max reconnection tries
  preserveProgress: boolean;    // Keep player progress on reconnect
}
```

## Lobby State

Manages pre-game lobby mechanics and player coordination.

```typescript
interface LobbyState {
  roomId: string;                // Associated room
  slots: LobbySlot[];           // Player positions
  chat: ChatSystem;             // Lobby chat
  readyCheck: ReadyCheckState;  // Ready status tracking
  countdown: CountdownTimer;    // Game start countdown
  invitations: RoomInvitation[]; // Pending invites
}

interface LobbySlot {
  position: number;             // Slot number (0-7)
  playerId?: string;            // Assigned player (if occupied)
  reserved: boolean;            // Reserved for specific player
  team?: string;                // Team assignment
  ready: boolean;               // Player ready status
}

interface ReadyCheckState {
  initiated: boolean;           // Ready check in progress
  initiatedBy: string;          // Player who started check
  responses: Map<string, boolean>; // Player responses
  timeout: Date;                // Ready check timeout
  required: boolean;            // Must all players be ready
}

interface CountdownTimer {
  active: boolean;              // Countdown in progress
  startTime: Date;              // Countdown start
  duration: number;             // Countdown length (ms)
  remaining: number;            // Time remaining (ms)
  canCancel: boolean;           // Can be cancelled
}
```

## Chat System

In-room chat functionality for player communication.

```typescript
interface ChatSystem {
  roomId: string;               // Associated room
  messages: ChatMessage[];      // Chat history
  settings: ChatSettings;       // Chat configuration
  moderation: ChatModeration;   // Moderation features
}

interface ChatMessage {
  id: string;                   // Message identifier
  senderId: string;             // Message sender
  senderName: string;           // Sender display name
  content: string;              // Message text
  type: MessageType;            // Message category
  timestamp: Date;              // Send time
  edited: boolean;              // Message was edited
  deleted: boolean;             // Message was deleted
}

enum MessageType {
  USER = 'user',                // Regular user message
  SYSTEM = 'system',            // System notification
  JOIN = 'join',                // Player joined
  LEAVE = 'leave',              // Player left
  READY = 'ready',              // Player ready status
  GAME_START = 'game_start',    // Game starting
  GAME_END = 'game_end'         // Game finished
}

interface ChatSettings {
  enabled: boolean;             // Chat enabled
  maxMessages: number;          // Message history limit
  messageLength: number;        // Max message length
  rateLimitPerMinute: number;   // Messages per minute limit
  profanityFilter: boolean;     // Filter inappropriate content
  allowLinks: boolean;          // Allow URL links
}

interface ChatModeration {
  wordFilter: string[];         // Blocked words/phrases
  spamDetection: boolean;       // Detect spam patterns
  mutedPlayers: Set<string>;    // Muted player IDs
  reportedMessages: Map<string, string[]>; // Message ID -> reporter IDs
}
```

## Room Invitations

Manages player invitations to rooms.

```typescript
interface RoomInvitation {
  id: string;                   // Invitation identifier
  roomId: string;               // Target room
  inviterId: string;            // Player sending invite
  inviteeId?: string;           // Specific player (optional)
  inviteCode?: string;          // Shareable invite code
  expiresAt: Date;              // Invitation expiry
  maxUses?: number;             // Usage limit
  currentUses: number;          // Times used
  status: InvitationStatus;     // Current status
  createdAt: Date;
}

enum InvitationStatus {
  PENDING = 'pending',          // Awaiting response
  ACCEPTED = 'accepted',        // Invitation accepted
  DECLINED = 'declined',        // Invitation declined
  EXPIRED = 'expired',          // Invitation expired
  REVOKED = 'revoked'           // Invitation cancelled
}

interface InvitationResponse {
  invitationId: string;         // Associated invitation
  playerId: string;             // Responding player
  response: InvitationStatus;   // Accept/decline
  timestamp: Date;              // Response time
}
```

## Room Metadata

Additional room information for management and statistics.

```typescript
interface RoomMetadata {
  roomId: string;               // Associated room
  region: string;               // Server region
  version: string;              // Game version
  tags: string[];               // Room tags/categories
  statistics: RoomStatistics;   // Room usage stats
  performance: RoomPerformance; // Performance metrics
  history: RoomEvent[];         // Room event log
}

interface RoomStatistics {
  totalPlayers: number;         // All-time unique players
  gamesPlayed: number;          // Games completed in room
  averageGameDuration: number;  // Average game length (ms)
  averagePlayersPerGame: number; // Average concurrent players
  peakConcurrentPlayers: number; // Maximum concurrent players
  totalUptime: number;          // Room lifetime (ms)
}

interface RoomPerformance {
  averageLatency: number;       // Average player latency (ms)
  packetLoss: number;           // Average packet loss (%)
  reconnections: number;        // Total reconnections
  crashes: number;              // Server/client crashes
  lastPerformanceCheck: Date;   // Last performance measurement
}

interface RoomEvent {
  id: string;                   // Event identifier
  type: RoomEventType;          // Event category
  playerId?: string;            // Associated player
  data: any;                    // Event-specific data
  timestamp: Date;              // Event time
}

enum RoomEventType {
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
```

## Room Management Operations

Common room operations and their expected behavior.

```typescript
interface RoomManager {
  createRoom(hostId: string, settings: RoomSettings): Promise<Room>;
  joinRoom(roomId: string, playerId: string, password?: string): Promise<RoomPlayer>;
  leaveRoom(roomId: string, playerId: string): Promise<void>;
  updateSettings(roomId: string, hostId: string, settings: Partial<RoomSettings>): Promise<void>;
  transferHost(roomId: string, currentHostId: string, newHostId: string): Promise<void>;
  startGame(roomId: string, hostId: string): Promise<Game>;
  closeRoom(roomId: string, hostId: string): Promise<void>;
  invitePlayer(roomId: string, inviterId: string, targetPlayerId: string): Promise<RoomInvitation>;
  kickPlayer(roomId: string, hostId: string, targetPlayerId: string): Promise<void>;
  setPlayerReady(roomId: string, playerId: string, ready: boolean): Promise<void>;
}
```

## Usage Notes

- Room URLs should be unguessable for privacy
- Host privileges include settings, starting games, and kicking players
- Rooms support both public and private modes
- Players can reconnect to rooms within the timeout window
- Chat messages are rate-limited to prevent spam
- Room settings can only be changed by the host
- Spectators can observe but not participate in gameplay
- Room capacity includes both players and spectators
- Game mode affects available settings and objectives
- Room events provide audit trail for moderation and analytics