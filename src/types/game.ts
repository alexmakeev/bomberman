/**
 * Game Types and Interfaces
 * Core TypeScript definitions for the cooperative multiplayer Bomberman game
 * 
 * @see docs/front-end/02-component-structure.md - Component interfaces
 * @see docs/front-end/03-state-management.md - Store type definitions
 */

// Base Types
export type Direction = 'up' | 'down' | 'left' | 'right'
export type GameState = 'waiting' | 'starting' | 'playing' | 'paused' | 'ended'
export type PlayerColor = 'red' | 'blue' | 'green' | 'yellow' | 'purple' | 'orange'
export type PowerUpType = 'bomb_count' | 'bomb_power' | 'speed_boost' | 'health' | 'max_health' | 'speed_boost_temp'
export type CellType = 0 | 1 | 2 // 0 = empty, 1 = wall, 2 = destructible
export type BossType = 'fire' | 'ice' | 'earth' | 'shadow'
export type MonsterType = 'basic' | 'fast' | 'tank' | 'smart'

// Position and Geometry
export interface Position {
  x: number
  y: number
}

export interface Size {
  width: number
  height: number
}

export interface Rectangle extends Position, Size {}

// Player Interface
export interface Player {
  id: string
  name: string
  color?: PlayerColor
  position: Position
  health: number
  maxHealth: number
  bombCount: number
  maxBombs: number
  bombPower: number
  speed: number
  isAlive: boolean
  isMoving: boolean
  direction: Direction | null
  score: number
  powerUps: PowerUpType[]
  respawnTimer: number
  lastMoveTime?: number
}

// Game Entities
export interface Bomb {
  id: string
  position: Position
  ownerId: string
  timer: number
  power: number
  createdAt: number
}

export interface Explosion {
  id: string
  center: Position
  cells: Position[]
  damage: number
  createdAt: number
  duration: number
}

export interface PowerUp {
  id: string
  type: PowerUpType
  position: Position
  createdAt: number
  duration?: number
  isCollected: boolean
}

export interface Monster {
  id: string
  type: MonsterType
  position: Position
  health: number
  maxHealth: number
  speed: number
  isAlive: boolean
  direction: Direction
  isMoving: boolean
  lastMoveTime: number
  pathfinding: {
    target: Position | null
    path: Position[]
    lastUpdate: number
  }
}

export interface Boss {
  id: string
  type: BossType
  position: Position
  health: number
  maxHealth: number
  phase: number
  isAlive: boolean
  isMoving: boolean
  direction: Direction | null
  lastAttackTime: number
  attackCooldown: number
  abilities: string[]
  vulnerabilities: string[]
  resistances: string[]
}

// Game Room and Session
export interface GameRoom {
  id: string
  name: string
  hostId: string
  maxPlayers: number
  currentPlayers: number
  gameState: GameState
  gameMode: 'cooperative' | 'versus'
  difficulty: 'easy' | 'normal' | 'hard'
  timeLimit: number
  settings: GameSettings
  createdAt: number
}

export interface GameSettings {
  maxHealth: number
  startingBombs: number
  startingPower: number
  startingSpeed: number
  respawnTime: number
  friendlyFire: boolean
  powerUpSpawnRate: number
  monsterSpawnRate: number
}

// Maze and Level
export type MazeCell = CellType
export type Maze = MazeCell[][]

export interface Level {
  id: number
  name: string
  maze: Maze
  objective: string
  timeLimit: number
  boss: BossType | null
  monsterTypes: MonsterType[]
  powerUpTypes: PowerUpType[]
}

// Game Statistics
export interface GameStatistics {
  playTime: number
  totalPlayers: number
  totalBombs: number
  totalScore: number
  blocksDestroyed: number
  monstersKilled: number
  powerUpsCollected: number
  deaths: number
  assists: number
}

// Events and Actions
export interface GameEvent {
  id: string
  type: string
  data: any
  timestamp: number
  playerId?: string
}

export interface PlayerAction {
  type: 'move' | 'stop' | 'bomb' | 'powerup_collect'
  data: any
  timestamp: number
}

// Input and Controls
export interface InputState {
  touches: TouchState[]
  keys: Map<string, KeyState>
  movement: MovementState
  bombAction: BombActionState
}

export interface TouchState {
  id: number
  startX: number
  startY: number
  currentX: number
  currentY: number
  deltaX: number
  deltaY: number
  isMovement: boolean
  timestamp: number
}

export interface KeyState {
  isPressed: boolean
  timestamp: number
  repeatTimer: NodeJS.Timer | null
}

export interface MovementState {
  direction: Direction | null
  intensity: number
  isActive: boolean
  lastUpdate: number
}

export interface BombActionState {
  canPlace: boolean
  cooldownRemaining: number
}

// Network and WebSocket
export interface WebSocketMessage {
  type: string
  data: any
  timestamp?: number
  roomId?: string
  playerId?: string
}

export interface NetworkState {
  isConnected: boolean
  reconnectAttempts: number
  lastHeartbeat: number
  latency: number
}

// UI and Display
export interface NotificationMessage {
  id: string
  type: 'info' | 'warning' | 'error' | 'success'
  title: string
  message: string
  timestamp: number
  duration: number
  priority: 'low' | 'normal' | 'high'
}

export interface UISettings {
  showMinimap: boolean
  showFPS: boolean
  showDebugInfo: boolean
  soundVolume: number
  musicVolume: number
  hapticFeedback: boolean
  touchControlsEnabled: boolean
  theme: 'light' | 'dark' | 'auto'
}

// Audio
export interface AudioSettings {
  masterVolume: number
  soundEffectsVolume: number
  musicVolume: number
  muteAll: boolean
  spatialAudio: boolean
}

export interface SoundEffect {
  id: string
  name: string
  url: string
  volume: number
  loop: boolean
}

// Performance and Rendering
export interface RenderingSettings {
  fps: number
  vsync: boolean
  particleEffects: boolean
  shadows: boolean
  antiAliasing: boolean
  textureFiltering: boolean
}

export interface PerformanceMetrics {
  fps: number
  frameTime: number
  memoryUsage: number
  drawCalls: number
  entities: number
  networkLatency: number
}

// Validation and Error Handling
export interface ValidationResult {
  valid: boolean
  reason?: string
}

export interface GameError {
  code: string
  message: string
  timestamp: number
  stack?: string
  context?: any
}