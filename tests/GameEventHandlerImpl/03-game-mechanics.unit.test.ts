/**
 * GameEventHandlerImpl Unit Tests - Game Mechanics
 * Tests game mechanics event publishing functionality
 * 
 * Documentation References:
 * - src/interfaces/specialized/GameEventHandler.d.ts:151-173 (Game Mechanics Events)
 * - src/interfaces/specialized/GameEventHandler.d.ts:75-119 (Mechanics event data interfaces)
 * - src/interfaces/specialized/GameEventHandler.d.ts:23-29 (Game mechanics event types)
 * - src/types/common.d.ts:9-14 (Position interface)
 */

import { GameEventHandlerImpl } from '../../src/modules/GameEventHandlerImpl';
import { EventBusImpl } from '../../src/modules/EventBusImpl';
import type { 
  GameEventHandler, 
  BombExplodeEventData, 
  PlayerEliminatedEventData, 
  GameStateUpdateEventData 
} from '../../src/interfaces/specialized/GameEventHandler';
import type { EventBus, EventBusConfig, EventPublishResult } from '../../src/interfaces/core/EventBus';

describe('GameEventHandlerImpl - Game Mechanics', () => {
  let eventBus: EventBus;
  let gameEventHandler: GameEventHandler;
  let mockConfig: EventBusConfig;

  beforeEach(async () => {
    eventBus = new EventBusImpl();
    mockConfig = {
      defaultTTL: 300000,
      maxEventSize: 64 * 1024,
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
          maxMemoryBytes: 512 * 1024 * 1024,
        },
      },
    };

    await eventBus.initialize(mockConfig);
    gameEventHandler = new GameEventHandlerImpl(eventBus);
  });

  afterEach(async () => {
    if (eventBus) {
      await eventBus.shutdown();
    }
  });

  describe('publishBombExplode()', () => {
    /**
     * Tests GameEventHandler.d.ts:153-158 - publishBombExplode method
     * Tests BombExplodeEventData interface from GameEventHandler.d.ts:75-85
     */
    it('should publish bomb explosion event with complete data', async () => {
      const explosionData: BombExplodeEventData = {
        bombId: 'bomb-123',
        gameId: 'game-456',
        ownerId: 'player-789',
        position: { x: 5, y: 5 },
        affectedTiles: [
          { x: 4, y: 5 },
          { x: 5, y: 5 },
          { x: 6, y: 5 },
          { x: 5, y: 4 },
          { x: 5, y: 6 },
        ],
        destroyedWalls: [
          { x: 4, y: 5 },
          { x: 6, y: 5 },
        ],
        damagedEntities: ['player-111', 'monster-222'],
        chainReaction: ['bomb-333', 'bomb-444'],
        timestamp: Date.now(),
      };

      const result: EventPublishResult = await gameEventHandler.publishBombExplode(explosionData);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(typeof result.eventId).toBe('string');
    });

    /**
     * Tests chain reaction handling
     * BombExplodeEventData.chainReaction from GameEventHandler.d.ts:83
     */
    it('should handle chain reactions with multiple bombs', async () => {
      const chainBombs = ['bomb-1', 'bomb-2', 'bomb-3', 'bomb-4', 'bomb-5'];
      
      const explosionData: BombExplodeEventData = {
        bombId: 'bomb-trigger',
        gameId: 'game-456',
        ownerId: 'player-789',
        position: { x: 7, y: 7 },
        affectedTiles: [{ x: 7, y: 7 }],
        destroyedWalls: [],
        damagedEntities: [],
        chainReaction: chainBombs,
        timestamp: Date.now(),
      };

      const result = await gameEventHandler.publishBombExplode(explosionData);
      expect(result.success).toBe(true);
    });

    /**
     * Tests explosion without chain reaction
     * BombExplodeEventData.chainReaction is optional (GameEventHandler.d.ts:83)
     */
    it('should handle explosions without chain reactions', async () => {
      const explosionData: BombExplodeEventData = {
        bombId: 'bomb-simple',
        gameId: 'game-456',
        ownerId: 'player-789',
        position: { x: 3, y: 3 },
        affectedTiles: [
          { x: 2, y: 3 },
          { x: 3, y: 3 },
          { x: 4, y: 3 },
        ],
        destroyedWalls: [{ x: 2, y: 3 }],
        damagedEntities: ['player-555'],
        timestamp: Date.now(),
      };

      const result = await gameEventHandler.publishBombExplode(explosionData);
      expect(result.success).toBe(true);
    });

    /**
     * Tests large explosion patterns
     * BombExplodeEventData.affectedTiles from GameEventHandler.d.ts:80
     */
    it('should handle large blast radius explosions', async () => {
      // Generate a large cross-pattern explosion (radius 5)
      const center = { x: 10, y: 10 };
      const affectedTiles = [];
      const radius = 5;
      
      for (let i = -radius; i <= radius; i++) {
        affectedTiles.push({ x: center.x + i, y: center.y });
        affectedTiles.push({ x: center.x, y: center.y + i });
      }

      const explosionData: BombExplodeEventData = {
        bombId: 'bomb-large',
        gameId: 'game-456',
        ownerId: 'player-789',
        position: center,
        affectedTiles,
        destroyedWalls: affectedTiles.slice(0, 3), // Some walls destroyed
        damagedEntities: ['player-111', 'player-222', 'monster-333'],
        timestamp: Date.now(),
      };

      const result = await gameEventHandler.publishBombExplode(explosionData);
      expect(result.success).toBe(true);
    });
  });

  describe('publishPlayerEliminated()', () => {
    /**
     * Tests GameEventHandler.d.ts:159-165 - publishPlayerEliminated method
     * Tests PlayerEliminatedEventData interface from GameEventHandler.d.ts:97-106
     */
    it('should publish player elimination event with all data', async () => {
      const eliminationData: PlayerEliminatedEventData = {
        playerId: 'player-123',
        gameId: 'game-456',
        cause: 'bomb_explosion',
        killerEntityId: 'player-789',
        deathPosition: { x: 8, y: 4 },
        respawnTimer: 10000, // 10 seconds
        lostPowerUps: ['blast_radius', 'bomb_count', 'speed'],
        timestamp: Date.now(),
      };

      const result: EventPublishResult = await gameEventHandler.publishPlayerEliminated(eliminationData);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(typeof result.eventId).toBe('string');
    });

    /**
     * Tests different elimination causes
     * PlayerEliminatedEventData.cause from GameEventHandler.d.ts:100
     */
    it('should handle different elimination causes', async () => {
      const causes = ['bomb_explosion', 'monster_attack', 'friendly_fire', 'environmental', 'timeout'];
      
      for (const cause of causes) {
        const eliminationData: PlayerEliminatedEventData = {
          playerId: `player-${cause}`,
          gameId: 'game-456',
          cause,
          deathPosition: { x: 5, y: 5 },
          respawnTimer: 10000,
          timestamp: Date.now(),
        };

        const result = await gameEventHandler.publishPlayerEliminated(eliminationData);
        expect(result.success).toBe(true);
      }
    });

    /**
     * Tests elimination without killer (environmental deaths)
     * PlayerEliminatedEventData.killerEntityId is optional (GameEventHandler.d.ts:101)
     */
    it('should handle eliminations without specific killer', async () => {
      const eliminationData: PlayerEliminatedEventData = {
        playerId: 'player-environmental',
        gameId: 'game-456',
        cause: 'fell_off_map',
        deathPosition: { x: 0, y: 0 },
        respawnTimer: 15000,
        timestamp: Date.now(),
      };

      const result = await gameEventHandler.publishPlayerEliminated(eliminationData);
      expect(result.success).toBe(true);
    });

    /**
     * Tests power-up loss tracking
     * PlayerEliminatedEventData.lostPowerUps from GameEventHandler.d.ts:104
     */
    it('should handle power-up loss on elimination', async () => {
      const powerUpSets = [
        [],
        ['speed'],
        ['blast_radius', 'bomb_count'],
        ['speed', 'blast_radius', 'bomb_count', 'kick_bombs', 'pierce_walls'],
      ];

      for (let i = 0; i < powerUpSets.length; i++) {
        const eliminationData: PlayerEliminatedEventData = {
          playerId: `player-powerups-${i}`,
          gameId: 'game-456',
          cause: 'bomb_explosion',
          deathPosition: { x: 3, y: 3 },
          respawnTimer: 10000,
          lostPowerUps: powerUpSets[i],
          timestamp: Date.now(),
        };

        const result = await gameEventHandler.publishPlayerEliminated(eliminationData);
        expect(result.success).toBe(true);
      }
    });
  });

  describe('publishGameStateUpdate()', () => {
    /**
     * Tests GameEventHandler.d.ts:166-172 - publishGameStateUpdate method
     * Tests GameStateUpdateEventData interface from GameEventHandler.d.ts:108-119
     */
    it('should publish full game state update', async () => {
      const gameStateData: GameStateUpdateEventData = {
        gameId: 'game-456',
        deltaUpdate: false, // Full update
        players: [
          {
            id: 'player-1',
            position: { x: 1, y: 1 },
            health: 100,
            powerUps: ['speed'],
            alive: true,
          },
          {
            id: 'player-2',
            position: { x: 13, y: 9 },
            health: 100,
            powerUps: ['blast_radius'],
            alive: true,
          },
        ],
        bombs: [
          {
            id: 'bomb-1',
            position: { x: 5, y: 5 },
            ownerId: 'player-1',
            timer: 2000,
            blastRadius: 3,
          },
        ],
        powerUps: [
          {
            id: 'powerup-1',
            type: 'bomb_count',
            position: { x: 7, y: 3 },
          },
        ],
        monsters: [
          {
            id: 'monster-1',
            type: 'balloom',
            position: { x: 10, y: 6 },
            health: 1,
          },
        ],
        mazeChanges: [
          {
            position: { x: 4, y: 4 },
            oldType: 'destructible_wall',
            newType: 'empty',
          },
        ],
        objectives: [
          {
            type: 'find_exit',
            progress: 0.3,
            completed: false,
          },
        ],
        frameNumber: 1234,
        timestamp: Date.now(),
      };

      const result: EventPublishResult = await gameEventHandler.publishGameStateUpdate(gameStateData);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(typeof result.eventId).toBe('string');
    });

    /**
     * Tests delta updates vs full updates
     * GameStateUpdateEventData.deltaUpdate from GameEventHandler.d.ts:110
     */
    it('should handle delta updates', async () => {
      const deltaData: GameStateUpdateEventData = {
        gameId: 'game-456',
        deltaUpdate: true, // Delta update
        players: [
          {
            id: 'player-1',
            position: { x: 2, y: 1 }, // Only position changed
          },
        ],
        bombs: [], // No bomb changes
        powerUps: [], // No powerup changes
        monsters: [], // No monster changes
        mazeChanges: [
          {
            position: { x: 6, y: 6 },
            newType: 'empty', // Wall was destroyed
          },
        ],
        objectives: [],
        frameNumber: 1235,
        timestamp: Date.now(),
      };

      const result = await gameEventHandler.publishGameStateUpdate(deltaData);
      expect(result.success).toBe(true);
    });

    /**
     * Tests frame number sequencing
     * GameStateUpdateEventData.frameNumber from GameEventHandler.d.ts:117
     */
    it('should handle frame number sequences', async () => {
      const frameNumbers = [1, 60, 3600, 216000]; // Various frame counts
      
      for (const frameNumber of frameNumbers) {
        const stateData: GameStateUpdateEventData = {
          gameId: 'game-456',
          deltaUpdate: false,
          players: [],
          bombs: [],
          powerUps: [],
          monsters: [],
          mazeChanges: [],
          objectives: [],
          frameNumber,
          timestamp: Date.now(),
        };

        const result = await gameEventHandler.publishGameStateUpdate(stateData);
        expect(result.success).toBe(true);
      }
    });
  });

  describe('Error Handling', () => {
    /**
     * Tests validation of required fields across all mechanics events
     * Ensures all interface requirements are met
     */
    it('should validate required fields in mechanics events', async () => {
      const incompleteExplosionData = {
        bombId: 'bomb-123',
        // Missing required gameId, ownerId, position, etc.
      };

      await expect(
        gameEventHandler.publishBombExplode(incompleteExplosionData as any)
      ).rejects.toBeDefined();

      const incompleteEliminationData = {
        playerId: 'player-123',
        // Missing required gameId, cause, deathPosition, etc.
      };

      await expect(
        gameEventHandler.publishPlayerEliminated(incompleteEliminationData as any)
      ).rejects.toBeDefined();

      const incompleteStateData = {
        gameId: 'game-456',
        // Missing required fields
      };

      await expect(
        gameEventHandler.publishGameStateUpdate(incompleteStateData as any)
      ).rejects.toBeDefined();
    });
  });
});