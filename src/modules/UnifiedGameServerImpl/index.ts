/**
 * UnifiedGameServer Implementation
 * Stub implementation of the unified game server with event system integration
 */

// Constants for magic numbers
const RANDOM_STRING_LENGTH_36 = 36;
const RANDOM_STRING_LENGTH_9 = 9;
const KILOBYTES_64 = 64;
const BYTES_PER_KB = 1024;
const MEGABYTES_512 = 512;

// Helper to generate IDs
const generateId = (prefix: string): string => {
  return `${prefix}_${Date.now()}_${Math.random().toString(RANDOM_STRING_LENGTH_36).substr(2, RANDOM_STRING_LENGTH_9)}`;
};

import type { 
  ServerStatus,
  UnifiedGameServer,
  UnifiedGameServerConfig,
} from '../interfaces/core/UnifiedGameServer';
import type { ConnectionInfo } from '../types/room';
import type { EventBus } from '../interfaces/core/EventBus';
import type { GameEventHandler } from '../interfaces/specialized/GameEventHandler';
import type { UserNotificationHandler } from '../interfaces/specialized/UserNotificationHandler';
import type { UserActionHandler } from '../interfaces/specialized/UserActionHandler';
import type { EntityId } from '../types/common';
import type { UniversalEvent } from '../../types/events.d.ts';
import type { Room, RoomSettings } from '../types/room';
import type { Game } from '../types/game';
import { createEventBusImpl } from '../EventBusImpl';
import { createGameEventHandlerImpl } from '../GameEventHandlerImpl';
import { createUserNotificationHandlerImpl } from '../UserNotificationHandlerImpl';
import { createUserActionHandlerImpl } from '../UserActionHandlerImpl';

/**
 * Complete implementation of UnifiedGameServer
 */
export class UnifiedGameServerImpl implements UnifiedGameServer {
  readonly eventBus: EventBus;
  readonly gameEvents: GameEventHandler;
  readonly notifications: UserNotificationHandler;
  readonly userActions: UserActionHandler;

  private _isRunning = false;
  private _startTime?: Date;
  private _config?: UnifiedGameServerConfig;
  private readonly _connections = new Map<EntityId, ConnectionInfo>();
  private readonly _rooms = new Map<EntityId, Room>();
  private readonly _games = new Map<EntityId, Game>();

  constructor() {
    // Initialize the unified event system
    this.eventBus = createEventBusImpl();
    this.gameEvents = createGameEventHandlerImpl(this.eventBus);
    this.notifications = createUserNotificationHandlerImpl(this.eventBus);
    this.userActions = createUserActionHandlerImpl(this.eventBus);

    console.log('🎮 UnifiedGameServer created with event system integration');
  }

  async initialize(config: UnifiedGameServerConfig): Promise<void> {
    this._config = config;
    console.log('⚙️ UnifiedGameServer initialized with config:', config);
    // TODO: Initialize database connections, Redis, etc.
  }

  async start(): Promise<void> {
    if (this._isRunning) {
      return; // Gracefully handle multiple start calls
    }

    // Initialize EventBus with default config if not already initialized
    if (!this.eventBus.getStatus().running) {
      const defaultEventBusConfig = {
        defaultTTL: 300000,
        maxEventSize: KILOBYTES_64 * BYTES_PER_KB,
        enablePersistence: this._config?.eventBus?.enablePersistence ?? false,
        enableTracing: this._config?.eventBus?.enableTracing ?? true,
        defaultRetry: {
          maxAttempts: 3,
          baseDelayMs: 1000,
          backoffMultiplier: 2,
          maxDelayMs: 10000,
        },
        monitoring: {
          enableMetrics: true,
          metricsIntervalMs: 30000,
          enableSampling: false,
          samplingRate: 0,
          alertThresholds: {
            maxLatencyMs: 1000,
            maxErrorRate: 10,
            maxQueueDepth: 1000,
            maxMemoryBytes: MEGABYTES_512 * BYTES_PER_KB * BYTES_PER_KB,
          },
        },
      };
      await this.eventBus.initialize(this._config?.eventBus || defaultEventBusConfig);
    }

    this._isRunning = true;
    this._startTime = new Date();
    console.log('🚀 UnifiedGameServer started');
    // TODO: Start WebSocket server, connect to databases
  }

  async stop(): Promise<void> {
    if (!this._isRunning) {
      return;
    }

    // Shutdown EventBus
    if (this.eventBus.getStatus().running) {
      await this.eventBus.shutdown();
    }

    this._isRunning = false;
    console.log('🛑 UnifiedGameServer stopped');
    // TODO: Close connections, cleanup resources
  }

  getStatus(): ServerStatus {
    return {
      isRunning: this._isRunning,
      startTime: this._startTime,
      uptime: this._startTime ? Date.now() - this._startTime.getTime() : 0,
      activeConnections: this._connections.size,
      activeRooms: this._rooms.size,
      activeGames: this._games.size,
      eventBusStatus: 'connected', // TODO: Get from EventBus
      gameHandlerStatus: 'ready',   // TODO: Get from GameEventHandler
      notificationStatus: 'ready',  // TODO: Get from UserNotificationHandler
      userActionStatus: 'ready',     // TODO: Get from UserActionHandler
    };
  }

  async handleConnection(connectionInfo: any): Promise<{ success: boolean; connectionId: string }> {
    if (!connectionInfo) {
      throw new Error('ConnectionInfo is required');
    }
    if (!connectionInfo.connectionId) {
      throw new Error('Connection ID is required');
    }
    
    this._connections.set(connectionInfo.connectionId, connectionInfo);
    console.log(`🔌 Connection handled: ${connectionInfo.connectionId}`);
    // TODO: Setup WebSocket message handlers, integrate with EventBus
    return { success: true, connectionId: connectionInfo.connectionId };
  }

  async handleDisconnection(connectionId: EntityId): Promise<{ success: boolean; connectionId: string }> {
    if (!connectionId) {
      throw new Error('Connection ID is required');
    }
    
    const existed = this._connections.has(connectionId);
    this._connections.delete(connectionId);
    console.log(`🔌 Connection removed: ${connectionId}`);
    // TODO: Cleanup subscriptions, notify other players
    return { success: true, connectionId };
  }

  async createRoom(hostPlayerId: EntityId, settings: RoomSettings): Promise<Room> {
    const roomId = generateId('room');
    const room: Room = {
      roomId,
      hostPlayerId,
      settings,
      players: [],
      status: 'waiting',
      createdAt: new Date(),
      gameId: null,
    };

    this._rooms.set(roomId, room);
    console.log(`🏠 Room created: ${roomId}`);
    
    // TODO: Publish room creation event through EventBus
    return room;
  }

  async startGame(roomId: EntityId): Promise<Game> {
    const room = this._rooms.get(roomId);
    if (!room) {
      throw new Error(`Room not found: ${roomId}`);
    }

    const gameId = generateId('game');
    const game: Game = {
      gameId,
      roomId,
      players: [...room.players],
      status: 'active',
      createdAt: new Date(),
      startedAt: new Date(),
      gameState: {
        maze: { width: 15, height: 11, walls: [], destructibleWalls: [] },
        players: new Map(),
        bombs: new Map(),
        powerUps: [],
        monsters: [],
        gates: [],
      },
      settings: {
        maxPlayers: 8,
        respawnTime: 10000,
        bombTimer: 3000,
        powerUpSpawnRate: 0.1,
      },
    };

    this._games.set(gameId, game);
    room.gameId = gameId;
    room.status = 'in_game';

    console.log(`🎮 Game started: ${gameId}`);
    
    // TODO: Initialize game state, publish game start event
    return game;
  }

  async publishEvent<TData>(event: UniversalEvent<TData>): Promise<{ success: boolean; eventId: string }> {
    const result = await this.eventBus.publish(event);
    console.log(`📤 Event published: ${event.category}/${event.type}`);
    return result;
  }

  // WebSocket client publishing method (from interface)
  async publishEventFromClient<TData>(connectionId: EntityId, event: UniversalEvent<TData>): Promise<{ success: boolean; eventId: string }> {
    // TODO: Add permission checks based on connectionId
    return this.publishEvent(event);
  }
}

/**
 * Factory function to create UnifiedGameServer instance
 */
export function createUnifiedGameServer(): UnifiedGameServer {
  return new UnifiedGameServerImpl();
}

/**
 * Create and configure a UnifiedGameServer with default settings
 */
export async function createConfiguredUnifiedGameServer(
  config?: Partial<UnifiedGameServerConfig>,
): Promise<UnifiedGameServer> {
  const defaultConfig: UnifiedGameServerConfig = {
    server: {
      port: 8080,
      maxConnections: 1000,
      connectionTimeout: 30000,
      enableCompression: true,
      cors: {
        allowedOrigins: ['*'],
        allowCredentials: true,
      },
    },
    eventBus: {
      defaultTTL: 300000,
      maxEventSize: KILOBYTES_64 * BYTES_PER_KB,
      enablePersistence: false,
      enableTracing: true,
      defaultRetry: {
        maxAttempts: 3,
        baseDelayMs: 1000,
        backoffMultiplier: 2,
        maxDelayMs: 10000,
      },
      monitoring: {
        enableMetrics: true,
        metricsIntervalMs: 30000,
        enableSampling: true,
        samplingRate: 0.1,
        alertThresholds: {
          maxLatencyMs: 1000,
          maxErrorRate: 10,
          maxQueueDepth: 1000,
          maxMemoryBytes: MEGABYTES_512 * BYTES_PER_KB * BYTES_PER_KB,
        },
      },
    },
    redis: {
      host: process.env.REDIS_HOST ?? 'localhost',
      port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
      password: process.env.REDIS_PASSWORD,
    },
    database: {
      host: process.env.POSTGRES_HOST ?? 'localhost',
      port: parseInt(process.env.POSTGRES_PORT ?? '5432', 10),
      database: process.env.POSTGRES_DB ?? 'bomberman',
      username: process.env.POSTGRES_USER ?? 'bomberman_user',
      password: process.env.POSTGRES_PASSWORD,
    },
  };

  const mergedConfig = { ...defaultConfig, ...config };
  const server = createUnifiedGameServer();
  await server.initialize(mergedConfig);
  
  return server;
}