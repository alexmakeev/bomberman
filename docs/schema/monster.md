# Monster Schema

This document defines monster entities, boss mechanics, and AI systems for enemy behavior.

## Monster Entity

Represents enemy creatures that players must defeat cooperatively.

```typescript
interface Monster {
  id: string;                    // Unique monster identifier
  type: MonsterType;             // Monster category
  position: Position;            // Current world position
  health: number;                // Current health points
  maxHealth: number;             // Maximum health
  status: MonsterStatus;         // Current state
  aiState: AIState;             // AI behavior state
  stats: MonsterStats;          // Combat statistics
  abilities: MonsterAbilities;   // Special abilities
  behavior: MonsterBehavior;     // Behavior configuration
  spawnInfo: SpawnInfo;         // Spawn details
  lastActionAt: Date;           // Last action timestamp
}

enum MonsterType {
  BASIC_WALKER = 'basic_walker',     // Simple moving enemy
  WALL_HUGGER = 'wall_hugger',       // Follows walls
  BOMB_CHASER = 'bomb_chaser',       // Attracted to bombs
  PLAYER_HUNTER = 'player_hunter',   // Actively hunts players
  GUARD = 'guard',                   // Protects specific areas
  SPAWNER = 'spawner',               // Creates other monsters
  FLYING = 'flying',                 // Can fly over walls
  ARMORED = 'armored',               // High defense
  FAST = 'fast',                     // High speed
  MINI_BOSS = 'mini_boss'            // Stronger variant
}

enum MonsterStatus {
  SPAWNING = 'spawning',             // Being created
  IDLE = 'idle',                     // Inactive/waiting
  PATROLLING = 'patrolling',         // Moving in pattern
  HUNTING = 'hunting',               // Actively chasing player
  ATTACKING = 'attacking',           // Performing attack
  FLEEING = 'fleeing',               // Escaping from danger
  STUNNED = 'stunned',               // Temporarily disabled
  DYING = 'dying',                   // Death animation
  DEAD = 'dead'                      // Defeated
}
```

## Boss Entity

Special powerful enemy that serves as primary objective.

```typescript
interface Boss extends Monster {
  bossType: BossType;            // Specific boss variant
  phases: BossPhase[];           // Combat phases
  currentPhase: number;          // Active phase index
  phaseTransitions: PhaseTransition[]; // Phase change triggers
  attacks: BossAttack[];         // Available attacks
  weaknesses: BossWeakness[];    // Vulnerability windows
  enrageTimer?: number;          // Rage mode timer
  summonedMinions: string[];     // Spawned monster IDs
  defeatConditions: DefeatCondition[]; // How boss can be beaten
  rewards: BossReward;           // Victory rewards
}

enum BossType {
  FLAME_KING = 'flame_king',         // Fire-based attacks
  STONE_GUARDIAN = 'stone_guardian', // High defense, ground attacks
  SHADOW_STALKER = 'shadow_stalker', // Stealth and speed
  CRYSTAL_MAGE = 'crystal_mage',     // Magic projectiles
  METAL_COLOSSUS = 'metal_colossus' // Massive armored boss
}

interface BossPhase {
  phaseNumber: number;           // Phase sequence (1, 2, 3...)
  healthThreshold: number;       // Health % to enter phase
  duration?: number;             // Phase time limit (ms)
  attacks: BossAttack[];         // Available attacks in phase
  behavior: BossPhasePattern;    // Movement/targeting pattern
  abilities: string[];           // Special abilities active
  minions?: MonsterSpawn[];      // Monsters spawned in phase
  environmental?: EnvironmentalEffect[]; // Stage hazards
}

enum BossPhasePattern {
  AGGRESSIVE = 'aggressive',     // Direct assault
  DEFENSIVE = 'defensive',       // Protective stance
  RANGED = 'ranged',            // Long-distance attacks
  SUMMON = 'summon',            // Focus on minion creation
  BERSERKER = 'berserker'       // Chaotic high-speed attacks
}
```

## AI State

Controls monster artificial intelligence and decision-making.

```typescript
interface AIState {
  monsterId: string;             // Associated monster
  currentGoal: AIGoal;           // Primary objective
  targetId?: string;             // Target player/object ID
  targetPosition?: Position;     // Target location
  pathfinding: PathfindingState; // Movement planning
  decisionTree: AIDecisionNode[]; // Behavior tree
  memory: AIMemory;              // Remembered information
  reactions: AIReaction[];       // Response to events
  lastDecisionAt: Date;          // Last AI update
}

interface AIGoal {
  type: AIGoalType;              // Goal category
  priority: number;              // Goal importance (0-10)
  target?: string;               // Goal target ID
  position?: Position;           // Goal location
  duration?: number;             // Goal time limit (ms)
  conditions: AICondition[];     // Goal completion criteria
}

enum AIGoalType {
  PATROL = 'patrol',             // Follow patrol route
  HUNT_PLAYER = 'hunt_player',   // Chase specific player
  HUNT_NEAREST = 'hunt_nearest', // Chase closest player
  DEFEND_AREA = 'defend_area',   // Protect location
  FLEE_DANGER = 'flee_danger',   // Escape threats
  ATTACK_TARGET = 'attack_target', // Combat engagement
  COLLECT_ITEM = 'collect_item', // Gather objects
  RETURN_HOME = 'return_home'    // Return to spawn
}

interface PathfindingState {
  currentPath: Position[];       // Planned route
  currentWaypoint: number;       // Next waypoint index
  recalculateAt: Date;          // Next path update
  blocked: boolean;              // Path blocked
  retryAttempts: number;        // Failed pathfinding attempts
  lastCalculatedAt: Date;       // Last pathfinding calculation
}

interface AIMemory {
  knownPlayerPositions: Map<string, PositionMemory>; // Player locations
  dangerZones: DangerZone[];     // Hazardous areas
  interestPoints: InterestPoint[]; // Notable locations
  recentEvents: AIEvent[];       // Recent occurrences
  learningData: LearningData;    // Adaptive behavior data
}

interface PositionMemory {
  playerId: string;              // Player identifier
  lastSeenPosition: Position;    // Last known location
  lastSeenAt: Date;              // When last observed
  confidence: number;            // Position accuracy (0.0-1.0)
  predicted: boolean;            // Predicted vs observed
}

interface DangerZone {
  center: Position;              // Danger center point
  radius: number;                // Affected area radius
  severity: number;              // Danger level (0.0-1.0)
  type: DangerType;             // Hazard category
  expiresAt?: Date;             // When danger expires
}

enum DangerType {
  BOMB = 'bomb',                 // Active bomb
  EXPLOSION = 'explosion',       // Recent explosion area
  PLAYER_TRAP = 'player_trap',   // Player ambush zone
  ENVIRONMENTAL = 'environmental' // Stage hazard
}
```

## Monster Statistics

Combat and movement statistics for monsters.

```typescript
interface MonsterStats {
  health: number;                // Health points
  attack: number;                // Attack damage
  defense: number;               // Damage reduction
  speed: number;                 // Movement speed
  attackRange: number;           // Attack reach (tiles)
  detectionRange: number;        // Player detection radius
  attackRate: number;            // Attacks per second
  accuracy: number;              // Hit chance (0.0-1.0)
  criticalChance: number;        // Critical hit probability
  statusResistances: Map<StatusEffect, number>; // Status immunity
}

enum StatusEffect {
  STUN = 'stun',                 // Cannot move/attack
  SLOW = 'slow',                 // Reduced speed
  POISON = 'poison',             // Damage over time
  CONFUSION = 'confusion',       // Random movement
  FEAR = 'fear',                 // Flee from players
  RAGE = 'rage'                  // Increased attack/speed
}

interface MonsterAbilities {
  passiveAbilities: PassiveAbility[]; // Always-active abilities
  activeAbilities: ActiveAbility[];   // Triggered abilities
  ultimateAbility?: UltimateAbility;  // Powerful special attack
  resistances: DamageResistance[];    // Damage type resistances
}

interface PassiveAbility {
  id: string;                    // Ability identifier
  name: string;                  // Ability name
  description: string;           // Ability description
  effect: AbilityEffect;         // Mechanical effect
}

interface ActiveAbility {
  id: string;                    // Ability identifier
  name: string;                  // Ability name
  description: string;           // Ability description
  cooldown: number;              // Reuse delay (ms)
  lastUsed?: Date;               // Last activation time
  manaCost?: number;             // Resource cost
  conditions: ActivationCondition[]; // Usage requirements
  effect: AbilityEffect;         // Mechanical effect
}
```

## Monster Behavior

Defines monster behavior patterns and reactions.

```typescript
interface MonsterBehavior {
  aggressionLevel: number;       // Aggression (0.0-1.0)
  intelligence: number;          // AI complexity (0.0-1.0)
  fearThreshold: number;         // Flee trigger (0.0-1.0)
  packBehavior: boolean;         // Cooperates with other monsters
  territorySize: number;         // Patrol/defend radius
  alertRadius: number;           // Help call range
  pursuitTime: number;           // Chase duration (ms)
  patterns: BehaviorPattern[];   // Movement/action patterns
  triggers: BehaviorTrigger[];   // Event-based responses
}

interface BehaviorPattern {
  id: string;                    // Pattern identifier
  type: PatternType;             // Pattern category
  sequence: PatternAction[];     // Action sequence
  duration: number;              // Pattern duration (ms)
  repeatCount?: number;          // Repetition limit
  conditions: PatternCondition[]; // Activation requirements
}

enum PatternType {
  PATROL = 'patrol',             // Regular movement
  AMBUSH = 'ambush',            // Hide and attack
  CIRCLE = 'circle',            // Circular movement
  ZIGZAG = 'zigzag',            // Evasive movement
  GUARD = 'guard',              // Static defense
  SWARM = 'swarm'               // Group coordination
}

interface PatternAction {
  type: ActionType;              // Action category
  direction?: Direction;         // Movement direction
  duration: number;              // Action duration (ms)
  target?: string;               // Action target
  parameters?: any;              // Action-specific data
}

enum ActionType {
  MOVE = 'move',                 // Movement
  WAIT = 'wait',                 // Pause
  ATTACK = 'attack',             // Combat action
  ABILITY = 'ability',           // Special ability
  ALERT = 'alert',               // Call for help
  FLEE = 'flee'                  // Escape action
}
```

## Monster Spawning

Controls when and where monsters appear.

```typescript
interface MonsterSpawn {
  id: string;                    // Spawn identifier
  type: MonsterType;             // Monster to spawn
  position?: Position;           // Spawn location (if fixed)
  spawnZone?: SpawnZone;         // Spawn area (if flexible)
  trigger: SpawnTrigger;         // Spawn condition
  delay: number;                 // Spawn delay (ms)
  count: number;                 // Number to spawn
  maxActive: number;             // Max simultaneous spawns
  respawn: boolean;              // Respawn when defeated
  respawnDelay: number;          // Respawn delay (ms)
  waveInfo?: WaveInfo;          // Wave spawn data
}

interface SpawnZone {
  center: Position;              // Zone center
  radius: number;                // Spawn radius
  safeDistance: number;          // Min distance from players
  validTiles: TileType[];        // Allowed spawn tiles
  blockedAreas: Position[];      // Forbidden spawn points
}

interface SpawnTrigger {
  type: TriggerType;             // Trigger category
  condition: any;                // Trigger-specific condition
  once: boolean;                 // Single activation
  cooldown?: number;             // Retrigger delay (ms)
}

enum TriggerType {
  TIME_ELAPSED = 'time_elapsed', // After X milliseconds
  PLAYER_PROXIMITY = 'player_proximity', // Player nearby
  GATE_DESTROYED = 'gate_destroyed',     // Gate destruction
  MONSTER_DEATH = 'monster_death',       // Monster defeated
  BOSS_PHASE = 'boss_phase',             // Boss phase change
  MANUAL = 'manual'                      // Explicitly triggered
}

interface WaveInfo {
  waveNumber: number;            // Wave sequence number
  totalWaves?: number;           // Total waves in sequence
  powerLevel: number;            // Wave difficulty multiplier
  composition: WaveComposition[]; // Monster mix
  spacing: number;               // Spawn interval between monsters (ms)
}

interface WaveComposition {
  monsterType: MonsterType;      // Monster category
  count: number;                 // Quantity in wave
  spawnOrder: number;            // Spawn sequence
  powerBoost?: number;           // Stat multiplier
}
```

## Boss Attacks

Special attacks and abilities for boss enemies.

```typescript
interface BossAttack {
  id: string;                    // Attack identifier
  name: string;                  // Attack name
  type: AttackType;              // Attack category
  damage: number;                // Base damage
  range: number;                 // Attack range
  areaOfEffect?: AOEPattern;     // Area damage pattern
  castTime: number;              // Windup time (ms)
  cooldown: number;              // Reuse delay (ms)
  animation: string;             // Animation identifier
  effects: AttackEffect[];       // Additional effects
  targeting: TargetingPattern;   // How targets are selected
  warningTime: number;           // Telegraph duration (ms)
}

enum AttackType {
  MELEE = 'melee',               // Close-range physical
  RANGED = 'ranged',             // Projectile attack
  AREA = 'area',                 // Area of effect
  SUMMON = 'summon',             // Create minions
  ENVIRONMENTAL = 'environmental', // Stage hazard
  STATUS = 'status'              // Apply debuffs
}

interface AOEPattern {
  shape: AOEShape;               // Damage area shape
  size: number;                  // Pattern size
  center: AOECenter;             // Pattern origin
  duration: number;              // Effect duration (ms)
}

enum AOEShape {
  CIRCLE = 'circle',             // Circular area
  CONE = 'cone',                 // Directional cone
  LINE = 'line',                 // Linear beam
  CROSS = 'cross',               // Plus-shaped
  RING = 'ring'                  // Hollow circle
}

enum AOECenter {
  BOSS = 'boss',                 // Centered on boss
  TARGET = 'target',             // Centered on target
  GROUND = 'ground'              // Ground-targeted
}

interface TargetingPattern {
  type: TargetType;              // Target selection method
  count: number;                 // Number of targets
  conditions: TargetCondition[]; // Target requirements
  priority: TargetPriority[];    // Target preference order
}

enum TargetType {
  NEAREST = 'nearest',           // Closest player
  FARTHEST = 'farthest',         // Most distant player
  RANDOM = 'random',             // Random selection
  ALL = 'all',                   // All players
  LOWEST_HEALTH = 'lowest_health', // Weakest player
  HIGHEST_THREAT = 'highest_threat' // Most dangerous player
}
```

## Monster Events

Events generated by monster actions and AI decisions.

```typescript
interface MonsterEvent {
  id: string;                    // Event identifier
  monsterId: string;             // Associated monster
  type: MonsterEventType;        // Event category
  timestamp: Date;               // Event occurrence time
  data: any;                     // Event-specific data
  gameId: string;                // Associated game
}

enum MonsterEventType {
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
```

## Usage Notes

- Monster AI updates should be frame-rate independent
- Pathfinding calculations are expensive and should be cached/throttled
- Boss phases provide escalating difficulty and variety
- Monster waves scale with destroyed gates and game progression
- AI memory enables adaptive behavior and learning
- Spawn triggers support both scripted and dynamic monster appearance
- Status effects provide tactical depth and counterplay opportunities
- Boss attacks include telegraph warnings for fair gameplay
- Monster events enable analytics and replay functionality
- Cooperative gameplay requires monsters that encourage teamwork rather than individual play