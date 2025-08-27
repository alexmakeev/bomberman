# Game Schema

This document defines the core game entities used for game state management and real-time synchronization.

## Game Entity

Represents the overall game session state.

```typescript
interface Game {
  id: string;                    // Unique game identifier
  roomId: string;               // Associated room ID
  status: GameStatus;           // Current game state
  maze: Maze;                   // Game world layout
  players: Map<string, PlayerGameState>;  // Players in game
  bombs: Map<string, Bomb>;     // Active bombs
  powerups: PowerUp[];          // Available power-ups
  monsters: Monster[];          // Active monsters
  boss?: Boss;                  // Boss enemy (if spawned)
  gates: Gate[];               // Exit gates
  objectives: GameObjectives;   // Current objectives
  timer?: GameTimer;           // Game/level timer
  statistics: GameStatistics;   // Match statistics
  createdAt: Date;
  updatedAt: Date;
}

enum GameStatus {
  WAITING = 'waiting',         // Waiting for players
  STARTING = 'starting',       // Countdown to start
  ACTIVE = 'active',           // Game in progress
  PAUSED = 'paused',          // Game paused
  COMPLETED = 'completed',     // Game finished
  TERMINATED = 'terminated'    // Game forcibly ended
}
```

## Maze Entity

Defines the game world layout and destructible environment.

```typescript
interface Maze {
  width: number;               // Maze width in tiles
  height: number;              // Maze height in tiles
  tiles: MazeTile[][];        // 2D grid of maze tiles
  spawnPoints: Position[];     // Player spawn locations
  destructibleWalls: Position[]; // Breakable wall positions
  powerupSpots: Position[];    // Potential power-up locations
}

enum TileType {
  EMPTY = 'empty',            // Walkable space
  WALL = 'wall',              // Solid wall (indestructible)
  DESTRUCTIBLE = 'destructible', // Breakable wall
  GATE = 'gate'               // Exit gate (hidden until revealed)
}

interface MazeTile {
  type: TileType;
  position: Position;
  destructible: boolean;
  revealed: boolean;          // For gates hidden under walls
}
```

## Bomb Entity

Represents bombs placed by players.

```typescript
interface Bomb {
  id: string;                 // Unique bomb identifier
  ownerId: string;            // Player who placed the bomb
  position: Position;         // Bomb location
  timer: number;              // Time until explosion (milliseconds)
  blastRadius: number;        // Explosion radius in tiles
  penetration: number;        // Wall penetration power
  status: BombStatus;
  createdAt: Date;
}

enum BombStatus {
  ACTIVE = 'active',          // Counting down
  EXPLODING = 'exploding',    // Currently exploding
  EXPLODED = 'exploded'       // Explosion finished
}

interface Explosion {
  bombId: string;
  center: Position;
  affectedTiles: Position[];   // All tiles in blast radius
  damage: number;             // Damage amount
  duration: number;           // Explosion visual duration
}
```

## PowerUp Entity

Represents collectible power-ups that enhance player abilities.

```typescript
interface PowerUp {
  id: string;                 // Unique power-up identifier
  type: PowerUpType;          // Power-up category
  position: Position;         // World location
  effect: PowerUpEffect;      // Enhancement provided
  duration?: number;          // Time-limited effects (ms)
  spawnedAt: Date;
  expiresAt?: Date;          // Auto-removal time
}

enum PowerUpType {
  BOMB_CAPACITY = 'bomb_capacity',    // Increase max bombs
  BLAST_RADIUS = 'blast_radius',      // Increase explosion range
  SPEED_BOOST = 'speed_boost',        // Movement speed increase
  WALL_PASS = 'wall_pass',            // Walk through destructible walls
  BOMB_PUSH = 'bomb_push',            // Push/kick bombs
  IMMUNITY = 'immunity'               // Temporary damage immunity
}

interface PowerUpEffect {
  type: PowerUpType;
  magnitude: number;          // Effect strength
  stackable: boolean;         // Can multiple effects stack
  maxStacks?: number;         // Maximum stack limit
}
```

## Gate Entity

Represents exit gates that serve as level objectives.

```typescript
interface Gate {
  id: string;                 // Unique gate identifier
  position: Position;         // Gate location
  status: GateStatus;         // Current gate state
  type: GateType;            // Gate category
  revealedBy?: string;       // Player who revealed gate
  destroyedBy?: string;      // Player who destroyed gate
  associatedWave?: number;   // Monster wave if destroyed
}

enum GateStatus {
  HIDDEN = 'hidden',          // Hidden under destructible wall
  REVEALED = 'revealed',      // Visible and usable
  DESTROYED = 'destroyed',    // Destroyed, unusable
  ACTIVE = 'active'          // Currently being used for exit
}

enum GateType {
  PRIMARY = 'primary',        // Main objective gate
  SECONDARY = 'secondary',    // Alternative exit
  EMERGENCY = 'emergency'     // Backup exit (harder to reach)
}
```

## Game Objectives

Defines win/lose conditions and current objectives.

```typescript
interface GameObjectives {
  primary: ObjectiveType;     // Main objective
  secondary?: ObjectiveType[];  // Alternative objectives
  current: ObjectiveStatus;   // Current objective progress
  completed: ObjectiveType[]; // Completed objectives
  failed: ObjectiveType[];    // Failed objectives
}

enum ObjectiveType {
  DEFEAT_BOSS = 'defeat_boss',        // Kill boss enemy
  REACH_EXIT = 'reach_exit',          // All players reach gate
  SURVIVE_WAVES = 'survive_waves',    // Survive monster waves
  COLLECT_ITEMS = 'collect_items',    // Gather specific items
  TIME_LIMIT = 'time_limit'           // Complete within time
}

interface ObjectiveStatus {
  type: ObjectiveType;
  progress: number;           // 0.0 to 1.0
  requirement: any;           // Objective-specific data
  timeLimit?: number;         // Optional time constraint
}
```

## Game Timer

Manages time-based game mechanics.

```typescript
interface GameTimer {
  startTime: Date;            // Game start timestamp
  elapsed: number;            // Elapsed time (milliseconds)
  remaining?: number;         // Time remaining for objectives
  paused: boolean;            // Timer pause state
  events: TimerEvent[];       // Scheduled events
}

interface TimerEvent {
  id: string;
  triggerAt: number;          // Trigger time (elapsed ms)
  type: TimerEventType;
  executed: boolean;
  data?: any;                 // Event-specific data
}

enum TimerEventType {
  MONSTER_WAVE = 'monster_wave',
  BOSS_SPAWN = 'boss_spawn',
  POWER_UP_SPAWN = 'power_up_spawn',
  WARNING = 'warning',
  GAME_END = 'game_end'
}
```

## Game Statistics

Tracks match performance and statistics.

```typescript
interface GameStatistics {
  gameId: string;
  duration: number;           // Game duration (milliseconds)
  playersStats: Map<string, PlayerStats>;
  teamStats: TeamStats;
  events: GameEvent[];        // Significant game events
}

interface PlayerStats {
  playerId: string;
  bombsPlaced: number;
  wallsDestroyed: number;
  monstersKilled: number;
  powerupsCollected: number;
  deaths: number;
  respawns: number;
  damageDealt: number;
  friendlyFireIncidents: number;
  survivalTime: number;       // Time alive (milliseconds)
}

interface TeamStats {
  cooperation: number;        // Teamwork score (0.0 to 1.0)
  efficiency: number;         // Objective completion efficiency
  totalDamage: number;
  totalDeaths: number;
  objectivesCompleted: number;
  gatesDestroyed: number;     // Accidental gate destructions
  monstersDefeated: number;
}
```

## Common Types

Shared data types used across game entities.

```typescript
interface Position {
  x: number;                  // X coordinate (tile-based)
  y: number;                  // Y coordinate (tile-based)
}

interface Vector2D {
  x: number;                  // X component
  y: number;                  // Y component
}

interface GameEvent {
  id: string;
  type: GameEventType;
  timestamp: Date;
  playerId?: string;          // Associated player (if applicable)
  position?: Position;        // Event location (if applicable)
  data: any;                  // Event-specific data
}

enum GameEventType {
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
```

## Usage Notes

- All positions use a tile-based coordinate system
- Game state must be synchronized across all connected clients
- Timer precision should be consistent across server/client
- Statistics are calculated in real-time for live updates
- Events provide audit trail and replay capabilities
- Power-up effects can be temporary or permanent
- Gate mechanics support both cooperative completion and accidental destruction scenarios