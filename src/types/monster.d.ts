/**
 * Monster and AI-related type definitions.
 * Includes monsters, bosses, AI systems, combat mechanics, and wave spawning.
 */

import { Position, Vector2D, EntityId, Timestamp, AnimationState, GameEvent } from './common';
import { DifficultyLevel } from './game';

/**
 * Monster categories
 */
export enum MonsterType {
  BASIC_WALKER = 'basic_walker',
  WALL_HUGGER = 'wall_hugger',
  BOMB_CHASER = 'bomb_chaser',
  PLAYER_HUNTER = 'player_hunter',
  GUARD = 'guard',
  SPAWNER = 'spawner',
  FLYING = 'flying',
  ARMORED = 'armored',
  FAST = 'fast',
  MINI_BOSS = 'mini_boss'
}

/**
 * Monster status states
 */
export enum MonsterStatus {
  SPAWNING = 'spawning',
  IDLE = 'idle',
  PATROLLING = 'patrolling',
  HUNTING = 'hunting',
  ATTACKING = 'attacking',
  FLEEING = 'fleeing',
  STUNNED = 'stunned',
  DYING = 'dying',
  DEAD = 'dead'
}

/**
 * Main monster entity
 */
export interface Monster {
  /** Unique monster identifier */
  id: EntityId;
  /** Monster category */
  type: MonsterType;
  /** Current world position */
  position: Position;
  /** Current health points */
  health: number;
  /** Maximum health points */
  maxHealth: number;
  /** Current monster state */
  status: MonsterStatus;
  /** AI behavior state */
  aiState: AIState;
  /** Combat statistics */
  stats: MonsterStats;
  /** Special abilities */
  abilities: MonsterAbilities;
  /** Behavior configuration */
  behavior: MonsterBehavior;
  /** Spawn information */
  spawnInfo: SpawnInfo;
  /** Last action timestamp */
  lastActionAt: Timestamp;
}

/**
 * Boss monster types
 */
export enum BossType {
  FLAME_KING = 'flame_king',
  STONE_GUARDIAN = 'stone_guardian',
  SHADOW_STALKER = 'shadow_stalker',
  CRYSTAL_MAGE = 'crystal_mage',
  METAL_COLOSSUS = 'metal_colossus'
}

/**
 * Boss phase patterns
 */
export enum BossPhasePattern {
  AGGRESSIVE = 'aggressive',
  DEFENSIVE = 'defensive',
  RANGED = 'ranged',
  SUMMON = 'summon',
  BERSERKER = 'berserker'
}

/**
 * Boss combat phase
 */
export interface BossPhase {
  /** Phase sequence number */
  phaseNumber: number;
  /** Health % to enter phase */
  healthThreshold: number;
  /** Phase time limit (milliseconds) */
  duration?: number;
  /** Available attacks in phase */
  attacks: BossAttack[];
  /** Movement/targeting pattern */
  behavior: BossPhasePattern;
  /** Special abilities active */
  abilities: string[];
  /** Monsters spawned in phase */
  minions?: MonsterSpawn[];
  /** Stage hazards */
  environmental?: EnvironmentalEffect[];
}

/**
 * Phase transition trigger
 */
export interface PhaseTransition {
  /** Target phase number */
  toPhase: number;
  /** Trigger conditions */
  conditions: TransitionCondition[];
  /** Transition animation */
  animation?: string;
  /** Transition duration (milliseconds) */
  duration: number;
}

/**
 * Boss entity (extends Monster)
 */
export interface Boss extends Monster {
  /** Specific boss variant */
  bossType: BossType;
  /** Combat phases */
  phases: BossPhase[];
  /** Active phase index */
  currentPhase: number;
  /** Phase change triggers */
  phaseTransitions: PhaseTransition[];
  /** Available attacks */
  attacks: BossAttack[];
  /** Vulnerability windows */
  weaknesses: BossWeakness[];
  /** Rage mode timer */
  enrageTimer?: number;
  /** Spawned monster IDs */
  summonedMinions: EntityId[];
  /** How boss can be defeated */
  defeatConditions: DefeatCondition[];
  /** Victory rewards */
  rewards: BossReward;
}

/**
 * AI goal types
 */
export enum AIGoalType {
  PATROL = 'patrol',
  HUNT_PLAYER = 'hunt_player',
  HUNT_NEAREST = 'hunt_nearest',
  DEFEND_AREA = 'defend_area',
  FLEE_DANGER = 'flee_danger',
  ATTACK_TARGET = 'attack_target',
  COLLECT_ITEM = 'collect_item',
  RETURN_HOME = 'return_home'
}

/**
 * AI goal definition
 */
export interface AIGoal {
  /** Goal category */
  type: AIGoalType;
  /** Goal importance (0-10) */
  priority: number;
  /** Goal target ID */
  target?: EntityId;
  /** Goal location */
  position?: Position;
  /** Goal time limit (milliseconds) */
  duration?: number;
  /** Goal completion criteria */
  conditions: AICondition[];
}

/**
 * Pathfinding state
 */
export interface PathfindingState {
  /** Planned route */
  currentPath: Position[];
  /** Next waypoint index */
  currentWaypoint: number;
  /** Next path update */
  recalculateAt: Timestamp;
  /** Path blocked flag */
  blocked: boolean;
  /** Failed pathfinding attempts */
  retryAttempts: number;
  /** Last calculation timestamp */
  lastCalculatedAt: Timestamp;
}

/**
 * AI decision state
 */
export interface AIState {
  /** Associated monster ID */
  monsterId: EntityId;
  /** Primary objective */
  currentGoal: AIGoal;
  /** Target player/object ID */
  targetId?: EntityId;
  /** Target location */
  targetPosition?: Position;
  /** Movement planning */
  pathfinding: PathfindingState;
  /** Behavior decision tree */
  decisionTree: AIDecisionNode[];
  /** Remembered information */
  memory: AIMemory;
  /** Event responses */
  reactions: AIReaction[];
  /** Last AI update */
  lastDecisionAt: Timestamp;
}

/**
 * Monster combat statistics
 */
export interface MonsterStats {
  /** Health points */
  health: number;
  /** Attack damage */
  attack: number;
  /** Damage reduction */
  defense: number;
  /** Movement speed */
  speed: number;
  /** Attack reach (tiles) */
  attackRange: number;
  /** Player detection radius */
  detectionRange: number;
  /** Attacks per second */
  attackRate: number;
  /** Hit chance (0.0-1.0) */
  accuracy: number;
  /** Critical hit probability */
  criticalChance: number;
  /** Status effect resistances */
  statusResistances: Map<StatusEffect, number>;
}

/**
 * Status effects for entities
 */
export enum StatusEffect {
  STUN = 'stun',
  SLOW = 'slow',
  POISON = 'poison',
  CONFUSION = 'confusion',
  FEAR = 'fear',
  RAGE = 'rage'
}

/**
 * Monster behavior patterns
 */
export interface MonsterBehavior {
  /** Aggression level (0.0-1.0) */
  aggressionLevel: number;
  /** AI complexity (0.0-1.0) */
  intelligence: number;
  /** Flee trigger (0.0-1.0) */
  fearThreshold: number;
  /** Cooperates with others */
  packBehavior: boolean;
  /** Patrol/defend radius */
  territorySize: number;
  /** Help call range */
  alertRadius: number;
  /** Chase duration (milliseconds) */
  pursuitTime: number;
  /** Movement/action patterns */
  patterns: BehaviorPattern[];
  /** Event-based responses */
  triggers: BehaviorTrigger[];
}

/**
 * AI memory system
 */
export interface AIMemory {
  /** Known player positions */
  knownPlayerPositions: Map<EntityId, PositionMemory>;
  /** Hazardous areas */
  dangerZones: DangerZone[];
  /** Notable locations */
  interestPoints: InterestPoint[];
  /** Recent events */
  recentEvents: AIEvent[];
  /** Adaptive behavior data */
  learningData: LearningData;
}

/**
 * Remembered player position
 */
export interface PositionMemory {
  /** Player identifier */
  playerId: EntityId;
  /** Last known location */
  lastSeenPosition: Position;
  /** Observation timestamp */
  lastSeenAt: Timestamp;
  /** Position accuracy (0.0-1.0) */
  confidence: number;
  /** Predicted vs observed */
  predicted: boolean;
}

/**
 * Danger zone types
 */
export enum DangerType {
  BOMB = 'bomb',
  EXPLOSION = 'explosion',
  PLAYER_TRAP = 'player_trap',
  ENVIRONMENTAL = 'environmental'
}

/**
 * Hazardous area
 */
export interface DangerZone {
  /** Danger center point */
  center: Position;
  /** Affected area radius */
  radius: number;
  /** Danger level (0.0-1.0) */
  severity: number;
  /** Hazard category */
  type: DangerType;
  /** Danger expiry time */
  expiresAt?: Timestamp;
}

/**
 * Monster spawn trigger types
 */
export enum TriggerType {
  TIME_ELAPSED = 'time_elapsed',
  PLAYER_PROXIMITY = 'player_proximity',
  GATE_DESTROYED = 'gate_destroyed',
  MONSTER_DEATH = 'monster_death',
  BOSS_PHASE = 'boss_phase',
  MANUAL = 'manual'
}

/**
 * Spawn trigger condition
 */
export interface SpawnTrigger {
  /** Trigger category */
  type: TriggerType;
  /** Trigger-specific condition */
  condition: any;
  /** Single activation only */
  once: boolean;
  /** Retrigger delay (milliseconds) */
  cooldown?: number;
}

/**
 * Monster spawn configuration
 */
export interface MonsterSpawn {
  /** Spawn identifier */
  id: EntityId;
  /** Monster type to spawn */
  type: MonsterType;
  /** Fixed spawn location */
  position?: Position;
  /** Flexible spawn area */
  spawnZone?: SpawnZone;
  /** Spawn condition */
  trigger: SpawnTrigger;
  /** Spawn delay (milliseconds) */
  delay: number;
  /** Number to spawn */
  count: number;
  /** Max simultaneous spawns */
  maxActive: number;
  /** Respawn when defeated */
  respawn: boolean;
  /** Respawn delay (milliseconds) */
  respawnDelay: number;
  /** Wave spawn data */
  waveInfo?: WaveInfo;
}

/**
 * Spawn area definition
 */
export interface SpawnZone {
  /** Zone center */
  center: Position;
  /** Spawn radius */
  radius: number;
  /** Min distance from players */
  safeDistance: number;
  /** Allowed spawn tiles */
  validTiles: TileType[];
  /** Forbidden spawn points */
  blockedAreas: Position[];
}

/**
 * Wave spawn information
 */
export interface WaveInfo {
  /** Wave sequence number */
  waveNumber: number;
  /** Total waves in sequence */
  totalWaves?: number;
  /** Wave difficulty multiplier */
  powerLevel: number;
  /** Monster composition */
  composition: WaveComposition[];
  /** Spawn interval (milliseconds) */
  spacing: number;
}

/**
 * Wave monster composition
 */
export interface WaveComposition {
  /** Monster category */
  monsterType: MonsterType;
  /** Quantity in wave */
  count: number;
  /** Spawn sequence */
  spawnOrder: number;
  /** Stat multiplier */
  powerBoost?: number;
}

/**
 * Boss attack types
 */
export enum AttackType {
  MELEE = 'melee',
  RANGED = 'ranged',
  AREA = 'area',
  SUMMON = 'summon',
  ENVIRONMENTAL = 'environmental',
  STATUS = 'status'
}

/**
 * Boss special attack
 */
export interface BossAttack {
  /** Attack identifier */
  id: EntityId;
  /** Attack name */
  name: string;
  /** Attack category */
  type: AttackType;
  /** Base damage */
  damage: number;
  /** Attack range */
  range: number;
  /** Area damage pattern */
  areaOfEffect?: AOEPattern;
  /** Windup time (milliseconds) */
  castTime: number;
  /** Reuse delay (milliseconds) */
  cooldown: number;
  /** Animation identifier */
  animation: string;
  /** Additional effects */
  effects: AttackEffect[];
  /** Target selection */
  targeting: TargetingPattern;
  /** Telegraph duration (milliseconds) */
  warningTime: number;
}

// Additional interfaces would continue here...
// For brevity, I'll define the essential ones

export interface SpawnInfo {
  spawnTime: Timestamp;
  spawnLocation: Position;
  spawnReason: string;
  waveNumber?: number;
}

export interface MonsterAbilities {
  passiveAbilities: string[];
  activeAbilities: string[];
  ultimateAbility?: string;
}

export interface AICondition {
  type: string;
  value: any;
}

export interface AIDecisionNode {
  id: string;
  condition: AICondition;
  action: string;
  children: AIDecisionNode[];
}

export interface AIReaction {
  trigger: string;
  response: string;
  priority: number;
}

export interface AIEvent {
  type: string;
  timestamp: Timestamp;
  data: any;
}

export interface LearningData {
  playerPatterns: Map<EntityId, any>;
  successfulTactics: string[];
  failedTactics: string[];
}

export interface BehaviorPattern {
  id: string;
  actions: string[];
  conditions: string[];
}

export interface BehaviorTrigger {
  event: string;
  response: string;
  cooldown: number;
}

export interface InterestPoint {
  position: Position;
  type: string;
  importance: number;
  lastVisited?: Timestamp;
}

export interface TransitionCondition {
  type: string;
  value: any;
}

export interface EnvironmentalEffect {
  type: string;
  area: Position[];
  duration: number;
  damage?: number;
}

export interface BossWeakness {
  type: string;
  multiplier: number;
  duration: number;
  conditions: string[];
}

export interface DefeatCondition {
  type: string;
  requirement: any;
}

export interface BossReward {
  experience: number;
  items: string[];
  achievements?: string[];
}

export interface AOEPattern {
  shape: string;
  size: number;
  center: string;
}

export interface AttackEffect {
  type: string;
  magnitude: number;
  duration: number;
}

export interface TargetingPattern {
  type: string;
  count: number;
  conditions: string[];
}

// Re-export common types
export { TileType } from './game';

/**
 * Monster event types
 */
export enum MonsterEventType {
  MONSTER_SPAWNED = 'monster_spawned',
  MONSTER_DIED = 'monster_died',
  MONSTER_ATTACK = 'monster_attack',
  MONSTER_ABILITY_USED = 'monster_ability_used',
  MONSTER_STATUS_CHANGED = 'monster_status_changed',
  PLAYER_DETECTED = 'player_detected',
  PLAYER_LOST = 'player_lost',
  BOSS_PHASE_CHANGE = 'boss_phase_change',
  WAVE_STARTED = 'wave_started',
  WAVE_COMPLETED = 'wave_completed'
}

/**
 * Monster-related game event
 */
export interface MonsterEvent extends GameEvent {
  /** Associated monster ID */
  monsterId: EntityId;
  /** Event category */
  type: MonsterEventType;
  /** Associated game ID */
  gameId: EntityId;
}