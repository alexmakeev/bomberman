/**
 * Validation Utilities Test Suite
 * Unit tests for input validation and sanitization
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  isString,
  isNumber,
  isInteger,
  isBoolean,
  isObject,
  isArray,
  isInRange,
  isPositiveNumber,
  isNonNegativeNumber,
  isValidEmail,
  isValidUrl,
  hasMinLength,
  hasMaxLength,
  matchesPattern,
  isValidDirection,
  isValidPosition,
  isValidPlayerName,
  isValidRoomId,
  isValidPlayerColor,
  isValidGameMode,
  isValidDifficulty,
  validateGameAction,
  validatePlayer,
  validateGameSettings,
  sanitizeString,
  sanitizePlayerName,
  sanitizeRoomId,
  sanitizeNumber,
  sanitizeInteger,
  RateLimiter,
  isValidOrigin,
  containsSuspiciousContent,
  isValidJSON,
  createValidationError,
  createValidationSuccess,
  combineValidationResults,
  validateBatch,
  validateGameState
} from '../../src/utils/validationUtils'
import type { GameAction, Player, GameSettings } from '../../src/types/game'

describe('Basic Type Validators', () => {
  it('should validate strings correctly', () => {
    expect(isString('hello')).toBe(true)
    expect(isString('')).toBe(true)
    expect(isString(123)).toBe(false)
    expect(isString(null)).toBe(false)
    expect(isString(undefined)).toBe(false)
  })

  it('should validate numbers correctly', () => {
    expect(isNumber(123)).toBe(true)
    expect(isNumber(0)).toBe(true)
    expect(isNumber(-123)).toBe(true)
    expect(isNumber(123.45)).toBe(true)
    expect(isNumber(NaN)).toBe(false)
    expect(isNumber(Infinity)).toBe(false)
    expect(isNumber('123')).toBe(false)
  })

  it('should validate integers correctly', () => {
    expect(isInteger(123)).toBe(true)
    expect(isInteger(0)).toBe(true)
    expect(isInteger(-123)).toBe(true)
    expect(isInteger(123.45)).toBe(false)
    expect(isInteger('123')).toBe(false)
  })

  it('should validate booleans correctly', () => {
    expect(isBoolean(true)).toBe(true)
    expect(isBoolean(false)).toBe(true)
    expect(isBoolean(0)).toBe(false)
    expect(isBoolean(1)).toBe(false)
    expect(isBoolean('true')).toBe(false)
  })

  it('should validate objects correctly', () => {
    expect(isObject({})).toBe(true)
    expect(isObject({ a: 1 })).toBe(true)
    expect(isObject([])).toBe(false)
    expect(isObject(null)).toBe(false)
    expect(isObject('object')).toBe(false)
  })

  it('should validate arrays correctly', () => {
    expect(isArray([])).toBe(true)
    expect(isArray([1, 2, 3])).toBe(true)
    expect(isArray({})).toBe(false)
    expect(isArray('array')).toBe(false)
  })
})

describe('Range Validators', () => {
  it('should validate ranges correctly', () => {
    expect(isInRange(5, 1, 10)).toBe(true)
    expect(isInRange(1, 1, 10)).toBe(true)
    expect(isInRange(10, 1, 10)).toBe(true)
    expect(isInRange(0, 1, 10)).toBe(false)
    expect(isInRange(11, 1, 10)).toBe(false)
  })

  it('should validate positive numbers correctly', () => {
    expect(isPositiveNumber(1)).toBe(true)
    expect(isPositiveNumber(0.1)).toBe(true)
    expect(isPositiveNumber(0)).toBe(false)
    expect(isPositiveNumber(-1)).toBe(false)
  })

  it('should validate non-negative numbers correctly', () => {
    expect(isNonNegativeNumber(1)).toBe(true)
    expect(isNonNegativeNumber(0)).toBe(true)
    expect(isNonNegativeNumber(-1)).toBe(false)
  })
})

describe('String Validators', () => {
  it('should validate emails correctly', () => {
    expect(isValidEmail('test@example.com')).toBe(true)
    expect(isValidEmail('user.name+tag@example.co.uk')).toBe(true)
    expect(isValidEmail('invalid.email')).toBe(false)
    expect(isValidEmail('@example.com')).toBe(false)
    expect(isValidEmail('test@')).toBe(false)
  })

  it('should validate URLs correctly', () => {
    expect(isValidUrl('https://example.com')).toBe(true)
    expect(isValidUrl('http://example.com')).toBe(true)
    expect(isValidUrl('ftp://example.com')).toBe(true)
    expect(isValidUrl('invalid-url')).toBe(false)
    expect(isValidUrl('http://')).toBe(false)
  })

  it('should check minimum length correctly', () => {
    expect(hasMinLength('hello', 3)).toBe(true)
    expect(hasMinLength('hello', 5)).toBe(true)
    expect(hasMinLength('hello', 6)).toBe(false)
    expect(hasMinLength('', 1)).toBe(false)
  })

  it('should check maximum length correctly', () => {
    expect(hasMaxLength('hello', 10)).toBe(true)
    expect(hasMaxLength('hello', 5)).toBe(true)
    expect(hasMaxLength('hello', 4)).toBe(false)
  })

  it('should match patterns correctly', () => {
    const alphanumeric = /^[a-zA-Z0-9]+$/
    expect(matchesPattern('hello123', alphanumeric)).toBe(true)
    expect(matchesPattern('hello_123', alphanumeric)).toBe(false)
  })
})

describe('Game-Specific Validators', () => {
  it('should validate directions correctly', () => {
    expect(isValidDirection('up')).toBe(true)
    expect(isValidDirection('down')).toBe(true)
    expect(isValidDirection('left')).toBe(true)
    expect(isValidDirection('right')).toBe(true)
    expect(isValidDirection('diagonal')).toBe(false)
    expect(isValidDirection(123)).toBe(false)
  })

  it('should validate positions correctly', () => {
    expect(isValidPosition({ x: 1, y: 2 })).toBe(true)
    expect(isValidPosition({ x: 0, y: 0 })).toBe(true)
    expect(isValidPosition({ x: -1, y: 2 })).toBe(true)
    expect(isValidPosition({ x: 1 })).toBe(false)
    expect(isValidPosition({ y: 2 })).toBe(false)
    expect(isValidPosition('position')).toBe(false)
  })

  it('should validate player names correctly', () => {
    expect(isValidPlayerName('player1')).toBe(true)
    expect(isValidPlayerName('test-user')).toBe(true)
    expect(isValidPlayerName('user_123')).toBe(true)
    expect(isValidPlayerName('a')).toBe(false) // Too short
    expect(isValidPlayerName('a'.repeat(21))).toBe(false) // Too long
    expect(isValidPlayerName('player@123')).toBe(false) // Invalid character
    expect(isValidPlayerName('')).toBe(false)
  })

  it('should validate room IDs correctly', () => {
    expect(isValidRoomId('ABC123')).toBe(true)
    expect(isValidRoomId('ROOM2024')).toBe(true)
    expect(isValidRoomId('12345')).toBe(false) // Too short
    expect(isValidRoomId('TOOLONGROOM123')).toBe(false) // Too long
    expect(isValidRoomId('room-123')).toBe(false) // Invalid character
    expect(isValidRoomId('abc123')).toBe(false) // Must be uppercase
  })

  it('should validate player colors correctly', () => {
    expect(isValidPlayerColor('red')).toBe(true)
    expect(isValidPlayerColor('blue')).toBe(true)
    expect(isValidPlayerColor('pink')).toBe(false)
    expect(isValidPlayerColor('RED')).toBe(false)
  })

  it('should validate game modes correctly', () => {
    expect(isValidGameMode('cooperative')).toBe(true)
    expect(isValidGameMode('versus')).toBe(true)
    expect(isValidGameMode('single')).toBe(false)
    expect(isValidGameMode('COOPERATIVE')).toBe(false)
  })

  it('should validate difficulty levels correctly', () => {
    expect(isValidDifficulty('easy')).toBe(true)
    expect(isValidDifficulty('normal')).toBe(true)
    expect(isValidDifficulty('hard')).toBe(true)
    expect(isValidDifficulty('expert')).toBe(false)
    expect(isValidDifficulty('EASY')).toBe(false)
  })
})

describe('Action Validators', () => {
  it('should validate movement actions correctly', () => {
    const validAction: GameAction = {
      type: 'movement',
      direction: 'up',
      intensity: 0.8,
      timestamp: Date.now()
    }

    const result = validateGameAction(validAction)
    expect(result.valid).toBe(true)
  })

  it('should reject invalid action types', () => {
    const invalidAction = {
      type: 'invalid',
      timestamp: Date.now()
    }

    const result = validateGameAction(invalidAction)
    expect(result.valid).toBe(false)
    expect(result.reason).toContain('Invalid action type')
  })

  it('should require valid direction for movement actions', () => {
    const invalidAction = {
      type: 'movement',
      direction: 'diagonal',
      intensity: 0.8,
      timestamp: Date.now()
    }

    const result = validateGameAction(invalidAction)
    expect(result.valid).toBe(false)
    expect(result.reason).toContain('valid direction')
  })

  it('should validate movement intensity range', () => {
    const invalidAction = {
      type: 'movement',
      direction: 'up',
      intensity: 1.5,
      timestamp: Date.now()
    }

    const result = validateGameAction(invalidAction)
    expect(result.valid).toBe(false)
    expect(result.reason).toContain('intensity must be between 0 and 1')
  })

  it('should validate bomb actions correctly', () => {
    const validAction: GameAction = {
      type: 'bomb',
      timestamp: Date.now()
    }

    const result = validateGameAction(validAction)
    expect(result.valid).toBe(true)
  })
})

describe('Player Validators', () => {
  const createValidPlayer = (): Player => ({
    id: 'player1',
    name: 'TestPlayer',
    position: { x: 1, y: 1 },
    health: 100,
    maxHealth: 100,
    bombCount: 0,
    maxBombs: 3,
    bombPower: 2,
    speed: 1.0,
    isAlive: true,
    isMoving: false,
    direction: null,
    score: 0,
    powerUps: [],
    respawnTimer: 0
  })

  it('should validate valid player correctly', () => {
    const player = createValidPlayer()
    const result = validatePlayer(player)
    expect(result.valid).toBe(true)
  })

  it('should reject player with invalid health', () => {
    const player = createValidPlayer()
    player.health = -10

    const result = validatePlayer(player)
    expect(result.valid).toBe(false)
    expect(result.reason).toContain('health must be between 0 and 1000')
  })

  it('should reject player with invalid speed', () => {
    const player = createValidPlayer()
    player.speed = 10

    const result = validatePlayer(player)
    expect(result.valid).toBe(false)
    expect(result.reason).toContain('speed must be between 0.1 and 5')
  })
})

describe('Game Settings Validators', () => {
  const createValidSettings = (): GameSettings => ({
    maxHealth: 100,
    startingBombs: 1,
    startingPower: 2,
    startingSpeed: 1.0,
    respawnTime: 10,
    friendlyFire: false,
    powerUpSpawnRate: 0.3,
    monsterSpawnRate: 0.2
  })

  it('should validate valid settings correctly', () => {
    const settings = createValidSettings()
    const result = validateGameSettings(settings)
    expect(result.valid).toBe(true)
  })

  it('should reject settings with invalid spawn rate', () => {
    const settings = createValidSettings()
    settings.powerUpSpawnRate = 1.5

    const result = validateGameSettings(settings)
    expect(result.valid).toBe(false)
    expect(result.reason).toContain('Power-up spawn rate must be between 0 and 1')
  })
})

describe('Input Sanitization', () => {
  it('should sanitize strings correctly', () => {
    expect(sanitizeString('hello')).toBe('hello')
    expect(sanitizeString('  hello  ')).toBe('hello')
    expect(sanitizeString('hello<script>alert("xss")</script>')).toBe('helloscriptalert(xss)/script')
    expect(sanitizeString('hello')).toBe('hello')
  })

  it('should sanitize player names correctly', () => {
    expect(sanitizePlayerName('Player123')).toBe('Player123')
    expect(sanitizePlayerName('  player-name  ')).toBe('player-name')
    expect(sanitizePlayerName('player@name')).toBe('playername')
    expect(sanitizePlayerName('a'.repeat(25))).toBe('a'.repeat(20))
  })

  it('should sanitize room IDs correctly', () => {
    expect(sanitizeRoomId('room123')).toBe('ROOM123')
    expect(sanitizeRoomId('room-123')).toBe('ROOM123')
    expect(sanitizeRoomId('a'.repeat(15))).toBe('A'.repeat(12))
  })

  it('should sanitize numbers correctly', () => {
    expect(sanitizeNumber('123')).toBe(123)
    expect(sanitizeNumber('invalid', 0, 100, 50)).toBe(50)
    expect(sanitizeNumber('150', 0, 100, 50)).toBe(100)
    expect(sanitizeNumber('-50', 0, 100, 50)).toBe(0)
  })

  it('should sanitize integers correctly', () => {
    expect(sanitizeInteger('123')).toBe(123)
    expect(sanitizeInteger('123.45')).toBe(123)
    expect(sanitizeInteger('invalid', 0, 100, 50)).toBe(50)
  })
})

describe('Rate Limiting', () => {
  it('should allow requests within limit', () => {
    const limiter = new RateLimiter({
      maxRequests: 5,
      windowMs: 1000
    })

    expect(limiter.isAllowed({})).toBe(true)
    expect(limiter.isAllowed({})).toBe(true)
    expect(limiter.isAllowed({})).toBe(true)
  })

  it('should reject requests over limit', () => {
    const limiter = new RateLimiter({
      maxRequests: 2,
      windowMs: 1000
    })

    expect(limiter.isAllowed({})).toBe(true)
    expect(limiter.isAllowed({})).toBe(true)
    expect(limiter.isAllowed({})).toBe(false)
  })

  it('should reset after time window', (done) => {
    const limiter = new RateLimiter({
      maxRequests: 1,
      windowMs: 50
    })

    expect(limiter.isAllowed({})).toBe(true)
    expect(limiter.isAllowed({})).toBe(false)

    setTimeout(() => {
      expect(limiter.isAllowed({})).toBe(true)
      done()
    }, 60)
  })

  it('should track remaining requests correctly', () => {
    const limiter = new RateLimiter({
      maxRequests: 3,
      windowMs: 1000
    })

    expect(limiter.getRemainingRequests({})).toBe(3)
    limiter.isAllowed({})
    expect(limiter.getRemainingRequests({})).toBe(2)
    limiter.isAllowed({})
    expect(limiter.getRemainingRequests({})).toBe(1)
  })
})

describe('Security Validators', () => {
  it('should validate origins correctly', () => {
    const allowedOrigins = ['https://example.com', 'http://localhost:3000']
    
    expect(isValidOrigin('https://example.com', allowedOrigins)).toBe(true)
    expect(isValidOrigin('http://localhost:3000', allowedOrigins)).toBe(true)
    expect(isValidOrigin('https://evil.com', allowedOrigins)).toBe(false)
    expect(isValidOrigin('any-origin', ['*'])).toBe(true)
  })

  it('should detect suspicious content', () => {
    expect(containsSuspiciousContent('hello world')).toBe(false)
    expect(containsSuspiciousContent('<script>alert("xss")</script>')).toBe(true)
    expect(containsSuspiciousContent('javascript:alert("xss")')).toBe(true)
    expect(containsSuspiciousContent('eval(maliciousCode)')).toBe(true)
  })

  it('should validate JSON correctly', () => {
    expect(isValidJSON('{"key": "value"}')).toBe(true)
    expect(isValidJSON('[1, 2, 3]')).toBe(true)
    expect(isValidJSON('invalid json')).toBe(false)
    expect(isValidJSON('{"key": value}')).toBe(false)
  })
})

describe('Validation Helpers', () => {
  it('should create validation errors correctly', () => {
    const error = createValidationError('Test error', 'testField')
    expect(error.valid).toBe(false)
    expect(error.reason).toBe('testField: Test error')
  })

  it('should create validation success correctly', () => {
    const success = createValidationSuccess()
    expect(success.valid).toBe(true)
    expect(success.reason).toBeUndefined()
  })

  it('should combine validation results correctly', () => {
    const success1 = createValidationSuccess()
    const success2 = createValidationSuccess()
    const error = createValidationError('Error')

    expect(combineValidationResults(success1, success2).valid).toBe(true)
    expect(combineValidationResults(success1, error).valid).toBe(false)
    expect(combineValidationResults(error, success1).valid).toBe(false)
  })
})

describe('Batch Validation', () => {
  it('should validate batch correctly', () => {
    const items = ['item1', 'item2', 'item3']
    const validator = (item: string) => 
      item.length > 0 ? createValidationSuccess() : createValidationError('Empty item')

    const result = validateBatch(items, validator)
    expect(result.valid).toBe(true)
  })

  it('should reject batch with invalid items', () => {
    const items = ['item1', '', 'item3']
    const validator = (item: string) => 
      item.length > 0 ? createValidationSuccess() : createValidationError('Empty item')

    const result = validateBatch(items, validator)
    expect(result.valid).toBe(false)
    expect(result.reason).toContain('Item 1: Empty item')
  })

  it('should reject oversized batches', () => {
    const items = new Array(101).fill('item')
    const validator = () => createValidationSuccess()

    const result = validateBatch(items, validator)
    expect(result.valid).toBe(false)
    expect(result.reason).toContain('Batch size exceeds maximum')
  })
})