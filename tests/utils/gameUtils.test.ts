/**
 * Game Utilities Test Suite
 * Unit tests for core game mechanics and calculations
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  isValidPosition,
  getPositionInDirection,
  getDistance,
  getManhattanDistance,
  getDirectionBetweenPositions,
  getCellType,
  setCellType,
  isWalkable,
  isDestructible,
  getWalkableNeighbors,
  checkCollision,
  calculateExplosionCells,
  applyPowerUp,
  calculateScore,
  findPath,
  getRandomDirection,
  lerp,
  debounce,
  throttle
} from '../../src/utils/gameUtils'
import type { Direction, Maze, Player, Bomb } from '../../src/types/game'

describe('Position and Movement Utilities', () => {
  const testMaze: Maze = [
    [1, 1, 1, 1],
    [1, 0, 0, 1],
    [1, 0, 2, 1],
    [1, 1, 1, 1]
  ]

  it('should validate positions correctly', () => {
    expect(isValidPosition({ x: 1, y: 1 }, testMaze)).toBe(true)
    expect(isValidPosition({ x: 0, y: 0 }, testMaze)).toBe(true)
    expect(isValidPosition({ x: -1, y: 1 }, testMaze)).toBe(false)
    expect(isValidPosition({ x: 5, y: 1 }, testMaze)).toBe(false)
    expect(isValidPosition({ x: 1, y: 5 }, testMaze)).toBe(false)
  })

  it('should calculate position in direction correctly', () => {
    const pos = { x: 2, y: 2 }
    expect(getPositionInDirection(pos, 'up')).toEqual({ x: 2, y: 1 })
    expect(getPositionInDirection(pos, 'down')).toEqual({ x: 2, y: 3 })
    expect(getPositionInDirection(pos, 'left')).toEqual({ x: 1, y: 2 })
    expect(getPositionInDirection(pos, 'right')).toEqual({ x: 3, y: 2 })
    expect(getPositionInDirection(pos, 'up', 2)).toEqual({ x: 2, y: 0 })
  })

  it('should calculate distances correctly', () => {
    const pos1 = { x: 0, y: 0 }
    const pos2 = { x: 3, y: 4 }
    
    expect(getDistance(pos1, pos2)).toBe(5) // 3-4-5 triangle
    expect(getManhattanDistance(pos1, pos2)).toBe(7) // 3 + 4
  })

  it('should determine direction between positions', () => {
    const center = { x: 2, y: 2 }
    
    expect(getDirectionBetweenPositions(center, { x: 2, y: 1 })).toBe('up')
    expect(getDirectionBetweenPositions(center, { x: 2, y: 3 })).toBe('down')
    expect(getDirectionBetweenPositions(center, { x: 1, y: 2 })).toBe('left')
    expect(getDirectionBetweenPositions(center, { x: 3, y: 2 })).toBe('right')
    expect(getDirectionBetweenPositions(center, center)).toBe(null)
  })
})

describe('Maze Utilities', () => {
  let testMaze: Maze

  beforeEach(() => {
    testMaze = [
      [1, 1, 1, 1],
      [1, 0, 0, 1],
      [1, 0, 2, 1],
      [1, 1, 1, 1]
    ]
  })

  it('should get cell types correctly', () => {
    expect(getCellType({ x: 0, y: 0 }, testMaze)).toBe(1) // Wall
    expect(getCellType({ x: 1, y: 1 }, testMaze)).toBe(0) // Empty
    expect(getCellType({ x: 2, y: 2 }, testMaze)).toBe(2) // Destructible
    expect(getCellType({ x: -1, y: 0 }, testMaze)).toBe(1) // Out of bounds = wall
  })

  it('should set cell types correctly', () => {
    setCellType({ x: 1, y: 1 }, testMaze, 2)
    expect(getCellType({ x: 1, y: 1 }, testMaze)).toBe(2)
  })

  it('should check walkable cells correctly', () => {
    expect(isWalkable({ x: 1, y: 1 }, testMaze)).toBe(true) // Empty
    expect(isWalkable({ x: 0, y: 0 }, testMaze)).toBe(false) // Wall
    expect(isWalkable({ x: 2, y: 2 }, testMaze)).toBe(false) // Destructible
  })

  it('should check destructible cells correctly', () => {
    expect(isDestructible({ x: 2, y: 2 }, testMaze)).toBe(true)
    expect(isDestructible({ x: 0, y: 0 }, testMaze)).toBe(false)
    expect(isDestructible({ x: 1, y: 1 }, testMaze)).toBe(false)
  })

  it('should get walkable neighbors correctly', () => {
    const neighbors = getWalkableNeighbors({ x: 1, y: 1 }, testMaze)
    expect(neighbors).toHaveLength(2) // (2,1) and (1,2) are walkable
    expect(neighbors).toContainEqual({ x: 2, y: 1 })
    expect(neighbors).toContainEqual({ x: 1, y: 2 })
  })
})

describe('Collision Detection', () => {
  it('should detect collisions correctly', () => {
    const pos1 = { x: 1, y: 1 }
    const pos2 = { x: 1.5, y: 1.2 }
    const pos3 = { x: 3, y: 3 }
    
    expect(checkCollision(pos1, pos2, 1.0)).toBe(true)
    expect(checkCollision(pos1, pos3, 1.0)).toBe(false)
  })
})

describe('Explosion Calculations', () => {
  it('should calculate explosion cells correctly', () => {
    const testMaze: Maze = [
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0]
    ]
    
    const bomb: Bomb = {
      id: 'test',
      position: { x: 2, y: 2 },
      ownerId: 'player1',
      timer: 3000,
      power: 2,
      createdAt: Date.now()
    }
    
    const cells = calculateExplosionCells(bomb, testMaze)
    
    // Should include center + 2 cells in each direction = 9 cells total
    expect(cells).toHaveLength(9)
    expect(cells).toContainEqual({ x: 2, y: 2 }) // Center
    expect(cells).toContainEqual({ x: 2, y: 0 }) // Up 2
    expect(cells).toContainEqual({ x: 2, y: 4 }) // Down 2
    expect(cells).toContainEqual({ x: 0, y: 2 }) // Left 2
    expect(cells).toContainEqual({ x: 4, y: 2 }) // Right 2
  })

  it('should stop explosion at walls', () => {
    const testMaze: Maze = [
      [0, 0, 0],
      [0, 1, 0],
      [0, 0, 0]
    ]
    
    const bomb: Bomb = {
      id: 'test',
      position: { x: 0, y: 1 },
      ownerId: 'player1',
      timer: 3000,
      power: 2,
      createdAt: Date.now()
    }
    
    const cells = calculateExplosionCells(bomb, testMaze)
    
    // Should be stopped by wall at x=1
    expect(cells).toContainEqual({ x: 0, y: 1 }) // Center
    expect(cells).toContainEqual({ x: 1, y: 1 }) // Wall (included but stops expansion)
    expect(cells).not.toContainEqual({ x: 2, y: 1 }) // Beyond wall
  })
})

describe('Power-up System', () => {
  it('should apply bomb count power-up correctly', () => {
    const player: Player = {
      id: 'test',
      name: 'Test',
      position: { x: 0, y: 0 },
      health: 100,
      maxHealth: 100,
      bombCount: 0,
      maxBombs: 1,
      bombPower: 2,
      speed: 1,
      isAlive: true,
      isMoving: false,
      direction: null,
      score: 0,
      powerUps: [],
      respawnTimer: 0
    }
    
    applyPowerUp(player, 'bomb_count')
    expect(player.maxBombs).toBe(2)
    expect(player.powerUps).toContain('bomb_count')
  })

  it('should apply speed boost correctly', () => {
    const player: Player = {
      id: 'test',
      name: 'Test',
      position: { x: 0, y: 0 },
      health: 100,
      maxHealth: 100,
      bombCount: 0,
      maxBombs: 1,
      bombPower: 2,
      speed: 1,
      isAlive: true,
      isMoving: false,
      direction: null,
      score: 0,
      powerUps: [],
      respawnTimer: 0
    }
    
    const originalSpeed = player.speed
    applyPowerUp(player, 'speed_boost')
    expect(player.speed).toBeGreaterThan(originalSpeed)
    expect(player.speed).toBeLessThanOrEqual(3) // Max speed cap
  })
})

describe('Score Calculation', () => {
  it('should calculate score correctly', () => {
    const score = calculateScore(5, 3, 10, 2, 60000, 1)
    
    // 5*10 + 3*50 + 10*5 + 2*20 + 60*1 + 1*30
    // = 50 + 150 + 50 + 40 + 60 + 30
    // = 380
    expect(score).toBe(380)
  })
})

describe('Pathfinding', () => {
  it('should find simple path', () => {
    const testMaze: Maze = [
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0]
    ]
    
    const path = findPath({ x: 0, y: 0 }, { x: 2, y: 2 }, testMaze)
    
    expect(path.length).toBeGreaterThan(0)
    expect(path[path.length - 1]).toEqual({ x: 2, y: 2 })
  })

  it('should return empty path when blocked', () => {
    const testMaze: Maze = [
      [0, 1, 0],
      [1, 1, 1],
      [0, 1, 0]
    ]
    
    const path = findPath({ x: 0, y: 0 }, { x: 2, y: 2 }, testMaze)
    expect(path).toHaveLength(0)
  })
})

describe('Random Utilities', () => {
  it('should return valid direction', () => {
    const directions: Direction[] = ['up', 'down', 'left', 'right']
    const randomDir = getRandomDirection()
    expect(directions).toContain(randomDir)
  })
})

describe('Animation Utilities', () => {
  it('should interpolate correctly', () => {
    expect(lerp(0, 10, 0)).toBe(0)
    expect(lerp(0, 10, 1)).toBe(10)
    expect(lerp(0, 10, 0.5)).toBe(5)
  })
})

describe('Performance Utilities', () => {
  it('should debounce function calls', (done) => {
    let callCount = 0
    const debouncedFn = debounce(() => {
      callCount++
    }, 50)
    
    // Call multiple times quickly
    debouncedFn()
    debouncedFn()
    debouncedFn()
    
    // Should only be called once after delay
    setTimeout(() => {
      expect(callCount).toBe(1)
      done()
    }, 100)
  })

  it('should throttle function calls', (done) => {
    let callCount = 0
    const throttledFn = throttle(() => {
      callCount++
    }, 50)
    
    // Call immediately and after short delay
    throttledFn()
    expect(callCount).toBe(1)
    
    // Call again immediately - should be throttled
    throttledFn()
    expect(callCount).toBe(1)
    
    // After throttle period, should allow another call
    setTimeout(() => {
      throttledFn()
      expect(callCount).toBe(2)
      done()
    }, 60)
  })
})