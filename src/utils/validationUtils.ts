/**
 * Validation Utility Functions
 * Input validation and sanitization for game data and user inputs
 * 
 * @see docs/front-end/01-architecture-overview.md - Validation layer
 * @see docs/front-end/05-input-system.md - Input validation
 */

import type { Position, Direction, GameAction, Player, GameSettings, ValidationResult } from '../types/game'

// Basic Type Validators
export function isString(value: any): value is string {
  return typeof value === 'string'
}

export function isNumber(value: any): value is number {
  return typeof value === 'number' && !isNaN(value) && isFinite(value)
}

export function isInteger(value: any): value is number {
  return isNumber(value) && Number.isInteger(value)
}

export function isBoolean(value: any): value is boolean {
  return typeof value === 'boolean'
}

export function isObject(value: any): value is object {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function isArray(value: any): value is any[] {
  return Array.isArray(value)
}

// Range Validators
export function isInRange(value: number, min: number, max: number): boolean {
  return isNumber(value) && value >= min && value <= max
}

export function isPositiveNumber(value: any): value is number {
  return isNumber(value) && value > 0
}

export function isNonNegativeNumber(value: any): value is number {
  return isNumber(value) && value >= 0
}

// String Validators
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return isString(email) && emailRegex.test(email)
}

export function isValidUrl(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

export function hasMinLength(value: string, minLength: number): boolean {
  return isString(value) && value.length >= minLength
}

export function hasMaxLength(value: string, maxLength: number): boolean {
  return isString(value) && value.length <= maxLength
}

export function matchesPattern(value: string, pattern: RegExp): boolean {
  return isString(value) && pattern.test(value)
}

// Game-Specific Validators
export function isValidDirection(value: any): value is Direction {
  const validDirections: Direction[] = ['up', 'down', 'left', 'right']
  return isString(value) && validDirections.includes(value as Direction)
}

export function isValidPosition(value: any): value is Position {
  return (
    isObject(value) &&
    isNumber(value.x) &&
    isNumber(value.y)
  )
}

export function isValidPlayerName(name: any): boolean {
  return (
    isString(name) &&
    name.length >= 2 &&
    name.length <= 20 &&
    /^[a-zA-Z0-9_-]+$/.test(name)
  )
}

export function isValidRoomId(roomId: any): boolean {
  return (
    isString(roomId) &&
    roomId.length >= 6 &&
    roomId.length <= 12 &&
    /^[A-Z0-9]+$/.test(roomId)
  )
}

export function isValidPlayerColor(color: any): boolean {
  const validColors = ['red', 'blue', 'green', 'yellow', 'purple', 'orange']
  return isString(color) && validColors.includes(color)
}

export function isValidGameMode(mode: any): boolean {
  const validModes = ['cooperative', 'versus']
  return isString(mode) && validModes.includes(mode)
}

export function isValidDifficulty(difficulty: any): boolean {
  const validDifficulties = ['easy', 'normal', 'hard']
  return isString(difficulty) && validDifficulties.includes(difficulty)
}

// Action Validators
export function validateGameAction(action: any): ValidationResult {
  if (!isObject(action)) {
    return { valid: false, reason: 'Action must be an object' }
  }

  if (!isString(action.type)) {
    return { valid: false, reason: 'Action type must be a string' }
  }

  const validActionTypes = ['movement', 'bomb', 'stop']
  if (!validActionTypes.includes(action.type)) {
    return { valid: false, reason: `Invalid action type: ${action.type}` }
  }

  if (!isNumber(action.timestamp) || action.timestamp <= 0) {
    return { valid: false, reason: 'Action timestamp must be a positive number' }
  }

  // Validate specific action types
  switch (action.type) {
    case 'movement':
      if (!isValidDirection(action.direction)) {
        return { valid: false, reason: 'Movement action requires valid direction' }
      }
      if (!isInRange(action.intensity, 0, 1)) {
        return { valid: false, reason: 'Movement intensity must be between 0 and 1' }
      }
      break

    case 'bomb':
      // No additional validation needed for bomb actions
      break

    case 'stop':
      // No additional validation needed for stop actions
      break
  }

  return { valid: true }
}

export function validateMovementAction(action: any): ValidationResult {
  const baseResult = validateGameAction(action)
  if (!baseResult.valid) return baseResult

  if (action.type !== 'movement') {
    return { valid: false, reason: 'Not a movement action' }
  }

  return { valid: true }
}

export function validateBombAction(action: any): ValidationResult {
  const baseResult = validateGameAction(action)
  if (!baseResult.valid) return baseResult

  if (action.type !== 'bomb') {
    return { valid: false, reason: 'Not a bomb action' }
  }

  return { valid: true }
}

// Player Validators
export function validatePlayer(player: any): ValidationResult {
  if (!isObject(player)) {
    return { valid: false, reason: 'Player must be an object' }
  }

  if (!isString(player.id) || player.id.length === 0) {
    return { valid: false, reason: 'Player ID must be a non-empty string' }
  }

  if (!isValidPlayerName(player.name)) {
    return { valid: false, reason: 'Invalid player name' }
  }

  if (!isValidPosition(player.position)) {
    return { valid: false, reason: 'Player position must be valid' }
  }

  if (!isInRange(player.health, 0, 1000)) {
    return { valid: false, reason: 'Player health must be between 0 and 1000' }
  }

  if (!isInRange(player.maxHealth, 1, 1000)) {
    return { valid: false, reason: 'Player max health must be between 1 and 1000' }
  }

  if (!isInRange(player.bombCount, 0, 20)) {
    return { valid: false, reason: 'Player bomb count must be between 0 and 20' }
  }

  if (!isInRange(player.maxBombs, 1, 20)) {
    return { valid: false, reason: 'Player max bombs must be between 1 and 20' }
  }

  if (!isInRange(player.bombPower, 1, 10)) {
    return { valid: false, reason: 'Player bomb power must be between 1 and 10' }
  }

  if (!isInRange(player.speed, 0.1, 5)) {
    return { valid: false, reason: 'Player speed must be between 0.1 and 5' }
  }

  if (!isBoolean(player.isAlive)) {
    return { valid: false, reason: 'Player isAlive must be boolean' }
  }

  if (!isBoolean(player.isMoving)) {
    return { valid: false, reason: 'Player isMoving must be boolean' }
  }

  if (player.direction !== null && !isValidDirection(player.direction)) {
    return { valid: false, reason: 'Player direction must be valid or null' }
  }

  if (!isNonNegativeNumber(player.score)) {
    return { valid: false, reason: 'Player score must be non-negative' }
  }

  if (!isArray(player.powerUps)) {
    return { valid: false, reason: 'Player powerUps must be an array' }
  }

  if (!isNonNegativeNumber(player.respawnTimer)) {
    return { valid: false, reason: 'Player respawn timer must be non-negative' }
  }

  return { valid: true }
}

// Game Settings Validators
export function validateGameSettings(settings: any): ValidationResult {
  if (!isObject(settings)) {
    return { valid: false, reason: 'Settings must be an object' }
  }

  if (!isInRange(settings.maxHealth, 10, 500)) {
    return { valid: false, reason: 'Max health must be between 10 and 500' }
  }

  if (!isInRange(settings.startingBombs, 1, 10)) {
    return { valid: false, reason: 'Starting bombs must be between 1 and 10' }
  }

  if (!isInRange(settings.startingPower, 1, 8)) {
    return { valid: false, reason: 'Starting power must be between 1 and 8' }
  }

  if (!isInRange(settings.startingSpeed, 0.5, 3)) {
    return { valid: false, reason: 'Starting speed must be between 0.5 and 3' }
  }

  if (!isInRange(settings.respawnTime, 3, 60)) {
    return { valid: false, reason: 'Respawn time must be between 3 and 60 seconds' }
  }

  if (!isBoolean(settings.friendlyFire)) {
    return { valid: false, reason: 'Friendly fire must be boolean' }
  }

  if (!isInRange(settings.powerUpSpawnRate, 0, 1)) {
    return { valid: false, reason: 'Power-up spawn rate must be between 0 and 1' }
  }

  if (!isInRange(settings.monsterSpawnRate, 0, 1)) {
    return { valid: false, reason: 'Monster spawn rate must be between 0 and 1' }
  }

  return { valid: true }
}

// Input Sanitization
export function sanitizeString(input: string, maxLength: number = 1000): string {
  if (!isString(input)) return ''
  
  return input
    .trim()
    .substring(0, maxLength)
    .replace(/[<>'"]/g, '') // Remove potentially dangerous characters
}

export function sanitizePlayerName(name: string): string {
  if (!isString(name)) return ''
  
  return name
    .trim()
    .substring(0, 20)
    .replace(/[^a-zA-Z0-9_-]/g, '') // Keep only allowed characters
}

export function sanitizeRoomId(roomId: string): string {
  if (!isString(roomId)) return ''
  
  return roomId
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '') // Keep only uppercase letters and numbers
    .substring(0, 12)
}

export function sanitizeNumber(
  value: any,
  min: number = -Infinity,
  max: number = Infinity,
  defaultValue: number = 0
): number {
  const num = parseFloat(value)
  if (isNaN(num) || !isFinite(num)) return defaultValue
  return Math.max(min, Math.min(max, num))
}

export function sanitizeInteger(
  value: any,
  min: number = -Infinity,
  max: number = Infinity,
  defaultValue: number = 0
): number {
  const num = parseInt(value, 10)
  if (isNaN(num) || !isFinite(num)) return defaultValue
  return Math.max(min, Math.min(max, num))
}

// Rate Limiting
export interface RateLimitConfig {
  maxRequests: number
  windowMs: number
  keyGenerator?: (data: any) => string
}

export class RateLimiter {
  private requests: Map<string, number[]> = new Map()
  
  constructor(private config: RateLimitConfig) {}
  
  isAllowed(data: any): boolean {
    const key = this.config.keyGenerator ? this.config.keyGenerator(data) : 'default'
    const now = Date.now()
    const windowStart = now - this.config.windowMs
    
    // Get or create request history for this key
    let requestTimes = this.requests.get(key) || []
    
    // Remove old requests outside the window
    requestTimes = requestTimes.filter(time => time > windowStart)
    
    // Check if limit exceeded
    if (requestTimes.length >= this.config.maxRequests) {
      return false
    }
    
    // Add current request
    requestTimes.push(now)
    this.requests.set(key, requestTimes)
    
    return true
  }
  
  getRemainingRequests(data: any): number {
    const key = this.config.keyGenerator ? this.config.keyGenerator(data) : 'default'
    const now = Date.now()
    const windowStart = now - this.config.windowMs
    
    const requestTimes = this.requests.get(key) || []
    const recentRequests = requestTimes.filter(time => time > windowStart)
    
    return Math.max(0, this.config.maxRequests - recentRequests.length)
  }
  
  getResetTime(data: any): number {
    const key = this.config.keyGenerator ? this.config.keyGenerator(data) : 'default'
    const requestTimes = this.requests.get(key) || []
    
    if (requestTimes.length === 0) return 0
    
    const oldestRequest = Math.min(...requestTimes)
    return oldestRequest + this.config.windowMs
  }
}

// Security Validators
export function isValidOrigin(origin: string, allowedOrigins: string[]): boolean {
  return allowedOrigins.includes(origin) || allowedOrigins.includes('*')
}

export function containsSuspiciousContent(content: string): boolean {
  const suspiciousPatterns = [
    /<script[\s\S]*?>[\s\S]*?<\/script>/gi,
    /javascript:/gi,
    /data:text\/html/gi,
    /eval\s*\(/gi,
    /setTimeout\s*\(/gi,
    /setInterval\s*\(/gi
  ]
  
  return suspiciousPatterns.some(pattern => pattern.test(content))
}

export function isValidJSON(jsonString: string): boolean {
  try {
    JSON.parse(jsonString)
    return true
  } catch {
    return false
  }
}

// Validation Result Helpers
export function createValidationError(reason: string, field?: string): ValidationResult {
  return {
    valid: false,
    reason: field ? `${field}: ${reason}` : reason
  }
}

export function createValidationSuccess(): ValidationResult {
  return { valid: true }
}

export function combineValidationResults(...results: ValidationResult[]): ValidationResult {
  for (const result of results) {
    if (!result.valid) {
      return result
    }
  }
  return createValidationSuccess()
}

// Batch Validators
export function validateBatch<T>(
  items: T[],
  validator: (item: T) => ValidationResult,
  maxBatchSize: number = 100
): ValidationResult {
  if (!isArray(items)) {
    return createValidationError('Items must be an array')
  }
  
  if (items.length > maxBatchSize) {
    return createValidationError(`Batch size exceeds maximum of ${maxBatchSize}`)
  }
  
  for (let i = 0; i < items.length; i++) {
    const result = validator(items[i])
    if (!result.valid) {
      return createValidationError(`Item ${i}: ${result.reason}`)
    }
  }
  
  return createValidationSuccess()
}

// Game State Validators
export function validateGameState(gameState: any): ValidationResult {
  if (!isObject(gameState)) {
    return createValidationError('Game state must be an object')
  }
  
  // Validate required fields
  const requiredFields = ['players', 'bombs', 'powerUps', 'maze', 'gameTime']
  for (const field of requiredFields) {
    if (!gameState.hasOwnProperty(field)) {
      return createValidationError(`Missing required field: ${field}`)
    }
  }
  
  // Validate players array
  if (!isArray(gameState.players)) {
    return createValidationError('Players must be an array')
  }
  
  for (const player of gameState.players) {
    const playerResult = validatePlayer(player)
    if (!playerResult.valid) {
      return createValidationError(`Invalid player: ${playerResult.reason}`)
    }
  }
  
  return createValidationSuccess()
}