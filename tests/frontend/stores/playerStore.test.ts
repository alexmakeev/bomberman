/**
 * Player Store Tests
 * Tests Pinia store for player state management and actions
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { usePlayerStore } from '../../../src/stores/playerStore'
import type { Player, PowerUpType, Position } from '../../../src/types/game'

// Mock WebSocket connection
const mockWebSocket = {
  send: vi.fn(),
  readyState: WebSocket.OPEN
}

vi.mock('../../../src/utils/websocketManager', () => ({
  WebSocketManager: {
    getInstance: () => mockWebSocket,
    send: vi.fn()
  }
}))

describe('Player Store', () => {
  let playerStore: ReturnType<typeof usePlayerStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    playerStore = usePlayerStore()
    vi.clearAllMocks()
  })

  describe('Initial State', () => {
    it('should initialize with default player state', () => {
      expect(playerStore.id).toBe('')
      expect(playerStore.name).toBe('')
      expect(playerStore.position).toEqual({ x: 0, y: 0 })
      expect(playerStore.health).toBe(100)
      expect(playerStore.maxHealth).toBe(100)
      expect(playerStore.bombCount).toBe(1)
      expect(playerStore.maxBombs).toBe(1)
      expect(playerStore.bombPower).toBe(1)
      expect(playerStore.speed).toBe(100)
      expect(playerStore.isAlive).toBe(true)
      expect(playerStore.isMoving).toBe(false)
      expect(playerStore.direction).toBe(null)
      expect(playerStore.score).toBe(0)
      expect(playerStore.powerUps).toEqual([])
      expect(playerStore.respawnTimer).toBe(0)
    })

    it('should have correct computed properties', () => {
      expect(playerStore.healthPercentage).toBe(100)
      expect(playerStore.canPlaceBomb).toBe(true)
      expect(playerStore.isRespawning).toBe(false)
      expect(playerStore.activePowerUps).toEqual([])
    })
  })

  describe('Player Creation and Initialization', () => {
    it('should create player with provided data', () => {
      const playerData: Player = {
        id: 'player-1',
        name: 'TestPlayer',
        position: { x: 64, y: 64 },
        health: 100,
        maxHealth: 100,
        bombCount: 2,
        maxBombs: 3,
        bombPower: 2,
        speed: 120,
        isAlive: true,
        isMoving: false,
        direction: null,
        score: 1500,
        powerUps: ['speed_boost'],
        respawnTimer: 0
      }

      playerStore.createPlayer(playerData)

      expect(playerStore.id).toBe('player-1')
      expect(playerStore.name).toBe('TestPlayer')
      expect(playerStore.position).toEqual({ x: 64, y: 64 })
      expect(playerStore.bombCount).toBe(2)
      expect(playerStore.powerUps).toEqual(['speed_boost'])
    })

    it('should reset player state', () => {
      // Set some non-default values
      playerStore.health = 50
      playerStore.score = 1000
      playerStore.bombPower = 3

      playerStore.resetPlayer()

      expect(playerStore.health).toBe(100)
      expect(playerStore.score).toBe(0)
      expect(playerStore.bombPower).toBe(1)
      expect(playerStore.powerUps).toEqual([])
    })

    it('should initialize with room configuration', () => {
      const roomConfig = {
        maxHealth: 150,
        startingBombs: 2,
        startingPower: 2,
        startingSpeed: 110
      }

      playerStore.initializeWithRoomConfig(roomConfig)

      expect(playerStore.maxHealth).toBe(150)
      expect(playerStore.health).toBe(150)
      expect(playerStore.maxBombs).toBe(2)
      expect(playerStore.bombCount).toBe(2)
      expect(playerStore.bombPower).toBe(2)
      expect(playerStore.speed).toBe(110)
    })
  })

  describe('Movement Actions', () => {
    beforeEach(() => {
      playerStore.createPlayer({
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
      })
    })

    it('should start movement in given direction', () => {
      playerStore.movePlayer('up', 1.0)

      expect(playerStore.isMoving).toBe(true)
      expect(playerStore.direction).toBe('up')
    })

    it('should update position during movement', () => {
      const initialPosition = { ...playerStore.position }
      
      playerStore.movePlayer('right', 1.0)
      playerStore.updatePosition()

      expect(playerStore.position.x).toBeGreaterThan(initialPosition.x)
    })

    it('should stop movement', () => {
      playerStore.movePlayer('left', 1.0)
      expect(playerStore.isMoving).toBe(true)

      playerStore.stopMovement()

      expect(playerStore.isMoving).toBe(false)
      expect(playerStore.direction).toBe(null)
    })

    it('should handle movement intensity', () => {
      playerStore.movePlayer('down', 0.5)

      // Should move at half speed
      const initialPosition = { ...playerStore.position }
      playerStore.updatePosition()

      const distance = Math.abs(playerStore.position.y - initialPosition.y)
      expect(distance).toBeLessThan(playerStore.speed * 0.016) // 16ms frame at full speed
    })

    it('should prevent movement when dead', () => {
      playerStore.isAlive = false

      playerStore.movePlayer('up', 1.0)

      expect(playerStore.isMoving).toBe(false)
      expect(playerStore.direction).toBe(null)
    })

    it('should send movement data to server', () => {
      playerStore.movePlayer('right', 1.0)

      expect(mockWebSocket.send).toHaveBeenCalledWith(
        JSON.stringify({
          type: 'player_action',
          action: 'move',
          data: {
            direction: 'right',
            intensity: 1.0,
            position: playerStore.position
          }
        })
      )
    })
  })

  describe('Bomb Actions', () => {
    beforeEach(() => {
      playerStore.createPlayer({
        id: 'player-1',
        name: 'TestPlayer',
        position: { x: 64, y: 64 },
        health: 100,
        maxHealth: 100,
        bombCount: 2,
        maxBombs: 3,
        bombPower: 2,
        speed: 100,
        isAlive: true,
        isMoving: false,
        direction: null,
        score: 0,
        powerUps: [],
        respawnTimer: 0
      })
    })

    it('should place bomb when possible', () => {
      const result = playerStore.placeBomb()

      expect(result).toBe(true)
      expect(playerStore.bombCount).toBe(1) // Used one bomb
    })

    it('should not place bomb when at capacity', () => {
      playerStore.bombCount = 0

      const result = playerStore.placeBomb()

      expect(result).toBe(false)
      expect(playerStore.bombCount).toBe(0)
    })

    it('should not place bomb when dead', () => {
      playerStore.isAlive = false

      const result = playerStore.placeBomb()

      expect(result).toBe(false)
    })

    it('should send bomb placement to server', () => {
      playerStore.placeBomb()

      expect(mockWebSocket.send).toHaveBeenCalledWith(
        JSON.stringify({
          type: 'player_action',
          action: 'place_bomb',
          data: {
            position: playerStore.position,
            power: playerStore.bombPower
          }
        })
      )
    })

    it('should restore bomb after explosion', () => {
      playerStore.placeBomb()
      expect(playerStore.bombCount).toBe(1)

      playerStore.onBombExploded('bomb-1')
      expect(playerStore.bombCount).toBe(2) // Restored
    })

    it('should calculate correct bomb grid position', () => {
      playerStore.position = { x: 75, y: 85 } // Between grid cells

      const gridPos = playerStore.getBombGridPosition()

      expect(gridPos.x).toBe(64) // Snapped to grid (64px cells)
      expect(gridPos.y).toBe(64)
    })
  })

  describe('Health Management', () => {
    beforeEach(() => {
      playerStore.health = 100
      playerStore.maxHealth = 100
      playerStore.isAlive = true
    })

    it('should take damage correctly', () => {
      playerStore.takeDamage(25)

      expect(playerStore.health).toBe(75)
      expect(playerStore.healthPercentage).toBe(75)
      expect(playerStore.isAlive).toBe(true)
    })

    it('should not go below 0 health', () => {
      playerStore.takeDamage(150)

      expect(playerStore.health).toBe(0)
      expect(playerStore.isAlive).toBe(false)
    })

    it('should trigger death when health reaches 0', () => {
      const deathSpy = vi.spyOn(playerStore, 'die')

      playerStore.takeDamage(100)

      expect(deathSpy).toHaveBeenCalled()
      expect(playerStore.isAlive).toBe(false)
    })

    it('should heal correctly', () => {
      playerStore.health = 50

      playerStore.heal(30)

      expect(playerStore.health).toBe(80)
    })

    it('should not exceed max health when healing', () => {
      playerStore.health = 90

      playerStore.heal(20)

      expect(playerStore.health).toBe(100)
    })

    it('should handle percentage-based damage', () => {
      playerStore.takeDamagePercent(25) // 25% damage

      expect(playerStore.health).toBe(75)
    })

    it('should send damage events to server', () => {
      playerStore.takeDamage(25)

      expect(mockWebSocket.send).toHaveBeenCalledWith(
        JSON.stringify({
          type: 'player_event',
          event: 'damage_taken',
          data: {
            damage: 25,
            currentHealth: 75,
            isAlive: true
          }
        })
      )
    })
  })

  describe('Death and Respawn', () => {
    beforeEach(() => {
      playerStore.createPlayer({
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
      })
    })

    it('should handle player death', () => {
      playerStore.die()

      expect(playerStore.isAlive).toBe(false)
      expect(playerStore.health).toBe(0)
      expect(playerStore.isMoving).toBe(false)
      expect(playerStore.respawnTimer).toBe(10000) // 10 seconds
    })

    it('should start respawn timer', () => {
      vi.useFakeTimers()

      playerStore.die()
      expect(playerStore.isRespawning).toBe(true)

      // Advance timer
      vi.advanceTimersByTime(1000)
      expect(playerStore.respawnTimer).toBe(9000)

      vi.useRealTimers()
    })

    it('should respawn after timer expires', () => {
      vi.useFakeTimers()

      playerStore.die()

      // Fast forward full respawn time
      vi.advanceTimersByTime(10000)

      expect(playerStore.isAlive).toBe(true)
      expect(playerStore.health).toBe(100)
      expect(playerStore.respawnTimer).toBe(0)
      expect(playerStore.isRespawning).toBe(false)

      vi.useRealTimers()
    })

    it('should respawn at random corner position', () => {
      const originalPosition = { ...playerStore.position }

      playerStore.die()
      // Trigger respawn
      playerStore.respawn()

      expect(playerStore.position).not.toEqual(originalPosition)
      expect([64, 832].includes(playerStore.position.x)).toBe(true) // Corner X positions
      expect([64, 832].includes(playerStore.position.y)).toBe(true) // Corner Y positions
    })

    it('should clear power-ups on death', () => {
      playerStore.powerUps = ['speed_boost', 'bomb_power']

      playerStore.die()

      expect(playerStore.powerUps).toEqual([])
      expect(playerStore.bombPower).toBe(1) // Reset to default
      expect(playerStore.speed).toBe(100)
    })

    it('should send death event to server', () => {
      playerStore.die()

      expect(mockWebSocket.send).toHaveBeenCalledWith(
        JSON.stringify({
          type: 'player_event',
          event: 'player_died',
          data: {
            playerId: 'player-1',
            position: playerStore.position,
            score: playerStore.score
          }
        })
      )
    })
  })

  describe('Power-Up Management', () => {
    beforeEach(() => {
      playerStore.createPlayer({
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
      })
    })

    it('should apply bomb power power-up', () => {
      playerStore.applyPowerUp('bomb_power')

      expect(playerStore.bombPower).toBe(2)
      expect(playerStore.powerUps).toContain('bomb_power')
    })

    it('should apply bomb count power-up', () => {
      playerStore.applyPowerUp('bomb_count')

      expect(playerStore.maxBombs).toBe(2)
      expect(playerStore.bombCount).toBe(2)
      expect(playerStore.powerUps).toContain('bomb_count')
    })

    it('should apply speed boost power-up', () => {
      playerStore.applyPowerUp('speed_boost')

      expect(playerStore.speed).toBe(125) // +25% speed
      expect(playerStore.powerUps).toContain('speed_boost')
    })

    it('should apply health power-up', () => {
      playerStore.health = 50

      playerStore.applyPowerUp('health')

      expect(playerStore.health).toBe(100) // Full heal
    })

    it('should apply max health power-up', () => {
      playerStore.applyPowerUp('max_health')

      expect(playerStore.maxHealth).toBe(125)
      expect(playerStore.health).toBe(125) // Also healed
      expect(playerStore.powerUps).toContain('max_health')
    })

    it('should not exceed maximum power-up levels', () => {
      // Apply multiple bomb power power-ups
      for (let i = 0; i < 10; i++) {
        playerStore.applyPowerUp('bomb_power')
      }

      expect(playerStore.bombPower).toBeLessThanOrEqual(5) // Max level
    })

    it('should handle temporary power-ups', () => {
      vi.useFakeTimers()

      playerStore.applyPowerUp('speed_boost_temp', 5000) // 5 seconds

      expect(playerStore.speed).toBe(150) // Temporary boost
      expect(playerStore.powerUps).toContain('speed_boost_temp')

      // Fast forward
      vi.advanceTimersByTime(5000)

      expect(playerStore.speed).toBe(100) // Reverted
      expect(playerStore.powerUps).not.toContain('speed_boost_temp')

      vi.useRealTimers()
    })

    it('should send power-up collection to server', () => {
      playerStore.applyPowerUp('bomb_power')

      expect(mockWebSocket.send).toHaveBeenCalledWith(
        JSON.stringify({
          type: 'player_event',
          event: 'powerup_collected',
          data: {
            powerUpType: 'bomb_power',
            newStats: {
              bombPower: 2,
              maxBombs: 1,
              speed: 100,
              maxHealth: 100
            }
          }
        })
      )
    })
  })

  describe('Score Management', () => {
    it('should add score correctly', () => {
      playerStore.addScore(150)

      expect(playerStore.score).toBe(150)
    })

    it('should add score with multiplier', () => {
      playerStore.addScore(100, 2.5)

      expect(playerStore.score).toBe(250)
    })

    it('should track score sources', () => {
      playerStore.addScore(100, 1, 'monster_kill')
      playerStore.addScore(50, 1, 'block_destroyed')

      // Should send tracking data
      expect(mockWebSocket.send).toHaveBeenCalledWith(
        JSON.stringify({
          type: 'player_event',
          event: 'score_earned',
          data: {
            points: 100,
            source: 'monster_kill',
            totalScore: 100
          }
        })
      )
    })

    it('should handle bonus score events', () => {
      playerStore.addBonusScore(500, 'level_complete')

      expect(playerStore.score).toBe(500)
    })

    it('should not allow negative scores', () => {
      playerStore.score = 100

      playerStore.addScore(-200) // Penalty

      expect(playerStore.score).toBe(0) // Clamped to 0
    })
  })

  describe('Computed Properties', () => {
    beforeEach(() => {
      playerStore.health = 75
      playerStore.maxHealth = 100
      playerStore.bombCount = 2
      playerStore.maxBombs = 3
      playerStore.respawnTimer = 5000
      playerStore.powerUps = ['speed_boost', 'bomb_power']
    })

    it('should calculate health percentage correctly', () => {
      expect(playerStore.healthPercentage).toBe(75)
    })

    it('should determine if player can place bomb', () => {
      expect(playerStore.canPlaceBomb).toBe(true)

      playerStore.bombCount = 0
      expect(playerStore.canPlaceBomb).toBe(false)
    })

    it('should determine if player is respawning', () => {
      expect(playerStore.isRespawning).toBe(true)

      playerStore.respawnTimer = 0
      expect(playerStore.isRespawning).toBe(false)
    })

    it('should filter active power-ups', () => {
      expect(playerStore.activePowerUps).toEqual(['speed_boost', 'bomb_power'])
    })

    it('should calculate movement speed with power-ups', () => {
      const baseSpeed = 100
      const expectedSpeed = baseSpeed * 1.25 // +25% from speed_boost

      expect(playerStore.currentSpeed).toBe(expectedSpeed)
    })
  })

  describe('Network Synchronization', () => {
    it('should sync state with server updates', () => {
      const serverUpdate = {
        id: 'player-1',
        position: { x: 128, y: 192 },
        health: 85,
        score: 750,
        powerUps: ['bomb_power', 'speed_boost']
      }

      playerStore.syncWithServer(serverUpdate)

      expect(playerStore.position).toEqual({ x: 128, y: 192 })
      expect(playerStore.health).toBe(85)
      expect(playerStore.score).toBe(750)
      expect(playerStore.powerUps).toEqual(['bomb_power', 'speed_boost'])
    })

    it('should handle partial server updates', () => {
      playerStore.health = 100
      playerStore.score = 500

      const partialUpdate = {
        id: 'player-1',
        health: 75
      }

      playerStore.syncWithServer(partialUpdate)

      expect(playerStore.health).toBe(75)
      expect(playerStore.score).toBe(500) // Unchanged
    })

    it('should validate server updates', () => {
      const invalidUpdate = {
        id: 'player-1',
        health: -50, // Invalid
        score: 'invalid' // Invalid type
      }

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      playerStore.syncWithServer(invalidUpdate as any)

      expect(consoleSpy).toHaveBeenCalledWith('Invalid server update:', invalidUpdate)
      expect(playerStore.health).toBe(100) // Unchanged
    })
  })

  describe('Error Handling', () => {
    it('should handle WebSocket disconnection', () => {
      mockWebSocket.readyState = WebSocket.CLOSED

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      playerStore.movePlayer('up', 1.0)

      expect(consoleSpy).toHaveBeenCalledWith('WebSocket not connected, action queued')
    })

    it('should queue actions when offline', () => {
      mockWebSocket.readyState = WebSocket.CONNECTING

      playerStore.placeBomb()
      playerStore.movePlayer('right', 1.0)

      expect(playerStore.actionQueue).toHaveLength(2)
    })

    it('should flush queued actions on reconnect', () => {
      // Queue some actions
      mockWebSocket.readyState = WebSocket.CLOSED
      playerStore.placeBomb()
      playerStore.movePlayer('left', 1.0)

      // Reconnect
      mockWebSocket.readyState = WebSocket.OPEN
      playerStore.onWebSocketReconnect()

      expect(mockWebSocket.send).toHaveBeenCalledTimes(2)
      expect(playerStore.actionQueue).toHaveLength(0)
    })
  })
})