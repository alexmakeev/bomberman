/**
 * Utility Functions Index
 * Centralized exports for all game utility functions
 * 
 * @see docs/front-end/01-architecture-overview.md - Utility layer
 */

// Game logic utilities
export * from './gameUtils'

// Rendering utilities
export * from './renderingUtils'

// Network communication utilities
export * from './networkUtils'

// Audio management utilities
export * from './audioUtils'

// Data persistence utilities
export * from './storageUtils'

// Input validation utilities
export * from './validationUtils'

// Input management
export { UnifiedInputManager } from './inputManager'

// Re-export commonly used utility functions with aliases
export {
  // Position utilities
  isValidPosition as isPositionValid,
  getDistance as calculateDistance,
  getManhattanDistance as calculateManhattanDistance,
  getDirectionBetweenPositions as getDirection,
  
  // Collision detection
  checkCollision,
  checkPlayerCollision,
  checkBombCollision,
  checkPowerUpCollision,
  checkMonsterCollision,
  checkBossCollision,
  
  // Game mechanics
  calculateExplosionCells,
  isPositionInExplosion,
  applyPowerUp,
  calculateScore,
  
  // Pathfinding
  findPath,
  
  // Maze utilities
  getCellType,
  setCellType,
  isWalkable,
  isDestructible,
  getWalkableNeighbors,
  getRandomWalkablePosition,
  
  // Visibility
  isPositionVisible,
  getVisiblePositions,
  
  // Random utilities
  getRandomDirection,
  getRandomFloat,
  getRandomInt,
  shuffleArray,
  
  // Animation
  lerp,
  lerpPosition,
  easeInOut,
  
  // Performance
  debounce,
  throttle
} from './gameUtils'

export {
  // Canvas management
  setupCanvas,
  resizeCanvas,
  calculateViewportTransform,
  worldToScreen,
  screenToWorld,
  
  // Rendering
  renderPlayer,
  renderBomb,
  renderExplosion,
  renderPowerUp,
  renderMonster,
  renderBoss,
  renderMaze,
  renderText,
  renderProgressBar,
  
  // Colors and drawing
  COLORS,
  hexToRgba,
  drawRect,
  drawCircle,
  drawPixelPerfectRect,
  
  // Particle effects
  createParticleEffect,
  updateAndRenderParticles
} from './renderingUtils'

export {
  // WebSocket management
  createWebSocketManager,
  connectWebSocket,
  disconnectWebSocket,
  sendMessage,
  
  // Message creation
  createPlayerActionMessage,
  createJoinRoomMessage,
  createLeaveRoomMessage,
  createChatMessage,
  createGameStateRequestMessage,
  
  // Message validation
  isValidWebSocketMessage,
  validatePlayerAction,
  
  // Network quality
  detectNetworkQuality,
  shouldReduceQuality,
  
  // Message batching
  createMessageBatcher,
  addToBatch,
  flushBatch,
  
  // Connection state
  getConnectionStatusText,
  getConnectionStatusColor,
  
  // Local storage for offline
  saveGameStateToLocal,
  loadGameStateFromLocal,
  clearLocalGameState,
  
  // Error handling
  handleConnectionError,
  shouldAttemptReconnect,
  
  // Environment
  getWebSocketUrl,
  isOnline,
  addOnlineListener,
  removeOnlineListener
} from './networkUtils'

export {
  // Audio context
  getAudioContext,
  resumeAudioContext,
  
  // Sound management
  createSoundManager,
  updateAudioSettings,
  loadSound,
  preloadSounds,
  playSound,
  stopSound,
  stopAllSounds,
  
  // Music management
  createMusicManager,
  playMusic,
  fadeInMusic,
  fadeOutMusic,
  stopMusic,
  
  // 8-bit audio generation
  generate8BitTone,
  play8BitTone,
  
  // Game-specific sounds
  playBombPlaceSound,
  playBombExplodeSound,
  playPlayerMoveSound,
  playPowerUpSound,
  playPlayerDeathSound,
  playMonsterDeathSound,
  playBossAttackSound,
  playVictorySound,
  playDefeatSound,
  playMenuSound,
  playErrorSound,
  playSuccessSound,
  
  // Settings persistence
  saveAudioSettings,
  loadAudioSettings,
  
  // Browser compatibility
  isAudioSupported,
  canAutoplay,
  initializeAudio,
  requiresUserGesture
} from './audioUtils'

export {
  // Storage availability
  isLocalStorageAvailable,
  isSessionStorageAvailable,
  isIndexedDBAvailable,
  
  // Generic storage operations
  setStorageItem,
  getStorageItem,
  removeStorageItem,
  clearStorage,
  
  // Player profile
  getDefaultPlayerProfile,
  savePlayerProfile,
  loadPlayerProfile,
  updatePlayerStats,
  
  // Game settings
  getDefaultGameSettings,
  saveGameSettings,
  loadGameSettings,
  
  // UI settings
  getDefaultUISettings,
  saveUISettings,
  loadUISettings,
  
  // Audio settings
  getDefaultAudioSettings,
  
  // Game statistics
  getDefaultGameStatistics,
  saveGameStatistics,
  loadGameStatistics,
  updateGameStatistics,
  
  // Recent rooms
  addRecentRoom,
  getRecentRooms,
  removeRecentRoom,
  
  // Saved games
  saveGame,
  loadSavedGames,
  deleteSavedGame,
  
  // Achievements
  saveAchievements,
  loadAchievements,
  unlockAchievement,
  updateAchievementProgress,
  
  // User preferences
  getDefaultPreferences,
  savePreferences,
  loadPreferences,
  
  // Storage maintenance
  cleanupOldData,
  getStorageUsage,
  exportUserData,
  importUserData,
  
  // Utility functions
  generatePlayerId,
  generateGameId,
  isValidPlayerName,
  migrateStorageData
} from './storageUtils'

export {
  // Type validators
  isString,
  isNumber,
  isInteger,
  isBoolean,
  isObject,
  isArray,
  
  // Range validators
  isInRange,
  isPositiveNumber,
  isNonNegativeNumber,
  
  // String validators
  isValidEmail,
  isValidUrl,
  hasMinLength,
  hasMaxLength,
  matchesPattern,
  
  // Game validators
  isValidDirection,
  isValidPlayerColor,
  isValidGameMode,
  isValidDifficulty,
  validateGameAction,
  validateMovementAction,
  validateBombAction,
  validatePlayer,
  validateGameSettings,
  validateGameState,
  
  // Input sanitization
  sanitizeString,
  sanitizePlayerName,
  sanitizeRoomId,
  sanitizeNumber,
  sanitizeInteger,
  
  // Rate limiting
  RateLimiter,
  
  // Security
  isValidOrigin,
  containsSuspiciousContent,
  isValidJSON,
  
  // Validation helpers
  createValidationError,
  createValidationSuccess,
  combineValidationResults,
  validateBatch
} from './validationUtils'

// Type definitions for utility functions
export interface UtilityConfig {
  // Game configuration
  viewDistance: number
  cellSize: number
  
  // Network configuration
  websocketUrl: string
  reconnectAttempts: number
  heartbeatInterval: number
  
  // Audio configuration
  masterVolume: number
  soundEffectsVolume: number
  musicVolume: number
  
  // Storage configuration
  maxStorageAge: number
  storageQuota: number
  
  // Validation configuration
  maxPlayerNameLength: number
  maxRoomIdLength: number
  maxBatchSize: number
  
  // Rate limiting configuration
  actionRateLimit: {
    maxRequests: number
    windowMs: number
  }
}

export const DEFAULT_UTILITY_CONFIG: UtilityConfig = {
  viewDistance: 5,
  cellSize: 32,
  websocketUrl: '',
  reconnectAttempts: 5,
  heartbeatInterval: 30000,
  masterVolume: 0.7,
  soundEffectsVolume: 0.8,
  musicVolume: 0.5,
  maxStorageAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  storageQuota: 10 * 1024 * 1024, // 10MB
  maxPlayerNameLength: 20,
  maxRoomIdLength: 12,
  maxBatchSize: 100,
  actionRateLimit: {
    maxRequests: 60,
    windowMs: 1000
  }
}