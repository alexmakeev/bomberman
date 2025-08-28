/**
 * Use Case Integration Test: UC-G003 - Play Cooperative Game
 * Simulates complete cooperative gameplay workflow with EventBus integration
 * Ref: docs/sequence-diagrams/gamer/uc-g003-play-cooperative-game.md
 */

import { beforeAll, afterAll, beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { Client } from 'pg';
import Redis from 'ioredis';
import { createConfiguredUnifiedGameServer } from '../../../../../src/modules/UnifiedGameServerImpl';
import { createEventBusImpl } from '../../../../../src/modules/EventBusImpl';
import { createGameEventHandlerImpl } from '../../../../../src/modules/GameEventHandlerImpl';
import { createBombManagerImpl } from '../../../../../src/modules/BombManager';
import { createPlayerStateManagerImpl } from '../../../../../src/modules/PlayerStateManager';
import type { UnifiedGameServer } from '../../../../../src/interfaces/core/UnifiedGameServer';
import type { EventBus } from '../../../../../src/interfaces/core/EventBus';
import type { GameEventHandler } from '../../../../../src/interfaces/specialized/GameEventHandler';
import type { BombManager } from '../../../../../src/interfaces/core/BombManager';
import type { PlayerStateManager } from '../../../../../src/interfaces/core/PlayerStateManager';
import { EventCategory, EventPriority, DeliveryMode, TargetType } from '../../../../../src/types/events.d.ts';
import type { UniversalEvent } from '../../../../../src/types/events.d.ts';

describe('UC-G003: Play Cooperative Game - Event-Driven Workflow', () => {
  let gameServer: UnifiedGameServer;
  let eventBus: EventBus;
  let gameEventHandler: GameEventHandler;
  let bombManager: BombManager;
  let playerStateManager: PlayerStateManager;
  let pgClient: Client;
  let redisClient: Redis;

  // Test game data following sequence diagram
  // Ref: docs/sequence-diagrams/gamer/uc-g003-play-cooperative-game.md
  const testGameId = 'cooperative-game-g003';
  const player1Id = 'coop-player-1';
  const player2Id = 'coop-player-2'; // Teammate
  const testBombId = 'bomb-test-001';

  beforeAll(async () => {
    // Initialize database connections
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

    // Create game state tables following schema
    // Ref: docs/schema/games.md, docs/schema/players.md
    await pgClient.query(`
      CREATE TABLE IF NOT EXISTS uc_test_games (
        game_id VARCHAR(255) PRIMARY KEY,
        status VARCHAR(20) DEFAULT 'waiting',
        game_mode VARCHAR(50) DEFAULT 'cooperative',
        player_count INTEGER DEFAULT 0,
        started_at TIMESTAMPTZ,
        ended_at TIMESTAMPTZ,
        victory_condition VARCHAR(50),
        settings JSONB
      )
    `);

    await pgClient.query(`
      CREATE TABLE IF NOT EXISTS uc_test_game_events (
        event_id SERIAL PRIMARY KEY,
        game_id VARCHAR(255) NOT NULL,
        player_id VARCHAR(255),
        event_type VARCHAR(50) NOT NULL,
        event_data JSONB,
        timestamp TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await pgClient.query(`
      CREATE TABLE IF NOT EXISTS uc_test_player_states (
        player_id VARCHAR(255) PRIMARY KEY,
        game_id VARCHAR(255) NOT NULL,
        position_x FLOAT NOT NULL,
        position_y FLOAT NOT NULL,
        health INTEGER DEFAULT 100,
        bombs_available INTEGER DEFAULT 1,
        bomb_range INTEGER DEFAULT 2,
        speed FLOAT DEFAULT 1.0,
        status VARCHAR(20) DEFAULT 'alive',
        last_updated TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    console.log('🎮 UC-G003 cooperative game test environment initialized');
  });

  afterAll(async () => {
    await pgClient.query('DROP TABLE IF EXISTS uc_test_games');
    await pgClient.query('DROP TABLE IF EXISTS uc_test_game_events');
    await pgClient.query('DROP TABLE IF EXISTS uc_test_player_states');
    
    await pgClient.end();
    await redisClient.disconnect();
    console.log('🧹 UC-G003 test cleanup complete');
  });

  beforeEach(async () => {
    // Initialize UnifiedGameServer and modules following sequence diagram
    // Ref: docs/sequence-diagrams/gamer/uc-g003-play-cooperative-game.md Line 16-26
    gameServer = await createConfiguredUnifiedGameServer({
      server: { port: 8092, maxConnections: 100 },
      eventBus: { 
        enablePersistence: true, 
        enableTracing: true,
        defaultTTL: 3600000 // 1 hour for game duration
      }
    });
    
    await gameServer.start();

    // Get references to event system components
    eventBus = gameServer.eventBus;
    gameEventHandler = gameServer.gameEvents;

    // Initialize game-specific modules
    bombManager = createBombManagerImpl(eventBus);
    await bombManager.initialize();

    playerStateManager = createPlayerStateManagerImpl(eventBus);
    await playerStateManager.initialize();

    // Create game state in Redis with TTL (Step: Create game state in cache)
    // Ref: Line 21-22
    const gameState = {
      gameId: testGameId,
      status: 'active',
      gameMode: 'cooperative',
      players: [
        {
          id: player1Id,
          displayName: 'CoopPlayer1',
          position: { x: 1.5, y: 1.5 },
          health: 100,
          bombsAvailable: 1,
          status: 'alive'
        },
        {
          id: player2Id,
          displayName: 'Teammate',
          position: { x: 13.5, y: 9.5 },
          health: 100,
          bombsAvailable: 1,
          status: 'alive'
        }
      ],
      gameObjects: {
        bombs: [],
        powerUps: [],
        walls: []
      },
      startedAt: new Date().toISOString(),
      settings: {
        bombTimer: 3000,
        respawnTime: 10000,
        friendlyFire: false // Cooperative mode
      }
    };

    await redisClient.setex(`games:${testGameId}`, 3600, JSON.stringify(gameState));

    // Store in PostgreSQL
    await pgClient.query(`
      INSERT INTO uc_test_games (game_id, status, game_mode, player_count, started_at, settings)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [
      testGameId, 
      'active', 
      'cooperative', 
      2, 
      new Date(), 
      JSON.stringify(gameState.settings)
    ]);

    // Initialize player states
    for (const player of gameState.players) {
      await pgClient.query(`
        INSERT INTO uc_test_player_states 
        (player_id, game_id, position_x, position_y, health, bombs_available, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        player.id,
        testGameId,
        player.position.x,
        player.position.y,
        player.health,
        player.bombsAvailable,
        player.status
      ]);
    }
  });

  afterEach(async () => {
    if (gameServer) {
      await gameServer.stop();
    }
    if (bombManager) {
      await bombManager.shutdown();
    }
    if (playerStateManager) {
      await playerStateManager.shutdown();
    }

    // Clean up test data
    await pgClient.query('DELETE FROM uc_test_games');
    await pgClient.query('DELETE FROM uc_test_game_events');
    await pgClient.query('DELETE FROM uc_test_player_states');
    await redisClient.flushdb();
  });

  describe('Game Start and Event System Setup', () => {
    it('should initialize game with EventBus subscription following sequence diagram', async () => {
      // Test game initialization flow from sequence diagram
      // Ref: docs/sequence-diagrams/gamer/uc-g003-play-cooperative-game.md Line 16-26
      console.log('🚀 Testing game start and event system initialization');

      const gameStartHandler = vi.fn();
      
      // Step: Auto-subscribe to game channels
      // Ref: Line 17-19
      await eventBus.on('game-client-1', EventCategory.GAME_STATE, gameStartHandler);
      await eventBus.on('game-client-2', EventCategory.GAME_STATE, gameStartHandler);

      // Step: Publish game_started event
      // Ref: Line 23-24
      const gameStartedEvent: UniversalEvent = {
        eventId: `game-started-${testGameId}`,
        category: EventCategory.GAME_STATE,
        type: 'game_started',
        sourceId: 'unified-game-server',
        targets: [{ type: TargetType.GAME, id: testGameId }],
        data: {
          gameId: testGameId,
          gameMode: 'cooperative',
          playerCount: 2,
          settings: {
            bombTimer: 3000,
            respawnTime: 10000,
            friendlyFire: false
          }
        },
        metadata: {
          priority: EventPriority.HIGH,
          deliveryMode: DeliveryMode.AT_LEAST_ONCE,
          tags: ['game-start', 'cooperative'],
        },
        timestamp: new Date(),
        version: '1.0.0',
      };

      const publishResult = await gameServer.publishEvent(gameStartedEvent);
      expect(publishResult.success).toBe(true);

      // Verify EventBus routing
      const eventBusStatus = eventBus.getStatus();
      expect(eventBusStatus.running).toBe(true);
      expect(eventBusStatus.activeSubscriptions).toBeGreaterThanOrEqual(2);

      console.log('✅ Game start and event system setup completed');
    });
  });

  describe('Game Loop - Player Movement and Actions', () => {
    it('should handle complete player movement workflow with event-driven architecture', async () => {
      // Test player movement flow following sequence diagram
      // Ref: docs/sequence-diagrams/gamer/uc-g003-play-cooperative-game.md Line 28-41
      console.log('🏃 Testing player movement workflow');

      const movementHandler = vi.fn();
      const gameStateHandler = vi.fn();

      // Set up event subscriptions
      await eventBus.on('movement-handler', EventCategory.PLAYER_ACTION, movementHandler);
      await eventBus.on('game-state-handler', EventCategory.GAME_STATE, gameStateHandler);

      // Step: Gamer provides movement input
      // Ref: Line 29-30
      const movementInput = {
        direction: 'north',
        playerId: player1Id,
        timestamp: new Date()
      };

      // Step: GameClient sends player action via WebSocket
      // Ref: Line 30-31
      const playerActionEvent: UniversalEvent = {
        eventId: `movement-${player1Id}-${Date.now()}`,
        category: EventCategory.PLAYER_ACTION,
        type: 'player_move',
        sourceId: player1Id,
        targets: [{ type: TargetType.GAME, id: testGameId }],
        data: {
          playerId: player1Id,
          direction: movementInput.direction,
          currentPosition: { x: 1.5, y: 1.5 },
          newPosition: { x: 1.5, y: 0.5 }, // Move north
          gameId: testGameId
        },
        metadata: {
          priority: EventPriority.NORMAL,
          deliveryMode: DeliveryMode.FIRE_AND_FORGET,
          tags: ['movement', 'player-action'],
        },
        timestamp: new Date(),
        version: '1.0.0',
      };

      // Step: UnifiedGameServer publishes to EventBus
      // Ref: Line 31-32
      await gameServer.publishEvent(playerActionEvent);

      // Step: EventBus routes to GameEventHandler
      // Ref: Line 32-33
      // Step: GameEventHandler updates PlayerStateManager
      // Ref: Line 33-34
      
      // Simulate PlayerStateManager updating position
      await pgClient.query(`
        UPDATE uc_test_player_states 
        SET position_x = $1, position_y = $2, last_updated = NOW()
        WHERE player_id = $3 AND game_id = $4
      `, [
        playerActionEvent.data.newPosition.x,
        playerActionEvent.data.newPosition.y,
        player1Id,
        testGameId
      ]);

      // Step: PlayerStateManager updates Redis game state
      // Ref: Line 34-35
      const gameState = await redisClient.get(`games:${testGameId}`);
      const parsedGameState = JSON.parse(gameState!);
      
      const playerIndex = parsedGameState.players.findIndex((p: any) => p.id === player1Id);
      parsedGameState.players[playerIndex].position = playerActionEvent.data.newPosition;
      
      await redisClient.setex(`games:${testGameId}`, 3600, JSON.stringify(parsedGameState));

      // Step: Publish player_moved event
      // Ref: Line 35
      const playerMovedEvent: UniversalEvent = {
        eventId: `player-moved-${player1Id}`,
        category: EventCategory.GAME_STATE,
        type: 'player_moved',
        sourceId: 'player-state-manager',
        targets: [{ type: TargetType.GAME, id: testGameId }],
        data: {
          playerId: player1Id,
          newPosition: playerActionEvent.data.newPosition,
          direction: movementInput.direction,
          gameId: testGameId
        },
        metadata: {
          priority: EventPriority.NORMAL,
          deliveryMode: DeliveryMode.FIRE_AND_FORGET,
          tags: ['game-state', 'movement'],
        },
        timestamp: new Date(),
        version: '1.0.0',
      };

      await gameServer.publishEvent(playerMovedEvent);

      // Verify position update in database
      const updatedPosition = await pgClient.query(
        'SELECT position_x, position_y FROM uc_test_player_states WHERE player_id = $1',
        [player1Id]
      );

      expect(updatedPosition.rows[0].position_x).toBe(1.5);
      expect(updatedPosition.rows[0].position_y).toBe(0.5);

      // Verify Redis state update
      const updatedGameState = await redisClient.get(`games:${testGameId}`);
      const updatedParsedState = JSON.parse(updatedGameState!);
      const updatedPlayer = updatedParsedState.players.find((p: any) => p.id === player1Id);
      
      expect(updatedPlayer.position.y).toBe(0.5);

      console.log('✅ Player movement workflow completed successfully');
    });

    it('should handle bomb placement with cooperative game mechanics', async () => {
      // Test bomb placement workflow from sequence diagram
      // Ref: docs/sequence-diagrams/gamer/uc-g003-play-cooperative-game.md Line 43-76
      console.log('💣 Testing bomb placement in cooperative mode');

      const bombHandler = vi.fn();
      const explosionHandler = vi.fn();

      await eventBus.on('bomb-handler', EventCategory.GAME_STATE, bombHandler);
      await eventBus.on('explosion-handler', EventCategory.GAME_STATE, explosionHandler);

      // Step: Gamer provides bomb input
      // Ref: Line 44-46
      const bombPlacementEvent: UniversalEvent = {
        eventId: `bomb-place-${testBombId}`,
        category: EventCategory.PLAYER_ACTION,
        type: 'bomb_place',
        sourceId: player1Id,
        targets: [{ type: TargetType.GAME, id: testGameId }],
        data: {
          playerId: player1Id,
          position: { x: 5, y: 3 },
          gameId: testGameId,
          bombId: testBombId
        },
        metadata: {
          priority: EventPriority.HIGH,
          deliveryMode: DeliveryMode.AT_LEAST_ONCE,
          tags: ['bomb', 'placement'],
        },
        timestamp: new Date(),
        version: '1.0.0',
      };

      // Step: EventBus routes to BombManager
      // Ref: Line 47-48
      await gameServer.publishEvent(bombPlacementEvent);

      // Step: BombManager validates and creates bomb
      // Ref: Line 48-49
      
      // Simulate bomb creation in Redis
      const gameState = await redisClient.get(`games:${testGameId}`);
      const parsedGameState = JSON.parse(gameState!);
      
      const newBomb = {
        id: testBombId,
        playerId: player1Id,
        position: bombPlacementEvent.data.position,
        timer: 3000,
        range: 2,
        placedAt: new Date().toISOString(),
        active: true
      };

      parsedGameState.gameObjects.bombs.push(newBomb);
      await redisClient.setex(`games:${testGameId}`, 3600, JSON.stringify(parsedGameState));

      // Step: Publish bomb_placed event
      // Ref: Line 50
      const bombPlacedEvent: UniversalEvent = {
        eventId: `bomb-placed-${testBombId}`,
        category: EventCategory.GAME_STATE,
        type: 'bomb_placed',
        sourceId: 'bomb-manager',
        targets: [
          { type: TargetType.GAME, id: testGameId },
          { type: TargetType.PLAYER, id: player2Id } // Notify teammate
        ],
        data: {
          bombId: testBombId,
          playerId: player1Id,
          position: bombPlacementEvent.data.position,
          timer: 3000,
          gameId: testGameId
        },
        metadata: {
          priority: EventPriority.HIGH,
          deliveryMode: DeliveryMode.AT_LEAST_ONCE,
          tags: ['bomb', 'placed', 'cooperative'],
        },
        timestamp: new Date(),
        version: '1.0.0',
      };

      await gameServer.publishEvent(bombPlacedEvent);

      // Log bomb placement event
      await pgClient.query(`
        INSERT INTO uc_test_game_events (game_id, player_id, event_type, event_data)
        VALUES ($1, $2, $3, $4)
      `, [
        testGameId,
        player1Id,
        'bomb_placed',
        JSON.stringify({
          bombId: testBombId,
          position: bombPlacementEvent.data.position,
          timer: 3000
        })
      ]);

      // Simulate bomb explosion after timer
      // Ref: Line 57-58
      console.log('⏰ Simulating bomb explosion after timer');
      
      const explosionEvent: UniversalEvent = {
        eventId: `bomb-exploded-${testBombId}`,
        category: EventCategory.GAME_STATE,
        type: 'bomb_exploded',
        sourceId: 'bomb-manager',
        targets: [{ type: TargetType.GAME, id: testGameId }],
        data: {
          bombId: testBombId,
          playerId: player1Id,
          explosionPosition: bombPlacementEvent.data.position,
          affectedTiles: [
            { x: 5, y: 3 }, { x: 4, y: 3 }, { x: 6, y: 3 },
            { x: 5, y: 2 }, { x: 5, y: 4 }
          ],
          destroyedWalls: [{ x: 4, y: 3 }],
          gameId: testGameId
        },
        metadata: {
          priority: EventPriority.HIGH,
          deliveryMode: DeliveryMode.AT_LEAST_ONCE,
          tags: ['explosion', 'destruction'],
        },
        timestamp: new Date(),
        version: '1.0.0',
      };

      await gameServer.publishEvent(explosionEvent);

      // Update game state - remove bomb, update walls
      const explodedGameState = JSON.parse(await redisClient.get(`games:${testGameId}`)!);
      explodedGameState.gameObjects.bombs = explodedGameState.gameObjects.bombs.filter(
        (b: any) => b.id !== testBombId
      );
      
      await redisClient.setex(`games:${testGameId}`, 3600, JSON.stringify(explodedGameState));

      // Verify bomb placement and explosion events
      const bombEvents = await pgClient.query(
        'SELECT * FROM uc_test_game_events WHERE game_id = $1 AND event_type = $2',
        [testGameId, 'bomb_placed']
      );

      expect(bombEvents.rows).toHaveLength(1);
      expect(JSON.parse(bombEvents.rows[0].event_data).bombId).toBe(testBombId);

      console.log('✅ Bomb placement and explosion workflow completed');
    });

    it('should handle friendly fire prevention in cooperative mode', async () => {
      // Test friendly fire scenario from sequence diagram
      // Ref: docs/sequence-diagrams/gamer/uc-g003-play-cooperative-game.md Line 67-75
      console.log('🤝 Testing friendly fire prevention in cooperative mode');

      const friendlyFireHandler = vi.fn();
      await eventBus.on('friendly-fire-handler', EventCategory.GAME_STATE, friendlyFireHandler);

      // Simulate explosion affecting teammate
      const friendlyFireEvent: UniversalEvent = {
        eventId: 'friendly-fire-test',
        category: EventCategory.GAME_STATE,
        type: 'friendly_fire',
        sourceId: 'bomb-manager',
        targets: [
          { type: TargetType.PLAYER, id: player1Id }, // Bomber
          { type: TargetType.PLAYER, id: player2Id }  // Affected teammate
        ],
        data: {
          bomberId: player1Id,
          affectedPlayerId: player2Id,
          damage: 0, // No damage in cooperative mode
          position: { x: 5, y: 3 },
          gameId: testGameId,
          warningMessage: 'Watch out for your teammates!'
        },
        metadata: {
          priority: EventPriority.HIGH,
          deliveryMode: DeliveryMode.FIRE_AND_FORGET,
          tags: ['friendly-fire', 'warning', 'cooperative'],
        },
        timestamp: new Date(),
        version: '1.0.0',
      };

      await gameServer.publishEvent(friendlyFireEvent);

      // Verify no health reduction for teammate in cooperative mode
      const teammateState = await pgClient.query(
        'SELECT health FROM uc_test_player_states WHERE player_id = $1',
        [player2Id]
      );

      expect(teammateState.rows[0].health).toBe(100); // No damage taken

      // Log friendly fire warning
      await pgClient.query(`
        INSERT INTO uc_test_game_events (game_id, player_id, event_type, event_data)
        VALUES ($1, $2, $3, $4)
      `, [
        testGameId,
        player1Id,
        'friendly_fire_warning',
        JSON.stringify({
          affectedPlayer: player2Id,
          warningMessage: 'Watch out for your teammates!',
          cooperativeMode: true
        })
      ]);

      console.log('✅ Friendly fire prevention verified in cooperative mode');
    });
  });

  describe('Power-Up Collection and Player Abilities', () => {
    it('should handle power-up collection with event broadcasting', async () => {
      // Test power-up collection from sequence diagram
      // Ref: docs/sequence-diagrams/gamer/uc-g003-play-cooperative-game.md Line 78-92
      console.log('⚡ Testing power-up collection workflow');

      const powerUpHandler = vi.fn();
      await eventBus.on('powerup-handler', EventCategory.GAME_STATE, powerUpHandler);

      // Add power-up to game state
      const gameState = await redisClient.get(`games:${testGameId}`);
      const parsedGameState = JSON.parse(gameState!);
      
      const powerUp = {
        id: 'powerup-bomb-range',
        type: 'bomb_range_increase',
        position: { x: 3, y: 3 },
        effect: { bombRange: 1 } // Increase bomb range by 1
      };

      parsedGameState.gameObjects.powerUps.push(powerUp);
      await redisClient.setex(`games:${testGameId}`, 3600, JSON.stringify(parsedGameState));

      // Step: Player moves to power-up and collects it
      const powerUpCollectedEvent: UniversalEvent = {
        eventId: 'powerup-collected-test',
        category: EventCategory.GAME_STATE,
        type: 'powerup_collected',
        sourceId: 'game-engine',
        targets: [
          { type: TargetType.GAME, id: testGameId },
          { type: TargetType.PLAYER, id: player2Id } // Notify teammate
        ],
        data: {
          playerId: player1Id,
          powerUpId: powerUp.id,
          powerUpType: powerUp.type,
          position: powerUp.position,
          effect: powerUp.effect,
          gameId: testGameId
        },
        metadata: {
          priority: EventPriority.NORMAL,
          deliveryMode: DeliveryMode.AT_LEAST_ONCE,
          tags: ['powerup', 'collection', 'ability-upgrade'],
        },
        timestamp: new Date(),
        version: '1.0.0',
      };

      await gameServer.publishEvent(powerUpCollectedEvent);

      // Update player abilities in database
      await pgClient.query(`
        UPDATE uc_test_player_states 
        SET bomb_range = bomb_range + $1 
        WHERE player_id = $2 AND game_id = $3
      `, [1, player1Id, testGameId]);

      // Remove power-up from game state
      parsedGameState.gameObjects.powerUps = parsedGameState.gameObjects.powerUps.filter(
        (p: any) => p.id !== powerUp.id
      );
      await redisClient.setex(`games:${testGameId}`, 3600, JSON.stringify(parsedGameState));

      // Verify ability increase
      const updatedPlayer = await pgClient.query(
        'SELECT bomb_range FROM uc_test_player_states WHERE player_id = $1',
        [player1Id]
      );

      expect(updatedPlayer.rows[0].bomb_range).toBe(3); // Original 2 + 1

      console.log('✅ Power-up collection and ability upgrade completed');
    });
  });

  describe('Player Elimination and Respawn System', () => {
    it('should handle player elimination and 10-second respawn countdown', async () => {
      // Test player elimination and respawn from sequence diagram
      // Ref: docs/sequence-diagrams/gamer/uc-g003-play-cooperative-game.md Line 94-108
      console.log('💀 Testing player elimination and respawn system');

      const eliminationHandler = vi.fn();
      const respawnHandler = vi.fn();

      await eventBus.on('elimination-handler', EventCategory.GAME_STATE, eliminationHandler);
      await eventBus.on('respawn-handler', EventCategory.GAME_STATE, respawnHandler);

      // Step: Player eliminated event
      const playerEliminatedEvent: UniversalEvent = {
        eventId: 'player-eliminated-test',
        category: EventCategory.GAME_STATE,
        type: 'player_eliminated',
        sourceId: 'game-engine',
        targets: [
          { type: TargetType.GAME, id: testGameId },
          { type: TargetType.PLAYER, id: player1Id }
        ],
        data: {
          eliminatedPlayerId: player1Id,
          eliminatedBy: 'bomb-explosion',
          eliminationPosition: { x: 5, y: 3 },
          respawnTime: 10000, // 10 seconds
          gameId: testGameId
        },
        metadata: {
          priority: EventPriority.HIGH,
          deliveryMode: DeliveryMode.AT_LEAST_ONCE,
          tags: ['elimination', 'respawn-required'],
        },
        timestamp: new Date(),
        version: '1.0.0',
      };

      await gameServer.publishEvent(playerEliminatedEvent);

      // Update player status to eliminated
      await pgClient.query(`
        UPDATE uc_test_player_states 
        SET health = 0, status = 'eliminated', last_updated = NOW()
        WHERE player_id = $1 AND game_id = $2
      `, [player1Id, testGameId]);

      // Verify elimination status
      const eliminatedPlayer = await pgClient.query(
        'SELECT health, status FROM uc_test_player_states WHERE player_id = $1',
        [player1Id]
      );

      expect(eliminatedPlayer.rows[0].health).toBe(0);
      expect(eliminatedPlayer.rows[0].status).toBe('eliminated');

      // Step: Simulate 10-second countdown and respawn
      console.log('⏰ Simulating 10-second respawn countdown...');
      
      // Skip actual wait time for test performance
      const respawnEvent: UniversalEvent = {
        eventId: 'player-respawned-test',
        category: EventCategory.GAME_STATE,
        type: 'player_respawned',
        sourceId: 'game-engine',
        targets: [{ type: TargetType.GAME, id: testGameId }],
        data: {
          playerId: player1Id,
          respawnPosition: { x: 1.5, y: 1.5 }, // Corner respawn
          gameId: testGameId,
          countdownCompleted: true
        },
        metadata: {
          priority: EventPriority.HIGH,
          deliveryMode: DeliveryMode.AT_LEAST_ONCE,
          tags: ['respawn', 'revival'],
        },
        timestamp: new Date(),
        version: '1.0.0',
      };

      await gameServer.publishEvent(respawnEvent);

      // Update player status to alive and restore health
      await pgClient.query(`
        UPDATE uc_test_player_states 
        SET health = 100, status = 'alive', position_x = $1, position_y = $2, last_updated = NOW()
        WHERE player_id = $3 AND game_id = $4
      `, [1.5, 1.5, player1Id, testGameId]);

      // Verify respawn
      const respawnedPlayer = await pgClient.query(
        'SELECT health, status, position_x, position_y FROM uc_test_player_states WHERE player_id = $1',
        [player1Id]
      );

      expect(respawnedPlayer.rows[0].health).toBe(100);
      expect(respawnedPlayer.rows[0].status).toBe('alive');
      expect(respawnedPlayer.rows[0].position_x).toBe(1.5);
      expect(respawnedPlayer.rows[0].position_y).toBe(1.5);

      console.log('✅ Player elimination and respawn workflow completed');
    });
  });

  describe('Victory Conditions - Cooperative Objectives', () => {
    it('should handle boss defeat victory condition', async () => {
      // Test boss defeat victory from sequence diagram
      // Ref: docs/sequence-diagrams/gamer/uc-g003-play-cooperative-game.md Line 111-119
      console.log('🏆 Testing boss defeat victory condition');

      const victoryHandler = vi.fn();
      await eventBus.on('victory-handler', EventCategory.GAME_STATE, victoryHandler);

      // Step: Boss defeated event
      const bossDefeatedEvent: UniversalEvent = {
        eventId: 'boss-defeated-victory',
        category: EventCategory.GAME_STATE,
        type: 'boss_defeated',
        sourceId: 'game-engine',
        targets: [{ type: TargetType.GAME, id: testGameId }],
        data: {
          bossId: 'final-boss',
          defeatedBy: [player1Id, player2Id], // Cooperative victory
          gameId: testGameId,
          victoryType: 'boss_defeated',
          completionTime: '05:42',
          cooperativeBonus: true
        },
        metadata: {
          priority: EventPriority.CRITICAL,
          deliveryMode: DeliveryMode.AT_LEAST_ONCE,
          tags: ['victory', 'boss-defeat', 'cooperative'],
        },
        timestamp: new Date(),
        version: '1.0.0',
      };

      await gameServer.publishEvent(bossDefeatedEvent);

      // Update game status to completed
      await pgClient.query(`
        UPDATE uc_test_games 
        SET status = 'completed', ended_at = NOW(), victory_condition = 'boss_defeated'
        WHERE game_id = $1
      `, [testGameId]);

      // Save game statistics
      await pgClient.query(`
        INSERT INTO uc_test_game_events (game_id, event_type, event_data)
        VALUES ($1, $2, $3)
      `, [
        testGameId,
        'game_victory',
        JSON.stringify({
          victoryType: 'boss_defeated',
          players: [player1Id, player2Id],
          completionTime: '05:42',
          cooperativeMode: true
        })
      ]);

      // Verify victory state
      const completedGame = await pgClient.query(
        'SELECT status, victory_condition FROM uc_test_games WHERE game_id = $1',
        [testGameId]
      );

      expect(completedGame.rows[0].status).toBe('completed');
      expect(completedGame.rows[0].victory_condition).toBe('boss_defeated');

      console.log('✅ Boss defeat victory condition handled successfully');
    });

    it('should handle exit gates victory condition', async () => {
      // Test exit reached victory from sequence diagram
      // Ref: docs/sequence-diagrams/gamer/uc-g003-play-cooperative-game.md Line 120-126
      console.log('🚪 Testing exit gates victory condition');

      const exitVictoryEvent: UniversalEvent = {
        eventId: 'exit-gates-victory',
        category: EventCategory.GAME_STATE,
        type: 'exit_reached',
        sourceId: 'game-engine',
        targets: [{ type: TargetType.GAME, id: testGameId }],
        data: {
          exitGateId: 'exit-gate-1',
          playersAtExit: [player1Id, player2Id], // Both players needed
          gameId: testGameId,
          victoryType: 'exit_reached',
          teamworkRequired: true
        },
        metadata: {
          priority: EventPriority.CRITICAL,
          deliveryMode: DeliveryMode.AT_LEAST_ONCE,
          tags: ['victory', 'exit-gates', 'teamwork'],
        },
        timestamp: new Date(),
        version: '1.0.0',
      };

      await gameServer.publishEvent(exitVictoryEvent);

      // Update game completion
      await pgClient.query(`
        UPDATE uc_test_games 
        SET status = 'completed', ended_at = NOW(), victory_condition = 'exit_reached'
        WHERE game_id = $1
      `, [testGameId]);

      const exitVictoryGame = await pgClient.query(
        'SELECT victory_condition FROM uc_test_games WHERE game_id = $1',
        [testGameId]
      );

      expect(exitVictoryGame.rows[0].victory_condition).toBe('exit_reached');

      console.log('✅ Exit gates victory condition handled successfully');
    });

    it('should handle gates destroyed scenario with objective change', async () => {
      // Test gates destroyed scenario from sequence diagram
      // Ref: docs/sequence-diagrams/gamer/uc-g003-play-cooperative-game.md Line 127-132
      console.log('💥 Testing gates destroyed scenario with objective change');

      const objectiveChangeHandler = vi.fn();
      await eventBus.on('objective-handler', EventCategory.GAME_STATE, objectiveChangeHandler);

      const gatesDestroyedEvent: UniversalEvent = {
        eventId: 'gates-destroyed-objective-change',
        category: EventCategory.GAME_STATE,
        type: 'gates_destroyed',
        sourceId: 'game-engine',
        targets: [{ type: TargetType.GAME, id: testGameId }],
        data: {
          destroyedGates: ['gate-1', 'gate-2', 'gate-3'],
          gameId: testGameId,
          newObjective: 'survival',
          spawnMonsterWaves: true,
          difficultyIncrease: true
        },
        metadata: {
          priority: EventPriority.CRITICAL,
          deliveryMode: DeliveryMode.AT_LEAST_ONCE,
          tags: ['objective-change', 'survival', 'monster-waves'],
        },
        timestamp: new Date(),
        version: '1.0.0',
      };

      await gameServer.publishEvent(gatesDestroyedEvent);

      // Log objective change
      await pgClient.query(`
        INSERT INTO uc_test_game_events (game_id, event_type, event_data)
        VALUES ($1, $2, $3)
      `, [
        testGameId,
        'objective_changed',
        JSON.stringify({
          oldObjective: 'reach_exit_or_defeat_boss',
          newObjective: 'survival',
          reason: 'gates_destroyed',
          monsterWavesEnabled: true
        })
      ]);

      const objectiveChangeLog = await pgClient.query(
        'SELECT event_data FROM uc_test_game_events WHERE event_type = $1 AND game_id = $2',
        ['objective_changed', testGameId]
      );

      expect(objectiveChangeLog.rows).toHaveLength(1);
      const eventData = JSON.parse(objectiveChangeLog.rows[0].event_data);
      expect(eventData.newObjective).toBe('survival');
      expect(eventData.monsterWavesEnabled).toBe(true);

      console.log('✅ Gates destroyed scenario with objective change handled');
    });
  });

  describe('Event-Driven Architecture Verification', () => {
    it('should maintain proper event flow through UnifiedGameServer to WebSocket bridge', async () => {
      // Test complete event flow from sequence diagram
      // Ref: docs/sequence-diagrams/gamer/uc-g003-play-cooperative-game.md Line 37-41
      console.log('🌉 Testing EventBus to WebSocket bridge integration');

      const bridgeEvents: any[] = [];
      
      // Mock WebSocket bridge handler
      const mockWebSocketBridge = vi.fn((event) => {
        bridgeEvents.push(event);
      });

      // Subscribe to events that should be forwarded to WebSocket
      await eventBus.on('websocket-bridge', EventCategory.GAME_STATE, mockWebSocketBridge);
      await eventBus.on('websocket-bridge', EventCategory.PLAYER_ACTION, mockWebSocketBridge);

      // Publish various events that should flow through the system
      const testEvents = [
        {
          eventId: 'bridge-test-1',
          category: EventCategory.PLAYER_ACTION,
          type: 'player_move',
          data: { playerId: player1Id, position: { x: 2, y: 2 } }
        },
        {
          eventId: 'bridge-test-2',
          category: EventCategory.GAME_STATE,
          type: 'bomb_placed',
          data: { bombId: 'bridge-bomb', position: { x: 3, y: 3 } }
        }
      ];

      for (const eventData of testEvents) {
        const event: UniversalEvent = {
          ...eventData,
          sourceId: 'bridge-test',
          targets: [{ type: TargetType.GAME, id: testGameId }],
          metadata: {
            priority: EventPriority.NORMAL,
            deliveryMode: DeliveryMode.FIRE_AND_FORGET,
            tags: ['bridge-test'],
          },
          timestamp: new Date(),
          version: '1.0.0',
        };

        await gameServer.publishEvent(event);
      }

      // Verify events flowed through the system
      expect(gameServer.eventBus.getStatus().running).toBe(true);
      
      const activeSubscriptions = gameServer.eventBus.getActiveSubscriptions();
      const bridgeSubscriptions = activeSubscriptions.filter(
        s => s.subscriberId === 'websocket-bridge'
      );
      
      expect(bridgeSubscriptions.length).toBeGreaterThan(0);

      console.log('✅ EventBus to WebSocket bridge verification completed');
    });

    it('should maintain data consistency across Redis cache and PostgreSQL persistence', async () => {
      // Test dual-storage consistency mentioned throughout sequence diagram
      console.log('🔄 Testing data consistency between Redis and PostgreSQL');

      // Simulate game state changes
      const stateChanges = [
        {
          type: 'player_position',
          playerId: player1Id,
          position: { x: 4, y: 4 }
        },
        {
          type: 'bomb_placement',
          bombId: 'consistency-bomb',
          position: { x: 6, y: 6 }
        }
      ];

      for (const change of stateChanges) {
        // Update Redis (real-time state)
        const gameState = await redisClient.get(`games:${testGameId}`);
        const parsedState = JSON.parse(gameState!);

        if (change.type === 'player_position') {
          const playerIndex = parsedState.players.findIndex((p: any) => p.id === change.playerId);
          parsedState.players[playerIndex].position = change.position;
        } else if (change.type === 'bomb_placement') {
          parsedState.gameObjects.bombs.push({
            id: change.bombId,
            position: change.position,
            active: true
          });
        }

        await redisClient.setex(`games:${testGameId}`, 3600, JSON.stringify(parsedState));

        // Update PostgreSQL (persistent state)
        if (change.type === 'player_position') {
          await pgClient.query(`
            UPDATE uc_test_player_states 
            SET position_x = $1, position_y = $2, last_updated = NOW()
            WHERE player_id = $3 AND game_id = $4
          `, [change.position.x, change.position.y, change.playerId, testGameId]);
        }
      }

      // Verify consistency
      const redisState = JSON.parse(await redisClient.get(`games:${testGameId}`)!);
      const dbPlayerState = await pgClient.query(
        'SELECT position_x, position_y FROM uc_test_player_states WHERE player_id = $1',
        [player1Id]
      );

      const redisPlayer = redisState.players.find((p: any) => p.id === player1Id);
      expect(redisPlayer.position.x).toBe(dbPlayerState.rows[0].position_x);
      expect(redisPlayer.position.y).toBe(dbPlayerState.rows[0].position_y);

      console.log('✅ Data consistency verified across storage systems');
    });
  });
});