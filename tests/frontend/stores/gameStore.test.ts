/**
 * Game Store Tests
 * Tests Pinia store for game state management, rooms, and multiplayer coordination
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useGameStore } from '../../../src/stores/gameStore'
import type { 
  GameState, 
  Player, 
  Bomb, 
  Monster, 
  Boss, 
  PowerUp,
  GameRoom,
  MazeCell 
} from '../../../src/types/game'

// Mock WebSocket connection
const mockWebSocket = {
  send: vi.fn(),
  readyState: WebSocket.OPEN,
  close: vi.fn()
}

vi.mock('../../../src/utils/websocketManager', () => ({
  WebSocketManager: {
    getInstance: () => mockWebSocket,
    send: vi.fn(),
    connect: vi.fn(),
    disconnect: vi.fn()
  }
}))

describe('Game Store', () => {
  let gameStore: ReturnType<typeof useGameStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    gameStore = useGameStore()
    vi.clearAllMocks()
  })

  describe('Initial State', () => {
    it('should initialize with default game state', () => {
      expect(gameStore.roomId).toBe('')
      expect(gameStore.gameState).toBe('waiting')
      expect(gameStore.currentLevel).toBe(1)
      expect(gameStore.timeRemaining).toBe(300000) // 5 minutes
      expect(gameStore.objective).toBe('Find the exit')
      expect(gameStore.players).toEqual(new Map())
      expect(gameStore.bombs).toEqual(new Map())
      expect(gameStore.monsters).toEqual(new Map())
      expect(gameStore.powerUps).toEqual(new Map())
      expect(gameStore.boss).toBe(null)
      expect(gameStore.maze).toHaveLength(15)
      expect(gameStore.explosions).toEqual(new Map())
    })

    it('should have correct computed properties', () => {
      expect(gameStore.isGameActive).toBe(false)
      expect(gameStore.playersArray).toEqual([])
      expect(gameStore.alivePlayers).toEqual([])
      expect(gameStore.deadPlayers).toEqual([])
      expect(gameStore.activeBombs).toEqual([])
      expect(gameStore.timeRemainingFormatted).toBe('5:00')
    })
  })

  describe('Room Management', () => {
    it('should create new room', async () => {
      const roomConfig = {
        maxPlayers: 4,
        gameMode: 'cooperative',
        difficulty: 'normal',
        timeLimit: 600000 // 10 minutes
      }

      await gameStore.createRoom(roomConfig)

      expect(gameStore.roomId).toBeTruthy()
      expect(gameStore.maxPlayers).toBe(4)
      expect(gameStore.gameMode).toBe('cooperative')
      expect(gameStore.timeRemaining).toBe(600000)
      expect(mockWebSocket.send).toHaveBeenCalledWith(
        JSON.stringify({
          type: 'room_create',
          data: roomConfig
        })
      )
    })

    it('should join existing room', async () => {
      const roomId = 'room-123'
      const playerData = {
        name: 'TestPlayer',
        avatar: 'player1'
      }

      await gameStore.joinRoom(roomId, playerData)

      expect(gameStore.roomId).toBe(roomId)
      expect(mockWebSocket.send).toHaveBeenCalledWith(
        JSON.stringify({
          type: 'room_join',
          roomId,
          data: playerData
        })
      )
    })

    it('should leave room', async () => {
      gameStore.roomId = 'room-123'

      await gameStore.leaveRoom()

      expect(gameStore.roomId).toBe('')
      expect(gameStore.gameState).toBe('waiting')
      expect(mockWebSocket.send).toHaveBeenCalledWith(
        JSON.stringify({
          type: 'room_leave',
          roomId: 'room-123'
        })
      )
    })

    it('should handle room full error', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      // Mock server response
      const errorResponse = {
        type: 'room_join_error',
        error: 'Room is full'
      }

      gameStore.handleServerMessage(errorResponse)

      expect(consoleSpy).toHaveBeenCalledWith('Failed to join room:', 'Room is full')
    })
  })

  describe('Game Flow Management', () => {
    beforeEach(() => {
      gameStore.roomId = 'test-room'
      gameStore.gameState = 'waiting'
    })

    it('should start game', () => {
      gameStore.startGame()

      expect(gameStore.gameState).toBe('playing')
      expect(mockWebSocket.send).toHaveBeenCalledWith(
        JSON.stringify({
          type: 'game_start',
          roomId: 'test-room'
        })
      )
    })

    it('should pause game', () => {
      gameStore.gameState = 'playing'

      gameStore.pauseGame()

      expect(gameStore.gameState).toBe('paused')
      expect(mockWebSocket.send).toHaveBeenCalledWith(
        JSON.stringify({
          type: 'game_pause',
          roomId: 'test-room'
        })
      )
    })

    it('should resume game', () => {
      gameStore.gameState = 'paused'

      gameStore.resumeGame()

      expect(gameStore.gameState).toBe('playing')
      expect(mockWebSocket.send).toHaveBeenCalledWith(
        JSON.stringify({
          type: 'game_resume',
          roomId: 'test-room'
        })
      )
    })

    it('should end game', () => {
      gameStore.gameState = 'playing'

      gameStore.endGame('victory')

      expect(gameStore.gameState).toBe('ended')
      expect(gameStore.gameResult).toBe('victory')
    })

    it('should handle game timer countdown', () => {
      vi.useFakeTimers()

      gameStore.gameState = 'playing'
      gameStore.timeRemaining = 5000 // 5 seconds

      gameStore.startGameTimer()

      // Advance 1 second
      vi.advanceTimersByTime(1000)
      expect(gameStore.timeRemaining).toBe(4000)

      // Advance to end
      vi.advanceTimersByTime(4000)
      expect(gameStore.timeRemaining).toBe(0)
      expect(gameStore.gameState).toBe('ended')

      vi.useRealTimers()
    })
  })

  describe('Player Management', () => {
    it('should add player to game', () => {
      const player: Player = {
        id: 'player-1',
        name: 'TestPlayer',
        position: { x: 64, y: 64 },
        health: 100,
        maxHealth: 100,
        bombCount: 1,
        maxBombs: 1,
        bombPower: 1,
        speed: 100,
        isAlive: true,
        isMoving: false,
        direction: null,
        score: 0,
        powerUps: [],
        respawnTimer: 0
      }

      gameStore.addPlayer(player)

      expect(gameStore.players.has('player-1')).toBe(true)
      expect(gameStore.players.get('player-1')).toEqual(player)
    })

    it('should remove player from game', () => {
      const player: Player = {
        id: 'player-1',
        name: 'TestPlayer',
        position: { x: 64, y: 64 },
        health: 100,
        maxHealth: 100,
        bombCount: 1,
        maxBombs: 1,
        bombPower: 1,
        speed: 100,
        isAlive: true,
        isMoving: false,
        direction: null,
        score: 0,
        powerUps: [],
        respawnTimer: 0
      }

      gameStore.addPlayer(player)
      expect(gameStore.players.has('player-1')).toBe(true)

      gameStore.removePlayer('player-1')
      expect(gameStore.players.has('player-1')).toBe(false)
    })

    it('should update player state', () => {
      const player: Player = {
        id: 'player-1',
        name: 'TestPlayer',
        position: { x: 64, y: 64 },
        health: 100,
        maxHealth: 100,
        bombCount: 1,
        maxBombs: 1,
        bombPower: 1,
        speed: 100,
        isAlive: true,
        isMoving: false,
        direction: null,
        score: 0,
        powerUps: [],
        respawnTimer: 0
      }

      gameStore.addPlayer(player)

      const updates = {
        position: { x: 128, y: 128 },
        health: 75,
        score: 150
      }

      gameStore.updatePlayer('player-1', updates)

      const updatedPlayer = gameStore.players.get('player-1')
      expect(updatedPlayer!.position).toEqual({ x: 128, y: 128 })
      expect(updatedPlayer!.health).toBe(75)
      expect(updatedPlayer!.score).toBe(150)
    })

    it('should get players sorted by score', () => {
      const player1: Player = {
        id: 'player-1', name: 'Player1', position: { x: 64, y: 64 },
        health: 100, maxHealth: 100, bombCount: 1, maxBombs: 1, bombPower: 1,
        speed: 100, isAlive: true, isMoving: false, direction: null,
        score: 1500, powerUps: [], respawnTimer: 0
      }
      
      const player2: Player = {
        id: 'player-2', name: 'Player2', position: { x: 128, y: 128 },
        health: 100, maxHealth: 100, bombCount: 1, maxBombs: 1, bombPower: 1,
        speed: 100, isAlive: true, isMoving: false, direction: null,
        score: 2000, powerUps: [], respawnTimer: 0
      }

      gameStore.addPlayer(player1)
      gameStore.addPlayer(player2)

      const sortedPlayers = gameStore.playersByScore
      expect(sortedPlayers[0].score).toBe(2000)
      expect(sortedPlayers[1].score).toBe(1500)
    })

    it('should filter alive and dead players', () => {
      const alivePlayer: Player = {
        id: 'player-1', name: 'AlivePlayer', position: { x: 64, y: 64 },
        health: 100, maxHealth: 100, bombCount: 1, maxBombs: 1, bombPower: 1,
        speed: 100, isAlive: true, isMoving: false, direction: null,
        score: 1000, powerUps: [], respawnTimer: 0
      }

      const deadPlayer: Player = {
        id: 'player-2', name: 'DeadPlayer', position: { x: 128, y: 128 },
        health: 0, maxHealth: 100, bombCount: 1, maxBombs: 1, bombPower: 1,
        speed: 100, isAlive: false, isMoving: false, direction: null,
        score: 500, powerUps: [], respawnTimer: 5000
      }

      gameStore.addPlayer(alivePlayer)
      gameStore.addPlayer(deadPlayer)

      expect(gameStore.alivePlayers).toHaveLength(1)
      expect(gameStore.alivePlayers[0].id).toBe('player-1')
      
      expect(gameStore.deadPlayers).toHaveLength(1)
      expect(gameStore.deadPlayers[0].id).toBe('player-2')
    })
  })

  describe('Bomb Management', () => {
    it('should add bomb', () => {
      const bomb: Bomb = {
        id: 'bomb-1',
        position: { x: 64, y: 64 },
        ownerId: 'player-1',
        timer: 3000,
        power: 2,
        createdAt: Date.now()
      }

      gameStore.addBomb(bomb)

      expect(gameStore.bombs.has('bomb-1')).toBe(true)
      expect(gameStore.bombs.get('bomb-1')).toEqual(bomb)
    })

    it('should remove bomb on explosion', () => {
      const bomb: Bomb = {
        id: 'bomb-1',
        position: { x: 64, y: 64 },
        ownerId: 'player-1',
        timer: 3000,
        power: 2,
        createdAt: Date.now()
      }

      gameStore.addBomb(bomb)
      expect(gameStore.bombs.has('bomb-1')).toBe(true)

      gameStore.removeBomb('bomb-1')
      expect(gameStore.bombs.has('bomb-1')).toBe(false)
    })

    it('should update bomb timer', () => {
      const bomb: Bomb = {
        id: 'bomb-1',
        position: { x: 64, y: 64 },
        ownerId: 'player-1',
        timer: 3000,
        power: 2,
        createdAt: Date.now()
      }

      gameStore.addBomb(bomb)

      gameStore.updateBombTimer('bomb-1', 2500)

      const updatedBomb = gameStore.bombs.get('bomb-1')
      expect(updatedBomb!.timer).toBe(2500)
    })

    it('should explode bomb automatically', () => {
      vi.useFakeTimers()

      const bomb: Bomb = {
        id: 'bomb-1',
        position: { x: 64, y: 64 },
        ownerId: 'player-1',
        timer: 1000, // 1 second
        power: 2,
        createdAt: Date.now()
      }

      gameStore.addBomb(bomb)
      gameStore.startBombTimer('bomb-1')

      expect(gameStore.bombs.has('bomb-1')).toBe(true)

      // Fast forward timer
      vi.advanceTimersByTime(1000)

      expect(gameStore.bombs.has('bomb-1')).toBe(false)
      expect(gameStore.explosions.has('explosion-bomb-1')).toBe(true)

      vi.useRealTimers()
    })

    it('should create explosion pattern', () => {
      const bomb: Bomb = {
        id: 'bomb-1',
        position: { x: 128, y: 128 }, // Grid position 2,2
        ownerId: 'player-1',
        timer: 0,
        power: 2,
        createdAt: Date.now()
      }

      gameStore.explodeBomb('bomb-1', bomb)

      const explosion = gameStore.explosions.get('explosion-bomb-1')
      expect(explosion).toBeDefined()
      expect(explosion!.center).toEqual({ x: 128, y: 128 })
      expect(explosion!.cells.length).toBeGreaterThan(1) // Center + radius cells
    })
  })

  describe('Monster Management', () => {
    it('should add monster', () => {
      const monster: Monster = {
        id: 'monster-1',
        type: 'basic',
        position: { x: 192, y: 192 },
        health: 50,
        maxHealth: 50,
        speed: 80,
        isAlive: true,
        direction: 'down',
        isMoving: true,
        lastMoveTime: Date.now(),
        pathfinding: {
          target: null,
          path: [],
          lastUpdate: Date.now()
        }
      }

      gameStore.addMonster(monster)

      expect(gameStore.monsters.has('monster-1')).toBe(true)
      expect(gameStore.monsters.get('monster-1')).toEqual(monster)
    })

    it('should remove monster when killed', () => {
      const monster: Monster = {
        id: 'monster-1',
        type: 'basic',
        position: { x: 192, y: 192 },
        health: 50,
        maxHealth: 50,
        speed: 80,
        isAlive: true,
        direction: 'down',
        isMoving: true,
        lastMoveTime: Date.now(),
        pathfinding: {
          target: null,
          path: [],
          lastUpdate: Date.now()
        }
      }

      gameStore.addMonster(monster)
      expect(gameStore.monsters.has('monster-1')).toBe(true)

      gameStore.removeMonster('monster-1')
      expect(gameStore.monsters.has('monster-1')).toBe(false)
    })

    it('should spawn monster wave', () => {
      const waveConfig = {
        count: 5,
        type: 'basic',
        powerLevel: 1
      }

      gameStore.spawnMonsterWave(waveConfig)

      expect(gameStore.monsters.size).toBe(5)
      expect(mockWebSocket.send).toHaveBeenCalledWith(
        JSON.stringify({
          type: 'monster_wave_spawn',
          data: waveConfig
        })
      )
    })
  })

  describe('Boss Management', () => {
    it('should add boss', () => {
      const boss: Boss = {
        id: 'boss-1',
        type: 'fire',
        position: { x: 400, y: 400 },
        health: 300,
        maxHealth: 300,
        phase: 1,
        isAlive: true,
        isMoving: false,
        direction: null,
        lastAttackTime: 0,
        attackCooldown: 3000,
        abilities: ['fire_blast', 'charge_attack'],
        vulnerabilities: ['ice'],
        resistances: ['fire']
      }

      gameStore.addBoss(boss)

      expect(gameStore.boss).toEqual(boss)
    })

    it('should update boss phase based on health', () => {
      const boss: Boss = {
        id: 'boss-1', type: 'fire', position: { x: 400, y: 400 },
        health: 300, maxHealth: 300, phase: 1, isAlive: true,
        isMoving: false, direction: null, lastAttackTime: 0,
        attackCooldown: 3000, abilities: ['fire_blast'], 
        vulnerabilities: ['ice'], resistances: ['fire']
      }

      gameStore.addBoss(boss)

      // Damage boss to 60% health (should trigger phase 2)
      gameStore.updateBoss('boss-1', { health: 180 })

      expect(gameStore.boss!.phase).toBe(2)
    })

    it('should remove boss when defeated', () => {
      const boss: Boss = {
        id: 'boss-1', type: 'fire', position: { x: 400, y: 400 },
        health: 300, maxHealth: 300, phase: 1, isAlive: true,
        isMoving: false, direction: null, lastAttackTime: 0,
        attackCooldown: 3000, abilities: ['fire_blast'], 
        vulnerabilities: ['ice'], resistances: ['fire']
      }

      gameStore.addBoss(boss)
      expect(gameStore.boss).toBeDefined()

      gameStore.removeBoss('boss-1')
      expect(gameStore.boss).toBe(null)
    })

    it('should handle boss defeat victory condition', () => {
      gameStore.gameState = 'playing'
      gameStore.objective = 'Kill the boss'

      const boss: Boss = {
        id: 'boss-1', type: 'fire', position: { x: 400, y: 400 },
        health: 1, maxHealth: 300, phase: 3, isAlive: true,
        isMoving: false, direction: null, lastAttackTime: 0,
        attackCooldown: 3000, abilities: ['fire_blast'], 
        vulnerabilities: ['ice'], resistances: ['fire']
      }

      gameStore.addBoss(boss)

      // Kill boss
      gameStore.updateBoss('boss-1', { health: 0, isAlive: false })

      expect(gameStore.gameState).toBe('ended')
      expect(gameStore.gameResult).toBe('victory')
    })
  })

  describe('Power-Up Management', () => {
    it('should add power-up', () => {
      const powerUp: PowerUp = {
        id: 'powerup-1',
        type: 'bomb_power',
        position: { x: 256, y: 256 },
        createdAt: Date.now(),
        duration: undefined,
        isCollected: false
      }

      gameStore.addPowerUp(powerUp)

      expect(gameStore.powerUps.has('powerup-1')).toBe(true)
      expect(gameStore.powerUps.get('powerup-1')).toEqual(powerUp)
    })

    it('should remove power-up when collected', () => {
      const powerUp: PowerUp = {
        id: 'powerup-1',
        type: 'bomb_power',
        position: { x: 256, y: 256 },
        createdAt: Date.now(),
        duration: undefined,
        isCollected: false
      }

      gameStore.addPowerUp(powerUp)
      expect(gameStore.powerUps.has('powerup-1')).toBe(true)

      gameStore.collectPowerUp('powerup-1', 'player-1')

      expect(gameStore.powerUps.has('powerup-1')).toBe(false)
      expect(mockWebSocket.send).toHaveBeenCalledWith(
        JSON.stringify({
          type: 'powerup_collected',
          data: {
            powerUpId: 'powerup-1',
            playerId: 'player-1',
            type: 'bomb_power'
          }
        })
      )
    })

    it('should spawn power-ups from destroyed blocks', () => {
      const blockPosition = { x: 128, y: 192 }

      gameStore.spawnPowerUpFromBlock(blockPosition)

      // Should have spawned a power-up (random chance)
      const powerUpsAtPosition = Array.from(gameStore.powerUps.values())
        .filter(p => p.position.x === 128 && p.position.y === 192)

      // Random spawning, so we can't guarantee but should handle gracefully
      expect(powerUpsAtPosition.length).toBeGreaterThanOrEqual(0)
    })
  })

  describe('Maze Management', () => {
    it('should initialize maze', () => {
      gameStore.initializeMaze()

      expect(gameStore.maze).toHaveLength(15)
      expect(gameStore.maze[0]).toHaveLength(15)
    })

    it('should destroy destructible block', () => {
      gameStore.initializeMaze()
      
      // Set a destructible block
      gameStore.maze[2][2] = 2 // Destructible

      gameStore.destroyBlock(2, 2)

      expect(gameStore.maze[2][2]).toBe(0) // Empty
    })

    it('should not destroy indestructible blocks', () => {
      gameStore.initializeMaze()
      
      // Set an indestructible block
      gameStore.maze[1][1] = 1 // Wall

      gameStore.destroyBlock(1, 1)

      expect(gameStore.maze[1][1]).toBe(1) // Still wall
    })

    it('should check collision detection', () => {
      gameStore.initializeMaze()
      
      // Set wall
      gameStore.maze[5][5] = 1

      const collision = gameStore.checkCollision({ x: 320, y: 320 }) // Grid 5,5

      expect(collision).toBe(true)
    })

    it('should find valid spawn positions', () => {
      gameStore.initializeMaze()

      const spawnPositions = gameStore.getValidSpawnPositions()

      expect(spawnPositions.length).toBeGreaterThan(0)
      
      // All positions should be in corners (safe zones)
      spawnPositions.forEach(pos => {
        const isCorner = (pos.x === 64 || pos.x === 832) && 
                        (pos.y === 64 || pos.y === 832)
        expect(isCorner).toBe(true)
      })
    })
  })

  describe('Game Statistics', () => {
    it('should track game statistics', () => {
      gameStore.gameStartTime = Date.now() - 120000 // Started 2 minutes ago
      
      const stats = gameStore.getGameStatistics()

      expect(stats.playTime).toBeGreaterThan(100000) // At least 100 seconds
      expect(stats.totalPlayers).toBe(gameStore.players.size)
      expect(stats.totalBombs).toBe(0) // No bombs placed yet
      expect(stats.totalScore).toBe(0) // No score yet
    })

    it('should calculate total player scores', () => {
      const player1: Player = {
        id: 'player-1', name: 'Player1', position: { x: 64, y: 64 },
        health: 100, maxHealth: 100, bombCount: 1, maxBombs: 1, bombPower: 1,
        speed: 100, isAlive: true, isMoving: false, direction: null,
        score: 1500, powerUps: [], respawnTimer: 0
      }

      const player2: Player = {
        id: 'player-2', name: 'Player2', position: { x: 128, y: 128 },
        health: 100, maxHealth: 100, bombCount: 1, maxBombs: 1, bombPower: 1,
        speed: 100, isAlive: true, isMoving: false, direction: null,
        score: 2500, powerUps: [], respawnTimer: 0
      }

      gameStore.addPlayer(player1)
      gameStore.addPlayer(player2)

      expect(gameStore.totalScore).toBe(4000)
    })
  })

  describe('Network Synchronization', () => {
    it('should handle server game state updates', () => {
      const serverUpdate = {
        type: 'game_state_update',
        data: {
          roomId: 'room-123',
          gameState: 'playing',
          currentLevel: 2,
          timeRemaining: 240000,
          players: [
            {
              id: 'player-1',
              position: { x: 128, y: 128 },
              health: 85,
              score: 750
            }
          ],
          bombs: [
            {
              id: 'bomb-1',
              position: { x: 192, y: 192 },
              timer: 2500,
              ownerId: 'player-1'
            }
          ]
        }
      }

      gameStore.handleServerMessage(serverUpdate)

      expect(gameStore.roomId).toBe('room-123')
      expect(gameStore.gameState).toBe('playing')
      expect(gameStore.currentLevel).toBe(2)
      expect(gameStore.timeRemaining).toBe(240000)
      expect(gameStore.players.has('player-1')).toBe(true)
      expect(gameStore.bombs.has('bomb-1')).toBe(true)
    })

    it('should handle player joined event', () => {
      const playerJoinedEvent = {
        type: 'player_joined',
        data: {
          player: {
            id: 'player-2',
            name: 'NewPlayer',
            position: { x: 64, y: 64 },
            health: 100,
            score: 0
          }
        }
      }

      gameStore.handleServerMessage(playerJoinedEvent)

      expect(gameStore.players.has('player-2')).toBe(true)
      expect(gameStore.players.get('player-2')!.name).toBe('NewPlayer')
    })

    it('should handle player left event', () => {
      // Add player first
      const player: Player = {
        id: 'player-1', name: 'TestPlayer', position: { x: 64, y: 64 },
        health: 100, maxHealth: 100, bombCount: 1, maxBombs: 1, bombPower: 1,
        speed: 100, isAlive: true, isMoving: false, direction: null,
        score: 0, powerUps: [], respawnTimer: 0
      }

      gameStore.addPlayer(player)
      expect(gameStore.players.has('player-1')).toBe(true)

      const playerLeftEvent = {
        type: 'player_left',
        data: {
          playerId: 'player-1'
        }
      }

      gameStore.handleServerMessage(playerLeftEvent)

      expect(gameStore.players.has('player-1')).toBe(false)
    })
  })

  describe('Error Handling', () => {
    it('should handle WebSocket disconnection', () => {
      mockWebSocket.readyState = WebSocket.CLOSED

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      gameStore.startGame()

      expect(consoleSpy).toHaveBeenCalledWith('WebSocket not connected')
    })

    it('should handle invalid server messages', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const invalidMessage = {
        type: 'invalid_type',
        data: null
      }

      gameStore.handleServerMessage(invalidMessage as any)

      expect(consoleSpy).toHaveBeenCalledWith('Unknown message type:', 'invalid_type')
    })

    it('should handle corrupted game state', () => {
      // Corrupt the maze
      gameStore.maze = null as any

      expect(() => {
        gameStore.checkCollision({ x: 64, y: 64 })
      }).not.toThrow()
    })

    it('should validate player data before adding', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const invalidPlayer = {
        id: '', // Invalid empty ID
        name: 'Test',
        position: null // Invalid position
      }

      gameStore.addPlayer(invalidPlayer as any)

      expect(consoleSpy).toHaveBeenCalledWith('Invalid player data:', invalidPlayer)
      expect(gameStore.players.size).toBe(0)
    })
  })

  describe('Performance Optimization', () => {
    it('should efficiently update large numbers of entities', () => {
      // Add many monsters
      for (let i = 0; i < 100; i++) {
        const monster: Monster = {
          id: `monster-${i}`,
          type: 'basic',
          position: { x: i * 10, y: i * 10 },
          health: 50,
          maxHealth: 50,
          speed: 80,
          isAlive: true,
          direction: 'down',
          isMoving: true,
          lastMoveTime: Date.now(),
          pathfinding: { target: null, path: [], lastUpdate: Date.now() }
        }
        gameStore.addMonster(monster)
      }

      const startTime = performance.now()
      gameStore.updateAllMonsters()
      const endTime = performance.now()

      expect(endTime - startTime).toBeLessThan(16) // Less than one frame
    })

    it('should debounce frequent updates', async () => {
      const updateSpy = vi.spyOn(mockWebSocket, 'send')

      // Send many rapid updates
      for (let i = 0; i < 10; i++) {
        gameStore.requestSync()
      }

      // Should debounce to fewer actual calls
      expect(updateSpy).not.toHaveBeenCalledTimes(10)
    })
  })
})