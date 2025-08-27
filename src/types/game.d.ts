/**
 * Game-related type definitions for the Bomberman multiplayer system.
 * Includes game state, bombs, power-ups, maze, gates, and objectives.
 */

import { Position, Vector2D, EntityId, Timestamp, GameEvent, AnimationState } from './common';

/**
 * Game session status
 */
export enum GameStatus {
  WAITING = 'waiting',
  STARTING = 'starting',
  ACTIVE = 'active',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  TERMINATED = 'terminated'
}

/**
 * Main game entity representing an active game session
 */
export interface Game {
  /** Unique game identifier */
  id: EntityId;
  /** Associated room ID */
  roomId: EntityId;
  /** Current game status */
  status: GameStatus;
  /** Game world layout */
  maze: Maze;
  /** Players currently in game */
  players: Map<EntityId, PlayerGameState>;
  /** Active bombs in the game */
  bombs: Map<EntityId, Bomb>;
  /** Available power-ups */
  powerups: PowerUp[];
  /** Active monsters */
  monsters: Monster[];
  /** Boss enemy (if spawned) */
  boss?: Boss;
  /** Exit gates */
  gates: Gate[];
  /** Current game objectives */
  objectives: GameObjectives;
  /** Game/level timer */
  timer?: GameTimer;
  /** Match statistics */
  statistics: GameStatistics;
  /** Game creation timestamp */
  createdAt: Timestamp;
  /** Last update timestamp */
  updatedAt: Timestamp;
}

/**
 * Maze tile types
 */
export enum TileType {
  EMPTY = 'empty',
  WALL = 'wall',
  DESTRUCTIBLE = 'destructible',
  GATE = 'gate'
}

/**
 * Individual maze tile
 */
export interface MazeTile {
  /** Tile type */
  type: TileType;
  /** Tile position */
  position: Position;
  /** Whether tile can be destroyed */
  destructible: boolean;
  /** Whether tile content is revealed */
  revealed: boolean;
}

/**
 * Game world maze layout
 */
export interface Maze {
  /** Maze width in tiles */
  width: number;
  /** Maze height in tiles */
  height: number;
  /** 2D grid of maze tiles */
  tiles: MazeTile[][];
  /** Player spawn locations */
  spawnPoints: Position[];
  /** Breakable wall positions */
  destructibleWalls: Position[];
  /** Potential power-up spawn locations */
  powerupSpots: Position[];
}

/**
 * Bomb status states
 */
export enum BombStatus {
  ACTIVE = 'active',
  EXPLODING = 'exploding',
  EXPLODED = 'exploded'
}

/**
 * Bomb entity placed by players
 */
export interface Bomb {
  /** Unique bomb identifier */
  id: EntityId;
  /** Player who placed the bomb */
  ownerId: EntityId;
  /** Bomb location in maze */
  position: Position;
  /** Time until explosion (milliseconds) */
  timer: number;
  /** Explosion radius in tiles */
  blastRadius: number;
  /** Wall penetration power */
  penetration: number;
  /** Current bomb status */
  status: BombStatus;
  /** Bomb creation timestamp */
  createdAt: Timestamp;
}

/**
 * Bomb explosion data
 */
export interface Explosion {
  /** Associated bomb ID */
  bombId: EntityId;
  /** Explosion center position */
  center: Position;
  /** All affected tile positions */
  affectedTiles: Position[];
  /** Damage amount */
  damage: number;
  /** Visual effect duration */
  duration: number;
}

/**
 * Power-up categories
 */
export enum PowerUpType {
  BOMB_CAPACITY = 'bomb_capacity',
  BLAST_RADIUS = 'blast_radius',
  SPEED_BOOST = 'speed_boost',
  WALL_PASS = 'wall_pass',
  BOMB_PUSH = 'bomb_push',
  IMMUNITY = 'immunity'
}

/**
 * Power-up effect definition
 */
export interface PowerUpEffect {
  /** Effect type */
  type: PowerUpType;
  /** Effect strength */
  magnitude: number;
  /** Can multiple effects stack */
  stackable: boolean;
  /** Maximum stack limit */
  maxStacks?: number;
}

/**
 * Collectible power-up entity
 */
export interface PowerUp {
  /** Unique power-up identifier */
  id: EntityId;
  /** Power-up category */
  type: PowerUpType;
  /** World position */
  position: Position;
  /** Enhancement effect */
  effect: PowerUpEffect;
  /** Time-limited effect duration */
  duration?: number;
  /** Spawn timestamp */
  spawnedAt: Timestamp;
  /** Auto-removal time */
  expiresAt?: Timestamp;
}

/**
 * Gate status states
 */
export enum GateStatus {
  HIDDEN = 'hidden',
  REVEALED = 'revealed',
  DESTROYED = 'destroyed',
  ACTIVE = 'active'
}

/**
 * Gate types for different objectives
 */
export enum GateType {
  PRIMARY = 'primary',
  SECONDARY = 'secondary',
  EMERGENCY = 'emergency'
}

/**
 * Exit gate entity
 */
export interface Gate {
  /** Unique gate identifier */
  id: EntityId;
  /** Gate location */
  position: Position;
  /** Current gate status */
  status: GateStatus;
  /** Gate category */
  type: GateType;
  /** Player who revealed gate */
  revealedBy?: EntityId;
  /** Player who destroyed gate */
  destroyedBy?: EntityId;
  /** Associated monster wave number */
  associatedWave?: number;
}

/**
 * Game objective types
 */
export enum ObjectiveType {
  DEFEAT_BOSS = 'defeat_boss',
  REACH_EXIT = 'reach_exit',
  SURVIVE_WAVES = 'survive_waves',
  COLLECT_ITEMS = 'collect_items',
  TIME_LIMIT = 'time_limit'
}

/**
 * Current objective progress
 */
export interface ObjectiveStatus {
  /** Objective type */
  type: ObjectiveType;
  /** Progress percentage (0.0-1.0) */
  progress: number;
  /** Objective-specific requirements */
  requirement: any;
  /** Optional time constraint */
  timeLimit?: number;
}

/**
 * Game objectives system
 */
export interface GameObjectives {
  /** Main objective */
  primary: ObjectiveType;
  /** Alternative objectives */
  secondary?: ObjectiveType[];
  /** Current objective progress */
  current: ObjectiveStatus;
  /** Completed objectives */
  completed: ObjectiveType[];
  /** Failed objectives */
  failed: ObjectiveType[];
}

/**
 * Timer event types
 */
export enum TimerEventType {
  MONSTER_WAVE = 'monster_wave',
  BOSS_SPAWN = 'boss_spawn',
  POWER_UP_SPAWN = 'power_up_spawn',
  WARNING = 'warning',
  GAME_END = 'game_end'
}

/**
 * Scheduled timer event
 */
export interface TimerEvent {
  /** Event identifier */
  id: EntityId;
  /** Trigger time (elapsed milliseconds) */
  triggerAt: number;
  /** Event type */
  type: TimerEventType;
  /** Whether event has been executed */
  executed: boolean;
  /** Event-specific data */
  data?: any;
}

/**
 * Game timer system
 */
export interface GameTimer {
  /** Game start timestamp */
  startTime: Timestamp;
  /** Elapsed game time (milliseconds) */
  elapsed: number;
  /** Remaining time for objectives */
  remaining?: number;
  /** Timer pause state */
  paused: boolean;
  /** Scheduled events */
  events: TimerEvent[];
}

/**
 * Individual player game statistics
 */
export interface PlayerStats {
  /** Player identifier */
  playerId: EntityId;
  /** Bombs placed during game */
  bombsPlaced: number;
  /** Walls destroyed */
  wallsDestroyed: number;
  /** Monsters killed */
  monstersKilled: number;
  /** Power-ups collected */
  powerupsCollected: number;
  /** Number of deaths */
  deaths: number;
  /** Number of respawns */
  respawns: number;
  /** Total damage dealt */
  damageDealt: number;
  /** Friendly fire incidents */
  friendlyFireIncidents: number;
  /** Time alive (milliseconds) */
  survivalTime: number;
}

/**
 * Team-wide game statistics
 */
export interface TeamStats {
  /** Teamwork cooperation score (0.0-1.0) */
  cooperation: number;
  /** Objective completion efficiency */
  efficiency: number;
  /** Total team damage */
  totalDamage: number;
  /** Total team deaths */
  totalDeaths: number;
  /** Objectives completed */
  objectivesCompleted: number;
  /** Gates accidentally destroyed */
  gatesDestroyed: number;
  /** Total monsters defeated */
  monstersDefeated: number;
}

/**
 * Complete game session statistics
 */
export interface GameStatistics {
  /** Associated game ID */
  gameId: EntityId;
  /** Game duration (milliseconds) */
  duration: number;
  /** Individual player statistics */
  playersStats: Map<EntityId, PlayerStats>;
  /** Team performance statistics */
  teamStats: TeamStats;
  /** Significant game events */
  events: GameEvent[];
}

/**
 * Game event types
 */
export enum GameEventType {
  PLAYER_SPAWN = 'player_spawn',
  PLAYER_DEATH = 'player_death',
  BOMB_PLACED = 'bomb_placed',
  BOMB_EXPLODED = 'bomb_exploded',
  WALL_DESTROYED = 'wall_destroyed',
  POWER_UP_COLLECTED = 'power_up_collected',
  GATE_REVEALED = 'gate_revealed',
  GATE_DESTROYED = 'gate_destroyed',
  MONSTER_SPAWNED = 'monster_spawned',
  MONSTER_KILLED = 'monster_killed',
  BOSS_SPAWNED = 'boss_spawned',
  BOSS_DEFEATED = 'boss_defeated',
  OBJECTIVE_COMPLETED = 'objective_completed',
  GAME_WON = 'game_won',
  GAME_LOST = 'game_lost'
}

/**
 * Player game state for active gameplay
 */
export interface PlayerGameState {
  /** Player identifier */
  playerId: EntityId;
  /** Current world position */
  position: Position;
  /** Facing direction */
  direction: Direction;
  /** Current health points */
  health: number;
  /** Maximum health points */
  maxHealth: number;
  /** Alive/dead status */
  alive: boolean;
  /** Current abilities and power-ups */
  abilities: PlayerAbilities;
  /** Carried items */
  inventory: PlayerInventory;
  /** Respawn information (if dead) */
  respawnInfo?: RespawnInfo;
  /** Current input state */
  inputState: InputState;
  /** Last action timestamp */
  lastActionAt: Timestamp;
}

/**
 * Player abilities enhanced by power-ups
 */
export interface PlayerAbilities {
  /** Maximum simultaneous bombs */
  maxBombs: number;
  /** Bomb explosion radius */
  blastRadius: number;
  /** Movement speed multiplier */
  moveSpeed: number;
  /** Can walk through destructible walls */
  wallPass: boolean;
  /** Can walk through bombs */
  bombPass: boolean;
  /** Can kick/push bombs */
  bombKick: boolean;
  /** Damage immunity time (milliseconds) */
  immunity: number;
  /** Overall power level (0-10) */
  powerLevel: number;
  /** Active temporary effects */
  activeEffects: AbilityEffect[];
}

/**
 * Temporary ability effect
 */
export interface AbilityEffect {
  /** Effect identifier */
  id: EntityId;
  /** Effect type */
  type: AbilityEffectType;
  /** Effect strength */
  magnitude: number;
  /** Effect duration (milliseconds) */
  duration: number;
  /** Effect start time */
  startTime: Timestamp;
  /** Stack count for stackable effects */
  stackCount: number;
}

/**
 * Ability effect types
 */
export enum AbilityEffectType {
  SPEED_BOOST = 'speed_boost',
  DAMAGE_IMMUNITY = 'damage_immunity',
  BLAST_ENHANCEMENT = 'blast_enhancement',
  BOMB_CAPACITY = 'bomb_capacity',
  WALL_PENETRATION = 'wall_penetration'
}

/**
 * Player inventory for consumables
 */
export interface PlayerInventory {
  /** Carried items */
  items: InventoryItem[];
  /** Maximum inventory slots */
  maxSlots: number;
  /** Usable consumable items */
  consumables: ConsumableItem[];
}

/**
 * Inventory item types
 */
export enum ItemType {
  HEALTH_POTION = 'health_potion',
  SPEED_BOOST = 'speed_boost',
  SHIELD = 'shield',
  EXTRA_BOMB = 'extra_bomb',
  KEY = 'key'
}

/**
 * Basic inventory item
 */
export interface InventoryItem {
  /** Item identifier */
  id: EntityId;
  /** Item type */
  type: ItemType;
  /** Stack quantity */
  quantity: number;
  /** Acquisition timestamp */
  acquiredAt: Timestamp;
}

/**
 * Consumable item with usage tracking
 */
export interface ConsumableItem extends InventoryItem {
  /** Remaining uses */
  uses: number;
  /** Use cooldown (milliseconds) */
  cooldown: number;
  /** Last use timestamp */
  lastUsedAt?: Timestamp;
}

/**
 * Death causes for respawn system
 */
export enum DeathCause {
  BOMB_EXPLOSION = 'bomb_explosion',
  FRIENDLY_FIRE = 'friendly_fire',
  MONSTER_ATTACK = 'monster_attack',
  BOSS_ATTACK = 'boss_attack',
  ENVIRONMENTAL = 'environmental',
  TIMEOUT = 'timeout'
}

/**
 * Player respawn information
 */
export interface RespawnInfo {
  /** Player being respawned */
  playerId: EntityId;
  /** Death timestamp */
  deathTime: Timestamp;
  /** Respawn timestamp */
  respawnTime: Timestamp;
  /** Countdown seconds remaining */
  countdownSeconds: number;
  /** How player died */
  cause: DeathCause;
  /** Can observe while dead */
  spectatorMode: boolean;
  /** Predetermined spawn location */
  respawnLocation?: Position;
}

/**
 * Available spawn point
 */
export interface SpawnPoint {
  /** Spawn position */
  position: Position;
  /** Safe from immediate danger */
  safe: boolean;
  /** Is a corner spawn location */
  corner: boolean;
  /** Currently occupied by player */
  occupied: boolean;
  /** Spawn preference priority */
  priority: number;
}

/**
 * Player movement input state
 */
export interface MovementInput {
  /** Up key/button pressed */
  up: boolean;
  /** Down key/button pressed */
  down: boolean;
  /** Left key/button pressed */
  left: boolean;
  /** Right key/button pressed */
  right: boolean;
  /** Input strength (0.0-1.0) */
  magnitude: number;
}

/**
 * Player action input state
 */
export interface ActionInput {
  /** Bomb placement action */
  placeBomb: boolean;
  /** Use consumable item */
  useItem: boolean;
  /** Interact with objects */
  interact: boolean;
  /** Speed boost action */
  sprint: boolean;
  /** Selected inventory slot */
  selectedItem?: number;
}

/**
 * Complete player input state
 */
export interface InputState {
  /** Movement controls */
  movement: MovementInput;
  /** Action controls */
  actions: ActionInput;
  /** Input timestamp */
  timestamp: Timestamp;
  /** Server processing flag */
  processed: boolean;
}

// Re-export common types for convenience
export { Direction } from './common';

// Forward declarations for types defined in other files
export interface Monster {
  id: EntityId;
  // Monster properties defined in monster.d.ts
}

export interface Boss extends Monster {
  // Boss properties defined in monster.d.ts
}