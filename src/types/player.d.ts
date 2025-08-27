/**
 * Player-related type definitions for user management, authentication, and game state.
 * Includes player entities, sessions, preferences, statistics, and achievements.
 */

import { EntityId, Timestamp, Resolution, ValidationResult, Color } from './common';
import { PlayerGameState, PlayerAbilities, PlayerInventory, RespawnInfo, InputState } from './game';

/**
 * Player status in the system
 */
export enum PlayerStatus {
  OFFLINE = 'offline',
  ONLINE = 'online',
  IN_LOBBY = 'in_lobby',
  IN_GAME = 'in_game',
  SPECTATING = 'spectating'
}

/**
 * Main player entity with persistent identity
 */
export interface Player {
  /** Unique player identifier */
  id: EntityId;
  /** Display name */
  name: string;
  /** Current session information */
  session: PlayerSession;
  /** User preferences and settings */
  preferences: PlayerPreferences;
  /** Lifetime statistics */
  statistics: PlayerLifetimeStats;
  /** Current player status */
  status: PlayerStatus;
  /** Client device information */
  deviceInfo: DeviceInfo;
  /** Account creation timestamp */
  createdAt: Timestamp;
  /** Last activity timestamp */
  lastActiveAt: Timestamp;
}

/**
 * Player session management
 */
export interface PlayerSession {
  /** Unique session identifier */
  sessionId: EntityId;
  /** Associated player ID */
  playerId: EntityId;
  /** WebSocket connection ID */
  connectionId: EntityId;
  /** Client IP address */
  ipAddress: string;
  /** Browser/device user agent */
  userAgent: string;
  /** Connection start timestamp */
  connectedAt: Timestamp;
  /** Last heartbeat timestamp */
  lastPingAt: Timestamp;
  /** Authentication status */
  authenticated: boolean;
  /** Current room ID (if in room) */
  roomId?: EntityId;
  /** Current game ID (if in game) */
  gameId?: EntityId;
}

/**
 * Authentication result
 */
export interface AuthenticationResult {
  /** Authentication successful */
  success: boolean;
  /** Authenticated player ID */
  playerId?: EntityId;
  /** Session token */
  sessionToken?: string;
  /** Error message (if failed) */
  error?: string;
  /** Token expiry timestamp */
  expiresAt?: Timestamp;
}

/**
 * Device type categories
 */
export enum DeviceType {
  DESKTOP = 'desktop',
  MOBILE = 'mobile',
  TABLET = 'tablet'
}

/**
 * Network connection types
 */
export enum ConnectionType {
  ETHERNET = 'ethernet',
  WIFI = 'wifi',
  MOBILE_4G = 'mobile_4g',
  MOBILE_3G = 'mobile_3g',
  SLOW = 'slow'
}

/**
 * Device performance categories
 */
export enum PerformanceLevel {
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low'
}

/**
 * Client device information
 */
export interface DeviceInfo {
  /** Device category */
  type: DeviceType;
  /** Operating system/platform */
  platform: string;
  /** Browser name and version */
  browser: string;
  /** Screen resolution */
  screenResolution: Resolution;
  /** Touch input support */
  touchSupported: boolean;
  /** Motion sensor support */
  accelerometerSupported: boolean;
  /** Network connection type */
  connectionType: ConnectionType;
  /** Device performance capability */
  performanceLevel: PerformanceLevel;
}

/**
 * Control key binding
 */
export interface KeyBinding {
  /** Action name */
  action: string;
  /** Primary key/button */
  primaryKey: string;
  /** Alternative key */
  secondaryKey?: string;
}

/**
 * Control settings and preferences
 */
export interface ControlSettings {
  /** Custom key mappings */
  keyBindings: KeyBinding[];
  /** Mouse sensitivity (0.1-2.0) */
  mouseSensitivity: number;
  /** Touch input deadzone */
  touchDeadzone: number;
  /** Haptic feedback on mobile */
  hapticFeedback: boolean;
  /** Auto-run when moving */
  autoRun: boolean;
}

/**
 * Audio preferences
 */
export interface AudioSettings {
  /** Master volume (0.0-1.0) */
  masterVolume: number;
  /** Sound effects volume */
  sfxVolume: number;
  /** Background music volume */
  musicVolume: number;
  /** Voice chat volume */
  voiceVolume: number;
  /** All audio muted */
  muted: boolean;
}

/**
 * Visual preferences
 */
export interface VideoSettings {
  /** Preferred resolution */
  resolution: Resolution;
  /** Fullscreen mode */
  fullscreen: boolean;
  /** Vertical sync */
  vsync: boolean;
  /** Show particle effects */
  particleEffects: boolean;
  /** Enable animations */
  animations: boolean;
  /** Reduce motion for accessibility */
  reducedMotion: boolean;
}

/**
 * Color blind assistance modes
 */
export enum ColorBlindMode {
  NONE = 'none',
  PROTANOPIA = 'protanopia',
  DEUTERANOPIA = 'deuteranopia',
  TRITANOPIA = 'tritanopia'
}

/**
 * Accessibility settings
 */
export interface AccessibilitySettings {
  /** High contrast colors */
  highContrast: boolean;
  /** Larger text size */
  largeText: boolean;
  /** Color blind assistance */
  colorBlindMode: ColorBlindMode;
  /** Show text for audio cues */
  subtitles: boolean;
  /** Minimize flashing effects */
  reduceFlashing: boolean;
}

/**
 * Privacy and data settings
 */
export interface PrivacySettings {
  /** Share usage statistics */
  shareStatistics: boolean;
  /** Accept friend invites */
  allowFriendInvites: boolean;
  /** Show online status to others */
  showOnlineStatus: boolean;
  /** Allow gameplay recording */
  recordGameplay: boolean;
}

/**
 * Player preferences and configuration
 */
export interface PlayerPreferences {
  /** Associated player ID */
  playerId: EntityId;
  /** Input control settings */
  controls: ControlSettings;
  /** Audio preferences */
  audio: AudioSettings;
  /** Video preferences */
  video: VideoSettings;
  /** Accessibility options */
  accessibility: AccessibilitySettings;
  /** Privacy controls */
  privacy: PrivacySettings;
  /** Last update timestamp */
  updatedAt: Timestamp;
}

/**
 * Achievement categories
 */
export enum AchievementCategory {
  COMBAT = 'combat',
  EXPLORATION = 'exploration',
  TEAMWORK = 'teamwork',
  SURVIVAL = 'survival',
  SPECIAL = 'special'
}

/**
 * Achievement rarity levels
 */
export enum AchievementRarity {
  COMMON = 'common',
  UNCOMMON = 'uncommon',
  RARE = 'rare',
  EPIC = 'epic',
  LEGENDARY = 'legendary'
}

/**
 * Player achievement
 */
export interface Achievement {
  /** Achievement identifier */
  id: EntityId;
  /** Achievement name */
  name: string;
  /** Achievement description */
  description: string;
  /** Achievement category */
  category: AchievementCategory;
  /** Progress toward completion (0.0-1.0) */
  progress: number;
  /** Achievement completed */
  completed: boolean;
  /** Unlock timestamp */
  unlockedAt?: Timestamp;
  /** Achievement rarity */
  rarity: AchievementRarity;
}

/**
 * Ranking categories
 */
export enum RankingCategory {
  OVERALL = 'overall',
  COOPERATIVE = 'cooperative',
  SURVIVAL = 'survival',
  SPEED_RUN = 'speed_run'
}

/**
 * Ranking tiers
 */
export enum RankingTier {
  BRONZE = 'bronze',
  SILVER = 'silver',
  GOLD = 'gold',
  PLATINUM = 'platinum',
  DIAMOND = 'diamond',
  MASTER = 'master'
}

/**
 * Player competitive ranking
 */
export interface PlayerRanking {
  /** Ranking category */
  category: RankingCategory;
  /** Current rank position */
  rank: number;
  /** Skill rating score */
  rating: number;
  /** Rank tier level */
  tier: RankingTier;
  /** Ranking season */
  season: string;
  /** Last rank update */
  lastUpdated: Timestamp;
}

/**
 * Lifetime player statistics
 */
export interface PlayerLifetimeStats {
  /** Associated player ID */
  playerId: EntityId;
  /** Total games played */
  gamesPlayed: number;
  /** Games won */
  gamesWon: number;
  /** Games lost */
  gamesLost: number;
  /** Total play time (milliseconds) */
  totalPlayTime: number;
  /** Lifetime bombs placed */
  bombsPlaced: number;
  /** Lifetime walls destroyed */
  wallsDestroyed: number;
  /** Lifetime monsters killed */
  monstersKilled: number;
  /** Lifetime bosses defeated */
  bossesDefeated: number;
  /** Lifetime power-ups collected */
  powerupsCollected: number;
  /** Total deaths */
  deaths: number;
  /** Friendly fire incidents */
  friendlyFireIncidents: number;
  /** Average cooperation score */
  cooperationScore: number;
  /** Unlocked achievements */
  achievements: Achievement[];
  /** Competitive rankings */
  rankings: PlayerRanking[];
  /** Last statistics update */
  lastUpdated: Timestamp;
}

/**
 * Session validation result
 */
export interface SessionValidation {
  /** Session is valid */
  valid: boolean;
  /** Associated player ID */
  playerId?: EntityId;
  /** Session expiry time */
  expiresAt?: Timestamp;
  /** Validation error */
  error?: string;
}

/**
 * Token refresh result
 */
export interface TokenRefreshResult {
  /** Refresh successful */
  success: boolean;
  /** New access token */
  accessToken?: string;
  /** New refresh token */
  refreshToken?: string;
  /** Token expiry time */
  expiresAt?: Timestamp;
  /** Error message (if failed) */
  error?: string;
}

/**
 * Player authentication credentials
 */
export interface PlayerCredentials {
  /** Player identifier or username */
  identifier: string;
  /** Authentication token or password */
  token?: string;
  /** Device fingerprint for security */
  deviceFingerprint?: string;
  /** Session continuation token */
  sessionToken?: string;
}

/**
 * Player creation parameters
 */
export interface PlayerCreationParams {
  /** Display name */
  name: string;
  /** Device information */
  deviceInfo: DeviceInfo;
  /** Initial preferences */
  preferences?: Partial<PlayerPreferences>;
}

/**
 * Player update parameters
 */
export interface PlayerUpdateParams {
  /** New display name */
  name?: string;
  /** Preference updates */
  preferences?: Partial<PlayerPreferences>;
  /** Device info updates */
  deviceInfo?: Partial<DeviceInfo>;
}

/**
 * Player search criteria
 */
export interface PlayerSearchCriteria {
  /** Name pattern search */
  namePattern?: string;
  /** Status filter */
  status?: PlayerStatus;
  /** Minimum play time */
  minPlayTime?: number;
  /** Achievement filter */
  hasAchievement?: EntityId;
  /** Active since timestamp */
  activeSince?: Timestamp;
}

/**
 * Player statistics update
 */
export interface PlayerStatsUpdate {
  /** Player identifier */
  playerId: EntityId;
  /** Game session statistics */
  gameStats: PlayerGameStats;
  /** Session duration */
  sessionDuration: number;
  /** Achievements earned */
  newAchievements?: Achievement[];
}

/**
 * Game session player statistics
 */
export interface PlayerGameStats {
  /** Bombs placed in session */
  bombsPlaced: number;
  /** Walls destroyed in session */
  wallsDestroyed: number;
  /** Monsters killed in session */
  monstersKilled: number;
  /** Power-ups collected in session */
  powerupsCollected: number;
  /** Deaths in session */
  deaths: number;
  /** Respawns in session */
  respawns: number;
  /** Damage dealt in session */
  damageDealt: number;
  /** Friendly fire incidents in session */
  friendlyFireIncidents: number;
  /** Survival time in session */
  survivalTime: number;
  /** Cooperation score for session */
  cooperationScore: number;
}

// Re-export types from game.d.ts that are part of player interface
export type {
  PlayerGameState,
  PlayerAbilities,
  PlayerInventory,
  RespawnInfo,
  InputState,
  AbilityEffect,
  DeathCause,
  SpawnPoint
} from './game';