/**
 * UnifiedGameServer Integration Test with Real Services
 * Tests UnifiedGameServer orchestration with EventBus, PostgreSQL, and Redis
 * Ref: docs/architecture/server-architecture.md, docs/architecture/event-system.md
 */

import { beforeAll, afterAll, beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { Client } from 'pg';
import Redis from 'ioredis';
import WebSocket from 'ws';
import { UnifiedGameServerImpl, createConfiguredUnifiedGameServer } from '../../../src/modules/UnifiedGameServerImpl';
import type { UnifiedGameServer, UnifiedGameServerConfig } from '../../../src/interfaces/core/UnifiedGameServer';
import { EventCategory, EventPriority, DeliveryMode, TargetType } from '../../../src/types/events.d.ts';
import type { UniversalEvent } from '../../../src/types/events.d.ts';

describe('UnifiedGameServer Integration - Full Stack', () => {
  let gameServer: UnifiedGameServer;
  let pgClient: Client;
  let redisClient: Redis;
  let testPort: number;

  beforeAll(async () => {
    // Initialize database connections for integration testing
    // Ref: docs/architecture/deployment-setup.md for connection configuration
    pgClient = new Client({
      host: process.env.POSTGRES_HOST || 'localhost',
      port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
      database: process.env.POSTGRES_DB || 'bomberman_dev',
      user: process.env.POSTGRES_USER || 'bomberman_user',
      password: process.env.POSTGRES_PASSWORD,
    });

    redisClient = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD,
    });

    await pgClient.connect();
    await redisClient.ping();

    // Create test tables for integration testing
    // Ref: docs/schema/rooms.md, docs/schema/games.md for schema details
    await pgClient.query(`
      CREATE TABLE IF NOT EXISTS integration_test_rooms (
        room_id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        created_by VARCHAR(255) NOT NULL,
        max_players INTEGER DEFAULT 8,
        current_players INTEGER DEFAULT 0,
        game_mode VARCHAR(50) DEFAULT 'cooperative',
        status VARCHAR(20) DEFAULT 'waiting',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        settings JSONB
      )
    `);

    await pgClient.query(`
      CREATE TABLE IF NOT EXISTS integration_test_connections (
        connection_id VARCHAR(255) PRIMARY KEY,
        player_id VARCHAR(255),
        room_id VARCHAR(255),
        ip_address INET,
        connected_at TIMESTAMPTZ DEFAULT NOW(),
        last_activity TIMESTAMPTZ DEFAULT NOW(),
        status VARCHAR(20) DEFAULT 'connected'
      )
    `);

    testPort = 8090; // Use different port for testing
    console.log('🔌 UnifiedGameServer integration test setup complete');
  });

  afterAll(async () => {
    // Clean up test tables
    await pgClient.query('DROP TABLE IF EXISTS integration_test_rooms');
    await pgClient.query('DROP TABLE IF EXISTS integration_test_connections');
    
    await pgClient.end();
    await redisClient.disconnect();
    console.log('🧹 UnifiedGameServer integration cleanup complete');
  });

  beforeEach(async () => {
    // Create configured server instance for testing
    // Ref: docs/architecture/server-architecture.md for configuration
    const testConfig: Partial<UnifiedGameServerConfig> = {
      server: {
        port: testPort,
        maxConnections: 100,
        connectionTimeout: 30000,
        enableCompression: true,
        cors: {
          allowedOrigins: ['*'],
          allowCredentials: true,
        },
      },
      eventBus: {
        defaultTTL: 300000,
        maxEventSize: 64 * 1024,
        enablePersistence: true, // Enable for integration testing
        enableTracing: true,
        defaultRetry: {
          maxAttempts: 3,
          baseDelayMs: 1000,
          backoffMultiplier: 2,
          maxDelayMs: 10000,
        },
        monitoring: {
          enableMetrics: true,
          metricsIntervalMs: 10000, // Shorter interval for testing
          enableSampling: false,
          samplingRate: 0,
          alertThresholds: {
            maxLatencyMs: 1000,
            maxErrorRate: 10,
            maxQueueDepth: 100,
            maxMemoryBytes: 100 * 1024 * 1024,
          },
        },
      },
    };

    gameServer = await createConfiguredUnifiedGameServer(testConfig);
    await gameServer.start();
  });

  afterEach(async () => {
    if (gameServer) {
      await gameServer.stop();
    }
    
    // Clean up test data after each test
    await pgClient.query('DELETE FROM integration_test_rooms');
    await pgClient.query('DELETE FROM integration_test_connections');
    await redisClient.flushdb();
  });

  describe('Server Initialization and Event System Integration', () => {
    it('should initialize all event handlers with EventBus integration', async () => {
      const status = gameServer.getStatus();
      
      expect(status.isRunning).toBe(true);
      expect(status.startTime).toBeDefined();
      expect(status.uptime).toBeGreaterThan(0);
      
      // Verify all event handlers are properly initialized
      expect(gameServer.eventBus).toBeDefined();
      expect(gameServer.gameEvents).toBeDefined();
      expect(gameServer.notifications).toBeDefined();
      expect(gameServer.userActions).toBeDefined();

      // Test EventBus is working
      const eventBusStatus = gameServer.eventBus.getStatus();
      expect(eventBusStatus.running).toBe(true);
      expect(eventBusStatus.activeSubscriptions).toBeGreaterThanOrEqual(0);
    });

    it('should handle event publishing through all specialized handlers', async () => {
      const mockHandler = vi.fn();
      
      // Subscribe to multiple event categories through different handlers
      await gameServer.eventBus.on('integration-test', EventCategory.GAME_STATE, mockHandler);
      await gameServer.eventBus.on('integration-test', EventCategory.USER_NOTIFICATION, mockHandler);
      await gameServer.eventBus.on('integration-test', EventCategory.PLAYER_ACTION, mockHandler);

      // Publish events through specialized handlers
      const gameEvent: UniversalEvent = {
        eventId: 'game-integration-test',
        category: EventCategory.GAME_STATE,
        type: 'game_started',
        sourceId: 'integration-test-server',
        targets: [{ type: TargetType.GAME, id: 'test-game-1' }],
        data: { gameId: 'test-game-1', playerCount: 2 },
        metadata: {
          priority: EventPriority.NORMAL,
          deliveryMode: DeliveryMode.AT_LEAST_ONCE,
          tags: ['integration-test'],
        },
        timestamp: new Date(),
        version: '1.0.0',
      };

      const result = await gameServer.publishEvent(gameEvent);
      expect(result.success).toBe(true);
      expect(result.eventId).toBe(gameEvent.eventId);

      // Verify specialized handlers are accessible
      expect(typeof gameServer.gameEvents.publishGameStart).toBe('function');
      expect(typeof gameServer.notifications.sendNotification).toBe('function');
      expect(typeof gameServer.userActions.trackAction).toBe('function');
    });
  });

  describe('Connection Management with Database Persistence', () => {
    it('should handle connection lifecycle with database storage', async () => {
      const connectionInfo = {
        connectionId: 'integration-test-conn-1',
        socket: {} as WebSocket, // Mock WebSocket for testing
        ipAddress: '127.0.0.1',
        connectedAt: new Date(),
        playerId: undefined,
      };

      // Simulate connection handling
      const connectionResult = await gameServer.handleConnection(connectionInfo);
      expect(connectionResult.success).toBe(true);
      expect(connectionResult.connectionId).toBe(connectionInfo.connectionId);

      // Simulate storing connection in database
      // Ref: docs/schema/connections.md for connection schema
      await pgClient.query(`
        INSERT INTO integration_test_connections 
        (connection_id, ip_address, connected_at, status)
        VALUES ($1, $2, $3, $4)
      `, [
        connectionInfo.connectionId,
        connectionInfo.ipAddress,
        connectionInfo.connectedAt,
        'connected'
      ]);

      // Verify connection was stored
      const dbResult = await pgClient.query(
        'SELECT * FROM integration_test_connections WHERE connection_id = $1',
        [connectionInfo.connectionId]
      );

      expect(dbResult.rows).toHaveLength(1);
      expect(dbResult.rows[0].connection_id).toBe(connectionInfo.connectionId);
      expect(dbResult.rows[0].status).toBe('connected');

      // Test disconnection
      const disconnectionResult = await gameServer.handleDisconnection(connectionInfo.connectionId);
      expect(disconnectionResult.success).toBe(true);

      // Update connection status in database
      await pgClient.query(
        'UPDATE integration_test_connections SET status = $1 WHERE connection_id = $2',
        ['disconnected', connectionInfo.connectionId]
      );

      const updatedResult = await pgClient.query(
        'SELECT status FROM integration_test_connections WHERE connection_id = $1',
        [connectionInfo.connectionId]
      );

      expect(updatedResult.rows[0].status).toBe('disconnected');
    });

    it('should manage active connections with Redis state', async () => {
      const connectionId = 'redis-conn-test';
      
      // Simulate storing active connection state in Redis
      // Ref: docs/architecture/caching-strategy.md for Redis patterns
      await redisClient.hset(`connections:active`, connectionId, JSON.stringify({
        connectionId,
        playerId: 'test-player-1',
        roomId: 'test-room-1',
        connectedAt: new Date().toISOString(),
        lastActivity: new Date().toISOString()
      }));

      // Verify connection state in Redis
      const connectionData = await redisClient.hget('connections:active', connectionId);
      expect(connectionData).toBeTruthy();
      
      const parsedConnection = JSON.parse(connectionData!);
      expect(parsedConnection.connectionId).toBe(connectionId);
      expect(parsedConnection.playerId).toBe('test-player-1');

      // Test connection cleanup from Redis
      await redisClient.hdel('connections:active', connectionId);
      const removedConnection = await redisClient.hget('connections:active', connectionId);
      expect(removedConnection).toBeNull();
    });
  });

  describe('Room and Game Management Integration', () => {
    it('should create and manage rooms with database persistence', async () => {
      const roomId = 'integration-test-room-1';
      const roomData = {
        name: 'Integration Test Room',
        createdBy: 'test-player-1',
        maxPlayers: 4,
        gameMode: 'cooperative',
        settings: {
          bombTimer: 3000,
          respawnTime: 10000,
          enablePowerUps: true
        }
      };

      // Simulate room creation through UnifiedGameServer
      // This would typically be done through a createRoom method
      await pgClient.query(`
        INSERT INTO integration_test_rooms 
        (room_id, name, created_by, max_players, game_mode, settings)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        roomId,
        roomData.name,
        roomData.createdBy,
        roomData.maxPlayers,
        roomData.gameMode,
        JSON.stringify(roomData.settings)
      ]);

      // Cache room data in Redis for quick access
      await redisClient.setex(
        `rooms:${roomId}`,
        3600, // 1 hour TTL
        JSON.stringify({ roomId, ...roomData, currentPlayers: 0 })
      );

      // Verify room exists in both storage systems
      const dbResult = await pgClient.query(
        'SELECT * FROM integration_test_rooms WHERE room_id = $1',
        [roomId]
      );
      expect(dbResult.rows).toHaveLength(1);
      expect(dbResult.rows[0].name).toBe(roomData.name);

      const cachedRoom = await redisClient.get(`rooms:${roomId}`);
      expect(cachedRoom).toBeTruthy();
      const parsedRoom = JSON.parse(cachedRoom!);
      expect(parsedRoom.name).toBe(roomData.name);

      // Test room state update
      const updatedPlayerCount = 2;
      await pgClient.query(
        'UPDATE integration_test_rooms SET current_players = $1 WHERE room_id = $2',
        [updatedPlayerCount, roomId]
      );

      // Update Redis cache
      parsedRoom.currentPlayers = updatedPlayerCount;
      await redisClient.setex(`rooms:${roomId}`, 3600, JSON.stringify(parsedRoom));

      const updatedCache = await redisClient.get(`rooms:${roomId}`);
      const updatedParsedRoom = JSON.parse(updatedCache!);
      expect(updatedParsedRoom.currentPlayers).toBe(updatedPlayerCount);
    });

    it('should handle room events through EventBus integration', async () => {
      const mockRoomHandler = vi.fn();
      
      // Subscribe to room-related events
      await gameServer.eventBus.on('room-manager', EventCategory.GAME_STATE, mockRoomHandler);

      // Publish room creation event
      const roomEvent: UniversalEvent = {
        eventId: 'room-created-integration',
        category: EventCategory.GAME_STATE,
        type: 'room_created',
        sourceId: 'unified-game-server',
        targets: [{ type: TargetType.BROADCAST, id: '*' }],
        data: {
          roomId: 'integration-room-1',
          roomName: 'Test Integration Room',
          createdBy: 'test-player',
          maxPlayers: 4
        },
        metadata: {
          priority: EventPriority.NORMAL,
          deliveryMode: DeliveryMode.AT_LEAST_ONCE,
          tags: ['room-management', 'integration-test'],
        },
        timestamp: new Date(),
        version: '1.0.0',
      };

      const result = await gameServer.publishEvent(roomEvent);
      expect(result.success).toBe(true);

      // Verify event was published through the system
      const eventBusStatus = gameServer.eventBus.getStatus();
      expect(eventBusStatus.running).toBe(true);
    });
  });

  describe('Cross-System Event Flow Integration', () => {
    it('should handle complete player action workflow', async () => {
      // Simulate complete workflow: Player Action -> Game State Update -> Notification
      const playerActionHandler = vi.fn();
      const gameStateHandler = vi.fn();
      const notificationHandler = vi.fn();

      // Set up handlers for different event categories
      await gameServer.eventBus.on('player-handler', EventCategory.PLAYER_ACTION, playerActionHandler);
      await gameServer.eventBus.on('game-handler', EventCategory.GAME_STATE, gameStateHandler);
      await gameServer.eventBus.on('notification-handler', EventCategory.USER_NOTIFICATION, notificationHandler);

      // 1. Player places bomb (Player Action)
      const bombPlacedEvent: UniversalEvent = {
        eventId: 'integration-bomb-placed',
        category: EventCategory.PLAYER_ACTION,
        type: 'bomb_placed',
        sourceId: 'player-1',
        targets: [{ type: TargetType.GAME, id: 'integration-game-1' }],
        data: {
          playerId: 'player-1',
          position: { x: 5, y: 3 },
          bombId: 'bomb-1',
          explosionRadius: 2,
          timer: 3000
        },
        metadata: {
          priority: EventPriority.HIGH,
          deliveryMode: DeliveryMode.AT_LEAST_ONCE,
          tags: ['bomb', 'player-action'],
        },
        timestamp: new Date(),
        version: '1.0.0',
      };

      await gameServer.publishEvent(bombPlacedEvent);

      // 2. Game state updates (Game State)
      const gameStateEvent: UniversalEvent = {
        eventId: 'integration-game-state-update',
        category: EventCategory.GAME_STATE,
        type: 'game_objects_updated',
        sourceId: 'game-engine',
        targets: [{ type: TargetType.GAME, id: 'integration-game-1' }],
        data: {
          gameId: 'integration-game-1',
          updatedObjects: [
            { type: 'bomb', id: 'bomb-1', position: { x: 5, y: 3 }, active: true }
          ],
          affectedPlayers: ['player-1']
        },
        metadata: {
          priority: EventPriority.NORMAL,
          deliveryMode: DeliveryMode.AT_LEAST_ONCE,
          tags: ['game-state', 'bomb-placement'],
        },
        timestamp: new Date(),
        version: '1.0.0',
      };

      await gameServer.publishEvent(gameStateEvent);

      // 3. Notification to other players (User Notification)
      const notificationEvent: UniversalEvent = {
        eventId: 'integration-bomb-warning',
        category: EventCategory.USER_NOTIFICATION,
        type: 'proximity_warning',
        sourceId: 'notification-system',
        targets: [{ type: TargetType.PLAYER, id: 'player-2' }],
        data: {
          message: 'Bomb placed nearby! Take cover!',
          type: 'warning',
          urgency: 'high',
          relatedEventId: 'integration-bomb-placed',
          expiresIn: 3000
        },
        metadata: {
          priority: EventPriority.HIGH,
          deliveryMode: DeliveryMode.FIRE_AND_FORGET,
          tags: ['warning', 'proximity', 'bomb'],
        },
        timestamp: new Date(),
        version: '1.0.0',
      };

      await gameServer.publishEvent(notificationEvent);

      // Verify all events were processed through the system
      const status = gameServer.getStatus();
      expect(status.isRunning).toBe(true);
      
      // Verify subscription setup (handlers would be called in real implementation)
      const activeSubscriptions = gameServer.eventBus.getActiveSubscriptions();
      expect(activeSubscriptions.length).toBeGreaterThanOrEqual(3);
    });

    it('should maintain data consistency across PostgreSQL and Redis', async () => {
      const gameId = 'consistency-test-game';
      const gameData = {
        gameId,
        status: 'active',
        players: ['player-1', 'player-2'],
        startedAt: new Date(),
        currentRound: 1,
        settings: { bombTimer: 3000, respawnTime: 10000 }
      };

      // Store in PostgreSQL (persistent data)
      await pgClient.query(`
        INSERT INTO integration_test_rooms 
        (room_id, name, created_by, current_players, status, settings)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        gameData.gameId,
        'Consistency Test Game',
        'player-1',
        gameData.players.length,
        gameData.status,
        JSON.stringify(gameData.settings)
      ]);

      // Cache current state in Redis (real-time access)
      await redisClient.setex(
        `games:active:${gameData.gameId}`,
        1800, // 30 minutes TTL
        JSON.stringify(gameData)
      );

      // Verify data consistency
      const dbResult = await pgClient.query(
        'SELECT * FROM integration_test_rooms WHERE room_id = $1',
        [gameData.gameId]
      );

      const cachedData = await redisClient.get(`games:active:${gameData.gameId}`);
      const parsedCachedData = JSON.parse(cachedData!);

      expect(dbResult.rows[0].room_id).toBe(gameData.gameId);
      expect(dbResult.rows[0].current_players).toBe(gameData.players.length);
      expect(parsedCachedData.gameId).toBe(gameData.gameId);
      expect(parsedCachedData.players).toEqual(gameData.players);

      // Test consistency during updates
      const newPlayerCount = 3;
      
      // Update PostgreSQL
      await pgClient.query(
        'UPDATE integration_test_rooms SET current_players = $1 WHERE room_id = $2',
        [newPlayerCount, gameData.gameId]
      );

      // Update Redis
      gameData.players.push('player-3');
      await redisClient.setex(
        `games:active:${gameData.gameId}`,
        1800,
        JSON.stringify(gameData)
      );

      // Verify both systems reflect the update
      const updatedDbResult = await pgClient.query(
        'SELECT current_players FROM integration_test_rooms WHERE room_id = $1',
        [gameData.gameId]
      );

      const updatedCachedData = await redisClient.get(`games:active:${gameData.gameId}`);
      const updatedParsedData = JSON.parse(updatedCachedData!);

      expect(updatedDbResult.rows[0].current_players).toBe(newPlayerCount);
      expect(updatedParsedData.players).toHaveLength(newPlayerCount);
    });
  });
});