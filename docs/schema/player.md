# Player Schema

This document defines player-related entities for user management, authentication, and game state.

## Player Entity

Represents a player in the system with persistent identity and session management.

```typescript
interface Player {
  id: string;                    // Unique player identifier
  name: string;                  // Display name
  session: PlayerSession;        // Current session info
  preferences: PlayerPreferences; // User settings
  statistics: PlayerLifetimeStats; // Historical statistics
  status: PlayerStatus;          // Current status
  deviceInfo: DeviceInfo;        // Client device information
  createdAt: Date;
  lastActiveAt: Date;
}

enum PlayerStatus {
  OFFLINE = 'offline',           // Not connected
  ONLINE = 'online',             // Connected but not in game
  IN_LOBBY = 'in_lobby',         // In room lobby
  IN_GAME = 'in_game',           // Playing game
  SPECTATING = 'spectating'      // Watching game
}
```

## Player Session

Manages player connection and authentication state.

```typescript
interface PlayerSession {
  sessionId: string;             // Unique session identifier
  playerId: string;              // Associated player ID
  connectionId: string;          // WebSocket connection ID
  ipAddress: string;             // Client IP address
  userAgent: string;             // Browser/device info
  connectedAt: Date;             // Connection timestamp
  lastPingAt: Date;              // Last heartbeat
  authenticated: boolean;        // Authentication status
  roomId?: string;               // Current room (if any)
  gameId?: string;               // Current game (if any)
}

interface AuthenticationResult {
  success: boolean;
  playerId?: string;
  sessionToken?: string;
  error?: string;
  expiresAt?: Date;
}
```

## Player Game State

Represents player state within an active game.

```typescript
interface PlayerGameState {
  playerId: string;              // Player identifier
  position: Position;            // Current world position
  direction: Direction;          // Facing direction
  health: number;                // Current health points
  maxHealth: number;             // Maximum health
  alive: boolean;                // Alive/dead status
  abilities: PlayerAbilities;    // Current abilities/power-ups
  inventory: PlayerInventory;    // Carried items
  respawnInfo?: RespawnInfo;     // Respawn state (if dead)
  inputState: InputState;        // Current input state
  lastActionAt: Date;            // Last action timestamp
}

enum Direction {
  UP = 'up',
  DOWN = 'down',
  LEFT = 'left',
  RIGHT = 'right'
}

interface Position {
  x: number;                     // X coordinate (tile-based)
  y: number;                     // Y coordinate (tile-based)
}
```

## Player Abilities

Defines player capabilities and power-up effects.

```typescript
interface PlayerAbilities {
  maxBombs: number;              // Maximum simultaneous bombs
  blastRadius: number;           // Bomb explosion radius
  moveSpeed: number;             // Movement speed multiplier
  wallPass: boolean;             // Can walk through destructible walls
  bombPass: boolean;             // Can walk through bombs
  bombKick: boolean;             // Can kick/push bombs
  immunity: number;              // Damage immunity time (ms)
  powerLevel: number;            // Overall power level (0-10)
  activeEffects: AbilityEffect[]; // Temporary effects
}

interface AbilityEffect {
  id: string;                    // Effect identifier
  type: AbilityEffectType;       // Effect category
  magnitude: number;             // Effect strength
  duration: number;              // Effect duration (ms)
  startTime: Date;               // When effect started
  stackCount: number;            // How many instances stacked
}

enum AbilityEffectType {
  SPEED_BOOST = 'speed_boost',
  DAMAGE_IMMUNITY = 'damage_immunity',
  BLAST_ENHANCEMENT = 'blast_enhancement',
  BOMB_CAPACITY = 'bomb_capacity',
  WALL_PENETRATION = 'wall_penetration'
}
```

## Player Inventory

Manages items and consumables carried by player.

```typescript
interface PlayerInventory {
  items: InventoryItem[];        // Carried items
  maxSlots: number;              // Inventory capacity
  consumables: ConsumableItem[]; // Usable items
}

interface InventoryItem {
  id: string;                    // Item identifier
  type: ItemType;                // Item category
  quantity: number;              // Stack size
  acquiredAt: Date;              // When obtained
}

interface ConsumableItem extends InventoryItem {
  uses: number;                  // Remaining uses
  cooldown: number;              // Use cooldown (ms)
  lastUsedAt?: Date;             // Last use timestamp
}

enum ItemType {
  HEALTH_POTION = 'health_potion',
  SPEED_BOOST = 'speed_boost',
  SHIELD = 'shield',
  EXTRA_BOMB = 'extra_bomb',
  KEY = 'key'                    // Special gates/doors
}
```

## Respawn Info

Manages player respawn mechanics and countdown.

```typescript
interface RespawnInfo {
  playerId: string;              // Player being respawned
  deathTime: Date;               // When player died
  respawnTime: Date;             // When respawn will occur
  countdownSeconds: number;      // Seconds remaining
  cause: DeathCause;             // How player died
  spectatorMode: boolean;        // Can observe while dead
  respawnLocation?: Position;    // Predetermined spawn point
}

enum DeathCause {
  BOMB_EXPLOSION = 'bomb_explosion',     // Own or other bomb
  FRIENDLY_FIRE = 'friendly_fire',       // Teammate bomb
  MONSTER_ATTACK = 'monster_attack',     // Monster damage
  BOSS_ATTACK = 'boss_attack',          // Boss damage
  ENVIRONMENTAL = 'environmental',       // Trap/hazard
  TIMEOUT = 'timeout'                   // Elimination timer
}

interface SpawnPoint {
  position: Position;            // Spawn location
  safe: boolean;                 // Free from immediate danger
  corner: boolean;               // Is a corner spawn
  occupied: boolean;             // Currently occupied
  priority: number;              // Spawn preference (higher = better)
}
```

## Input State

Tracks player input for movement and actions.

```typescript
interface InputState {
  movement: MovementInput;       // Direction input
  actions: ActionInput;          // Action buttons
  timestamp: Date;               // Input timestamp
  processed: boolean;            // Server processed flag
}

interface MovementInput {
  up: boolean;                   // Up key/button state
  down: boolean;                 // Down key/button state
  left: boolean;                 // Left key/button state
  right: boolean;                // Right key/button state
  magnitude: number;             // Input strength (0.0-1.0)
}

interface ActionInput {
  placeBomb: boolean;            // Bomb placement
  useItem: boolean;              // Use consumable
  interact: boolean;             // Interact with objects
  sprint: boolean;               // Speed boost
  selectedItem?: number;         // Selected inventory slot
}
```

## Device Info

Information about player's client device for optimization.

```typescript
interface DeviceInfo {
  type: DeviceType;              // Device category
  platform: string;             // OS/Platform
  browser: string;               // Browser name/version
  screenResolution: Resolution;  // Screen size
  touchSupported: boolean;       // Touch input available
  accelerometerSupported: boolean; // Motion sensors
  connectionType: ConnectionType; // Network connection
  performanceLevel: PerformanceLevel; // Device capability
}

enum DeviceType {
  DESKTOP = 'desktop',
  MOBILE = 'mobile',
  TABLET = 'tablet'
}

interface Resolution {
  width: number;                 // Screen width (pixels)
  height: number;                // Screen height (pixels)
  pixelRatio: number;            // Device pixel ratio
}

enum ConnectionType {
  ETHERNET = 'ethernet',
  WIFI = 'wifi',
  MOBILE_4G = 'mobile_4g',
  MOBILE_3G = 'mobile_3g',
  SLOW = 'slow'
}

enum PerformanceLevel {
  HIGH = 'high',                 // High-end device
  MEDIUM = 'medium',             // Mid-range device
  LOW = 'low'                    // Low-end device
}
```

## Player Preferences

User-configurable settings and preferences.

```typescript
interface PlayerPreferences {
  playerId: string;              // Associated player
  controls: ControlSettings;     // Input preferences
  audio: AudioSettings;          // Sound preferences
  video: VideoSettings;          // Visual preferences
  accessibility: AccessibilitySettings; // Accessibility options
  privacy: PrivacySettings;      // Privacy controls
  updatedAt: Date;
}

interface ControlSettings {
  keyBindings: KeyBinding[];     // Custom key mappings
  mouseSensitivity: number;      // Mouse sensitivity (0.1-2.0)
  touchDeadzone: number;         // Touch input deadzone
  hapticFeedback: boolean;       // Vibration on mobile
  autoRun: boolean;              // Always run when moving
}

interface KeyBinding {
  action: string;                // Action name
  primaryKey: string;            // Primary key/button
  secondaryKey?: string;         // Alternative key
}

interface AudioSettings {
  masterVolume: number;          // Overall volume (0.0-1.0)
  sfxVolume: number;             // Sound effects volume
  musicVolume: number;           // Background music volume
  voiceVolume: number;           // Voice chat volume
  muted: boolean;                // All audio muted
}

interface VideoSettings {
  resolution: Resolution;        // Preferred resolution
  fullscreen: boolean;           // Fullscreen mode
  vsync: boolean;                // Vertical sync
  particleEffects: boolean;      // Show particle effects
  animations: boolean;           // Enable animations
  reducedMotion: boolean;        // Reduce motion for accessibility
}

interface AccessibilitySettings {
  highContrast: boolean;         // High contrast colors
  largeText: boolean;            // Larger text size
  colorBlindMode: ColorBlindMode; // Color blind assistance
  subtitles: boolean;            // Show text for audio
  reduceFlashing: boolean;       // Minimize flashing effects
}

enum ColorBlindMode {
  NONE = 'none',
  PROTANOPIA = 'protanopia',
  DEUTERANOPIA = 'deuteranopia',
  TRITANOPIA = 'tritanopia'
}

interface PrivacySettings {
  shareStatistics: boolean;      // Share usage stats
  allowFriendInvites: boolean;   // Accept friend invites
  showOnlineStatus: boolean;     // Visible online status
  recordGameplay: boolean;       // Allow replay recording
}
```

## Player Statistics

Long-term player statistics and achievements.

```typescript
interface PlayerLifetimeStats {
  playerId: string;              // Associated player
  gamesPlayed: number;           // Total games played
  gamesWon: number;              // Games won
  gamesLost: number;             // Games lost
  totalPlayTime: number;         // Total play time (ms)
  bombsPlaced: number;           // Lifetime bombs placed
  wallsDestroyed: number;        // Lifetime walls destroyed
  monstersKilled: number;        // Lifetime monsters killed
  bossesDefeated: number;        // Lifetime bosses defeated
  powerupsCollected: number;     // Lifetime power-ups collected
  deaths: number;                // Total deaths
  friendlyFireIncidents: number; // Accidental team damage
  cooperationScore: number;      // Average teamwork score
  achievements: Achievement[];    // Unlocked achievements
  rankings: PlayerRanking[];     // Competitive rankings
  lastUpdated: Date;
}

interface Achievement {
  id: string;                    // Achievement identifier
  name: string;                  // Achievement name
  description: string;           // Achievement description
  category: AchievementCategory; // Achievement type
  progress: number;              // Progress toward completion (0.0-1.0)
  completed: boolean;            // Achievement completed
  unlockedAt?: Date;             // When unlocked
  rarity: AchievementRarity;     // How rare this achievement is
}

enum AchievementCategory {
  COMBAT = 'combat',
  EXPLORATION = 'exploration',
  TEAMWORK = 'teamwork',
  SURVIVAL = 'survival',
  SPECIAL = 'special'
}

enum AchievementRarity {
  COMMON = 'common',
  UNCOMMON = 'uncommon',
  RARE = 'rare',
  EPIC = 'epic',
  LEGENDARY = 'legendary'
}

interface PlayerRanking {
  category: RankingCategory;     // Ranking type
  rank: number;                  // Current rank
  rating: number;                // Skill rating
  tier: RankingTier;             // Rank tier
  seasion: string;               // Ranking season
  lastUpdated: Date;
}

enum RankingCategory {
  OVERALL = 'overall',
  COOPERATIVE = 'cooperative',
  SURVIVAL = 'survival',
  SPEED_RUN = 'speed_run'
}

enum RankingTier {
  BRONZE = 'bronze',
  SILVER = 'silver',
  GOLD = 'gold',
  PLATINUM = 'platinum',
  DIAMOND = 'diamond',
  MASTER = 'master'
}
```

## Usage Notes

- Player IDs should be UUIDs for uniqueness across sessions
- Session tokens expire and require renewal for long sessions
- Device information enables adaptive graphics and controls
- Player preferences are stored persistently and synced across devices
- Game state is ephemeral and reset between games
- Abilities can be modified by power-ups and reset on death/respawn
- Statistics are updated in real-time during gameplay
- Achievements provide long-term progression and engagement
- Respawn mechanics support both timed and manual respawn modes