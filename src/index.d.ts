/**
 * Main TypeScript definitions for the Bomberman multiplayer game system.
 * 
 * This file serves as the central export point for all type definitions,
 * providing a convenient single import for consumers of the type system.
 */

// Export all type definitions from the unified event system
export * from './types/common';
export * from './types/events.d.ts';
export * from './types/game';
export * from './types/player';
export * from './types/room';
export * from './types/monster';
export * from './types/admin';
export * from './types/websocket';

// Export all interface definitions
export * from './interfaces/core/EventBus';
export * from './interfaces/core/UnifiedGameServer';
export * from './interfaces/specialized/GameEventHandler';
export * from './interfaces/specialized/UserNotificationHandler';
export * from './interfaces/specialized/UserActionHandler';

// Game constants
export const GAME_CONSTANTS = {
  DEFAULT_RESPAWN_TIME: 10,
  MAX_PLAYERS_PER_ROOM: 8,
  MIN_PLAYERS_TO_START: 2,
  DEFAULT_BOMB_TIMER: 3000,
  DEFAULT_BLAST_RADIUS: 2,
  MAX_POWER_LEVEL: 10,
  DEFAULT_MAZE_SIZE: { width: 15, height: 11 }
} as const;

export const NETWORK_CONSTANTS = {
  DEFAULT_PORT: 8080,
  CONNECTION_TIMEOUT: 30000,
  PING_INTERVAL: 25000,
  MAX_MESSAGE_SIZE: 64 * 1024,
  RATE_LIMIT_MESSAGES_PER_MINUTE: 120
} as const;