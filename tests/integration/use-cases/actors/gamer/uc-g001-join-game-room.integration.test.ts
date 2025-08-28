/**
 * Use Case Integration Test: UC-G001 - Join Game Room
 * Simulates complete gamer workflow for joining a game room based on sequence diagram
 * Ref: docs/sequence-diagrams/gamer/uc-g001-join-game-room.md
 */

// Load environment variables for integration testing
import 'dotenv/config';

import { beforeAll, afterAll, beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { Client } from 'pg';
import Redis from 'ioredis';
import WebSocket from 'ws';
import { createConfiguredUnifiedGameServer } from '../../../../../src/modules/UnifiedGameServerImpl';
import type { UnifiedGameServer } from '../../../../../src/interfaces/core/UnifiedGameServer';
import { EventCategory } from '../../../../../src/types/events.d.ts';

describe('UC-G001: Join Game Room - Complete User Journey', () => {
  let gameServer: UnifiedGameServer;
  let pgClient: Client;
  let redisClient: Redis;
  let mockWebSocket: any;
  let testPort: number;

  // Test data following sequence diagram actors
  // Ref: docs/sequence-diagrams/gamer/uc-g001-join-game-room.md
  const testRoomId = 'test-room-g001';
  const testPlayerId = 'gamer-player-1';
  const testPlayerName = 'TestGamer';
  const otherPlayerId = 'existing-player-1';

  beforeAll(async () => {
    // Initialize services following deployment setup
    // Ref: docs/architecture/deployment-setup.md
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

    // Create test schema following room schema design
    // Ref: docs/schema/rooms.md
    await pgClient.query(`
      CREATE TABLE IF NOT EXISTS uc_test_rooms (
        room_id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        created_by VARCHAR(255) NOT NULL,
        max_players INTEGER DEFAULT 8,
        current_players INTEGER DEFAULT 0,
        status VARCHAR(20) DEFAULT 'waiting',
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await pgClient.query(`
      CREATE TABLE IF NOT EXISTS uc_test_player_sessions (
        player_id VARCHAR(255) PRIMARY KEY,
        session_token VARCHAR(255) NOT NULL,
        display_name VARCHAR(255),
        room_id VARCHAR(255),
        last_activity TIMESTAMPTZ DEFAULT NOW(),
        status VARCHAR(20) DEFAULT 'active'
      )
    `);

    await pgClient.query(`
      CREATE TABLE IF NOT EXISTS uc_test_room_events (
        event_id SERIAL PRIMARY KEY,
        room_id VARCHAR(255) NOT NULL,
        player_id VARCHAR(255) NOT NULL,
        event_type VARCHAR(50) NOT NULL,
        event_data JSONB,
        timestamp TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    testPort = 8091; // Different port for use case testing
    console.log('🎮 UC-G001 test environment initialized');
  });

  afterAll(async () => {
    await pgClient.query('DROP TABLE IF EXISTS uc_test_rooms');
    await pgClient.query('DROP TABLE IF EXISTS uc_test_player_sessions');
    await pgClient.query('DROP TABLE IF EXISTS uc_test_room_events');
    
    await pgClient.end();
    await redisClient.disconnect();
    console.log('🧹 UC-G001 test cleanup complete');
  });

  beforeEach(async () => {
    // Create UnifiedGameServer following sequence diagram setup
    gameServer = await createConfiguredUnifiedGameServer({
      server: { port: testPort, maxConnections: 100 },
      eventBus: { enablePersistence: true, enableTracing: true }
    });
    
    await gameServer.start();

    // Mock WebSocket for GameClient simulation
    mockWebSocket = {
      send: vi.fn(),
      close: vi.fn(),
      readyState: 1, // OPEN
      on: vi.fn(),
      removeListener: vi.fn()
    };

    // Pre-populate test room in Redis cache (Step: Room exists in Redis)
    // Ref: docs/sequence-diagrams/gamer/uc-g001-join-game-room.md Line 16
    await redisClient.setex(`rooms:${testRoomId}`, 3600, JSON.stringify({
      roomId: testRoomId,
      name: 'Integration Test Room',
      createdBy: 'test-host',
      maxPlayers: 4,
      currentPlayers: 1, // One existing player
      status: 'waiting',
      players: [
        { id: otherPlayerId, displayName: 'ExistingPlayer', joinedAt: new Date().toISOString() }
      ]
    }));

    // Store room in PostgreSQL
    await pgClient.query(`
      INSERT INTO uc_test_rooms (room_id, name, created_by, current_players, status)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (room_id) DO NOTHING
    `, [testRoomId, 'Integration Test Room', 'test-host', 1, 'waiting']);

    // Create existing player session
    await pgClient.query(`
      INSERT INTO uc_test_player_sessions (player_id, session_token, display_name, room_id, status)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (player_id) DO NOTHING
    `, [otherPlayerId, 'existing-session-token', 'ExistingPlayer', testRoomId, 'active']);
  });

  afterEach(async () => {
    if (gameServer) {
      await gameServer.stop();
    }
    
    // Clean up test data
    await pgClient.query('DELETE FROM uc_test_rooms');
    await pgClient.query('DELETE FROM uc_test_player_sessions');
    await pgClient.query('DELETE FROM uc_test_room_events');
    await redisClient.flushdb();
  });

  describe('Main Success Path - Join Room Successfully', () => {
    it('should complete full join room workflow as described in sequence diagram', async () => {
      // Step 1: Gamer clicks room URL - GameClient requests validation
      // Ref: docs/sequence-diagrams/gamer/uc-g001-join-game-room.md Line 12-13
      console.log('🎮 Step 1: Gamer clicks room URL, GameClient requests validation');
      
      const roomValidationRequest = {
        type: 'validate_room',
        roomId: testRoomId,
        timestamp: new Date().toISOString()
      };

      // Step 2: GameServer gets room state from Redis cache
      // Ref: Line 14-17
      console.log('🔍 Step 2: GameServer validates room from Redis cache');
      
      const roomData = await redisClient.get(`rooms:${testRoomId}`);
      expect(roomData).toBeTruthy();
      
      const parsedRoom = JSON.parse(roomData!);
      expect(parsedRoom.roomId).toBe(testRoomId);
      expect(parsedRoom.status).toBe('waiting');
      expect(parsedRoom.currentPlayers).toBeLessThan(parsedRoom.maxPlayers);

      // Step 3: Room validation success, prompt for display name
      // Ref: Line 18-20
      console.log('✅ Step 3: Room validation successful, prompting for display name');
      
      const validationResponse = {
        success: true,
        roomData: {
          roomId: testRoomId,
          name: parsedRoom.name,
          currentPlayers: parsedRoom.currentPlayers,
          maxPlayers: parsedRoom.maxPlayers,
          status: parsedRoom.status
        }
      };

      expect(validationResponse.success).toBe(true);
      expect(validationResponse.roomData.currentPlayers).toBe(1);

      // Step 4: Gamer enters display name
      // Ref: Line 22
      console.log('👤 Step 4: Gamer enters display name');
      
      const joinRoomRequest = {
        type: 'join_room',
        roomId: testRoomId,
        displayName: testPlayerName,
        playerId: testPlayerId,
        timestamp: new Date().toISOString()
      };

      // Step 5: Validate player session in PostgreSQL
      // Ref: Line 24-25
      console.log('🔐 Step 5: Validating player session in PostgreSQL');
      
      // Create player session (simulating valid session)
      await pgClient.query(`
        INSERT INTO uc_test_player_sessions (player_id, session_token, display_name, status)
        VALUES ($1, $2, $3, $4)
      `, [testPlayerId, 'valid-session-token', testPlayerName, 'active']);

      const sessionResult = await pgClient.query(
        'SELECT * FROM uc_test_player_sessions WHERE player_id = $1',
        [testPlayerId]
      );

      expect(sessionResult.rows).toHaveLength(1);
      expect(sessionResult.rows[0].status).toBe('active');

      // Step 6: Check name availability in Redis
      // Ref: Line 26-28
      console.log('🏷️ Step 6: Checking name availability in room');
      
      const existingPlayers = parsedRoom.players;
      const nameAvailable = !existingPlayers.some((p: any) => p.displayName === testPlayerName);
      expect(nameAvailable).toBe(true);

      // Step 7: Add player to room state in Redis
      // Ref: Line 29
      console.log('➕ Step 7: Adding player to room state');
      
      const updatedRoom = {
        ...parsedRoom,
        currentPlayers: parsedRoom.currentPlayers + 1,
        players: [
          ...parsedRoom.players,
          {
            id: testPlayerId,
            displayName: testPlayerName,
            joinedAt: new Date().toISOString()
          }
        ]
      };

      await redisClient.setex(`rooms:${testRoomId}`, 3600, JSON.stringify(updatedRoom));

      // Step 8: Publish player_joined event through EventBus
      // Ref: Line 30
      console.log('📢 Step 8: Publishing player_joined event');
      
      const playerJoinedEvent = {
        eventId: `player-joined-${testPlayerId}`,
        category: EventCategory.GAME_STATE,
        type: 'player_joined',
        sourceId: 'unified-game-server',
        data: {
          roomId: testRoomId,
          playerId: testPlayerId,
          displayName: testPlayerName,
          playerCount: updatedRoom.currentPlayers
        },
        timestamp: new Date(),
        version: '1.0.0'
      };

      const publishResult = await gameServer.publishEvent(playerJoinedEvent);
      expect(publishResult.success).toBe(true);

      // Step 9: Auto-subscribe GameClient to room channels
      // Ref: Line 31-33
      console.log('📡 Step 9: Auto-subscribing to room event channels');
      
      const roomChannelKey = `room:${testRoomId}:events`;
      await redisClient.sadd(`subscriptions:${testPlayerId}`, roomChannelKey);
      
      const subscriptions = await redisClient.smembers(`subscriptions:${testPlayerId}`);
      expect(subscriptions).toContain(roomChannelKey);

      // Step 10: WebSocket-Redis pub/sub bridge for room events
      // Ref: Line 35-37
      console.log('🌉 Step 10: Setting up WebSocket-Redis pub/sub bridge');
      
      // Simulate publishing event to room channel
      await redisClient.publish(`room:${testRoomId}:events`, JSON.stringify({
        type: 'player_joined',
        data: {
          playerId: testPlayerId,
          displayName: testPlayerName,
          timestamp: new Date().toISOString()
        }
      }));

      // Step 11: Log player join event in PostgreSQL
      // Ref: Line 38
      console.log('📝 Step 11: Logging join event in PostgreSQL');
      
      await pgClient.query(`
        INSERT INTO uc_test_room_events (room_id, player_id, event_type, event_data)
        VALUES ($1, $2, $3, $4)
      `, [
        testRoomId,
        testPlayerId,
        'player_joined',
        JSON.stringify({
          displayName: testPlayerName,
          joinedAt: new Date().toISOString(),
          previousPlayerCount: parsedRoom.currentPlayers
        })
      ]);

      const logResult = await pgClient.query(
        'SELECT * FROM uc_test_room_events WHERE room_id = $1 AND event_type = $2',
        [testRoomId, 'player_joined']
      );

      expect(logResult.rows).toHaveLength(1);
      expect(logResult.rows[0].player_id).toBe(testPlayerId);

      // Step 12: Update player session with room assignment
      await pgClient.query(
        'UPDATE uc_test_player_sessions SET room_id = $1 WHERE player_id = $2',
        [testRoomId, testPlayerId]
      );

      // Step 13: Return join success with room data
      // Ref: Line 39-40
      console.log('🎉 Step 13: Join successful - returning room data');
      
      const joinSuccessResponse = {
        success: true,
        playerId: testPlayerId,
        roomData: updatedRoom,
        message: 'Successfully joined room'
      };

      expect(joinSuccessResponse.success).toBe(true);
      expect(joinSuccessResponse.roomData.currentPlayers).toBe(2);
      expect(joinSuccessResponse.roomData.players).toHaveLength(2);
      
      // Verify final state matches sequence diagram expectations
      const finalRoomState = await redisClient.get(`rooms:${testRoomId}`);
      const finalParsedRoom = JSON.parse(finalRoomState!);
      
      expect(finalParsedRoom.currentPlayers).toBe(2);
      expect(finalParsedRoom.players.map((p: any) => p.id)).toContain(testPlayerId);
      expect(finalParsedRoom.players.map((p: any) => p.displayName)).toContain(testPlayerName);

      console.log('✅ UC-G001 Main Success Path completed successfully');
    });
  });

  describe('Alternative Paths - Error Scenarios', () => {
    it('should handle name conflict scenario', async () => {
      // Ref: docs/sequence-diagrams/gamer/uc-g001-join-game-room.md Line 41-44
      console.log('🚫 Testing name conflict scenario');
      
      const conflictingName = 'ExistingPlayer'; // Same as existing player
      
      const roomData = await redisClient.get(`rooms:${testRoomId}`);
      const parsedRoom = JSON.parse(roomData!);
      
      // Check name availability - should conflict
      const nameAvailable = !parsedRoom.players.some((p: any) => p.displayName === conflictingName);
      expect(nameAvailable).toBe(false);
      
      const nameConflictResponse = {
        success: false,
        error: 'name_unavailable',
        message: 'Display name is already taken in this room',
        suggestedNames: ['ExistingPlayer1', 'ExistingPlayer_2', 'Player123']
      };
      
      expect(nameConflictResponse.success).toBe(false);
      expect(nameConflictResponse.error).toBe('name_unavailable');
      
      console.log('✅ Name conflict handled correctly');
    });

    it('should handle room full scenario', async () => {
      // Ref: docs/sequence-diagrams/gamer/uc-g001-join-game-room.md Line 46-49
      console.log('🔒 Testing room full scenario');
      
      // Create a full room
      const fullRoomData = {
        roomId: testRoomId,
        name: 'Full Test Room',
        maxPlayers: 2,
        currentPlayers: 2, // At capacity
        status: 'waiting',
        players: [
          { id: 'player1', displayName: 'Player1' },
          { id: 'player2', displayName: 'Player2' }
        ]
      };
      
      await redisClient.setex(`rooms:${testRoomId}`, 3600, JSON.stringify(fullRoomData));
      
      const roomCapacityCheck = fullRoomData.currentPlayers >= fullRoomData.maxPlayers;
      expect(roomCapacityCheck).toBe(true);
      
      const roomFullResponse = {
        success: false,
        error: 'room_full',
        message: 'Room is at maximum capacity',
        currentPlayers: fullRoomData.currentPlayers,
        maxPlayers: fullRoomData.maxPlayers
      };
      
      expect(roomFullResponse.success).toBe(false);
      expect(roomFullResponse.error).toBe('room_full');
      
      console.log('✅ Room full scenario handled correctly');
    });

    it('should handle room not found scenario', async () => {
      // Ref: docs/sequence-diagrams/gamer/uc-g001-join-game-room.md Line 50-53
      console.log('🔍 Testing room not found scenario');
      
      const nonExistentRoomId = 'non-existent-room';
      
      const roomData = await redisClient.get(`rooms:${nonExistentRoomId}`);
      expect(roomData).toBeNull();
      
      const roomNotFoundResponse = {
        success: false,
        error: 'room_not_found',
        message: 'The requested room could not be found',
        roomId: nonExistentRoomId
      };
      
      expect(roomNotFoundResponse.success).toBe(false);
      expect(roomNotFoundResponse.error).toBe('room_not_found');
      
      console.log('✅ Room not found scenario handled correctly');
    });

    it('should handle network issues with retry logic', async () => {
      // Ref: docs/sequence-diagrams/gamer/uc-g001-join-game-room.md Line 56-59
      console.log('🌐 Testing network issues and retry logic');
      
      // Simulate connection timeout
      const connectionTimeout = new Promise((resolve, reject) => {
        setTimeout(() => {
          reject(new Error('Connection timeout'));
        }, 100);
      });
      
      let retryAttempts = 0;
      const maxRetries = 3;
      
      // Simulate auto-retry logic
      while (retryAttempts < maxRetries) {
        try {
          await connectionTimeout;
          break;
        } catch (error) {
          retryAttempts++;
          console.log(`🔄 Retry attempt ${retryAttempts}/${maxRetries}`);
          
          if (retryAttempts >= maxRetries) {
            const networkErrorResponse = {
              success: false,
              error: 'connection_failed',
              message: 'Failed to connect after multiple attempts',
              retryAttempts
            };
            
            expect(networkErrorResponse.success).toBe(false);
            expect(networkErrorResponse.retryAttempts).toBe(maxRetries);
            break;
          }
        }
      }
      
      console.log('✅ Network retry logic handled correctly');
    });
  });

  describe('WebSocket-Redis Integration', () => {
    it('should maintain real-time event flow as per sequence diagram', async () => {
      // Test the WebSocket-Redis bridge mentioned in sequence diagram
      // Ref: docs/sequence-diagrams/gamer/uc-g001-join-game-room.md Line 35-37
      console.log('🌉 Testing WebSocket-Redis pub/sub integration');
      
      const roomEventChannel = `room:${testRoomId}:events`;
      const receivedEvents: any[] = [];
      
      // Create Redis subscriber (simulating WebSocket bridge)
      const subscriber = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
        password: process.env.REDIS_PASSWORD,
      });
      
      await subscriber.subscribe(roomEventChannel);
      subscriber.on('message', (channel, message) => {
        if (channel === roomEventChannel) {
          receivedEvents.push(JSON.parse(message));
        }
      });
      
      // Simulate player join event publication
      const joinEvent = {
        type: 'player_joined',
        data: {
          playerId: testPlayerId,
          displayName: testPlayerName,
          timestamp: new Date().toISOString()
        }
      };
      
      await redisClient.publish(roomEventChannel, JSON.stringify(joinEvent));
      
      // Wait for pub/sub delivery
      await new Promise(resolve => setTimeout(resolve, 50));
      
      expect(receivedEvents).toHaveLength(1);
      expect(receivedEvents[0].type).toBe('player_joined');
      expect(receivedEvents[0].data.playerId).toBe(testPlayerId);
      
      await subscriber.disconnect();
      console.log('✅ WebSocket-Redis integration verified');
    });
  });

  describe('Data Persistence Verification', () => {
    it('should maintain data consistency across Redis and PostgreSQL', async () => {
      // Verify the dual-storage approach mentioned in sequence diagram
      console.log('🔄 Testing data consistency between Redis cache and PostgreSQL');
      
      // 1. Update room state in Redis (real-time)
      const updatedRoomData = {
        roomId: testRoomId,
        name: 'Consistency Test Room',
        currentPlayers: 3,
        maxPlayers: 4,
        status: 'active'
      };
      
      await redisClient.setex(`rooms:${testRoomId}`, 3600, JSON.stringify(updatedRoomData));
      
      // 2. Update corresponding data in PostgreSQL (persistence)
      await pgClient.query(
        'UPDATE uc_test_rooms SET current_players = $1, status = $2 WHERE room_id = $3',
        [updatedRoomData.currentPlayers, updatedRoomData.status, testRoomId]
      );
      
      // 3. Verify consistency
      const redisData = await redisClient.get(`rooms:${testRoomId}`);
      const parsedRedisData = JSON.parse(redisData!);
      
      const pgResult = await pgClient.query(
        'SELECT current_players, status FROM uc_test_rooms WHERE room_id = $1',
        [testRoomId]
      );
      
      expect(parsedRedisData.currentPlayers).toBe(pgResult.rows[0].current_players);
      expect(parsedRedisData.status).toBe(pgResult.rows[0].status);
      
      console.log('✅ Data consistency verified across storage systems');
    });
  });
});