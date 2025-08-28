/**
 * PlayerStateManager Unit Tests - Player Movement
 * Tests player position updates, movement tracking, and state synchronization
 * 
 * References:
 * - src/modules/PlayerStateManager/index.ts:105-119 - updatePlayerPosition method
 * - src/modules/PlayerStateManager/index.ts:200-211 - getPlayerState method
 * - Movement validation and direction tracking
 */

import { createEventBusImpl } from '../../src/modules/EventBusImpl';
import { createPlayerStateManager } from '../../src/modules/PlayerStateManager';
import type { EventBus } from '../../src/interfaces/core/EventBus';

describe('PlayerStateManager - Player Movement', () => {
  let eventBus: EventBus;
  let playerStateManager: any;

  const spawnInfo = {
    position: { x: 1.5, y: 1.5 },
    corner: 'top-left' as const,
    safeArea: [{ x: 1, y: 1 }, { x: 2, y: 1 }],
  };

  beforeEach(async () => {
    eventBus = createEventBusImpl();
    await eventBus.initialize({
      defaultTTL: 300000,
      maxEventSize: 64 * 1024,
      enablePersistence: false,
      enableTracing: false,
      defaultRetry: {
        maxAttempts: 3,
        baseDelayMs: 1000,
        backoffMultiplier: 2,
        maxDelayMs: 10000,
      },
      monitoring: {
        enableMetrics: false,
        metricsIntervalMs: 30000,
        enableSampling: false,
        samplingRate: 0.1,
        alertThresholds: {
          maxLatencyMs: 1000,
          maxErrorRate: 10,
          maxQueueDepth: 1000,
          maxMemoryBytes: 512 * 1024 * 1024,
        },
      },
    });

    playerStateManager = createPlayerStateManager(eventBus);
    await playerStateManager.initialize();

    // Add a test player
    await playerStateManager.addPlayer('player-1', 'game-1', spawnInfo);
  });

  afterEach(async () => {
    if (eventBus) {
      await eventBus.shutdown();
    }
  });

  describe('updatePlayerPosition()', () => {
    it('should update player position successfully', async () => {
      const newPosition = { x: 2.5, y: 3.5 };
      const timestamp = new Date();

      const result = await playerStateManager.updatePlayerPosition({
        playerId: 'player-1',
        position: newPosition,
        direction: 'right' as const,
        timestamp,
      });

      expect(result).toBe(true);

      const playerState = await playerStateManager.getPlayerState('player-1');
      expect(playerState.position).toEqual(newPosition);
      expect(playerState.direction).toBe('right');
      expect(playerState.lastMovement).toEqual(timestamp);
      expect(playerState.previousPosition).toEqual(spawnInfo.position);
    });

    it('should track previous position correctly', async () => {
      const firstPosition = { x: 2, y: 2 };
      const secondPosition = { x: 3, y: 3 };

      // First movement
      await playerStateManager.updatePlayerPosition({
        playerId: 'player-1',
        position: firstPosition,
        direction: 'down' as const,
        timestamp: new Date(),
      });

      let playerState = await playerStateManager.getPlayerState('player-1');
      expect(playerState.position).toEqual(firstPosition);
      expect(playerState.previousPosition).toEqual(spawnInfo.position);

      // Second movement
      await playerStateManager.updatePlayerPosition({
        playerId: 'player-1',
        position: secondPosition,
        direction: 'right' as const,
        timestamp: new Date(),
      });

      playerState = await playerStateManager.getPlayerState('player-1');
      expect(playerState.position).toEqual(secondPosition);
      expect(playerState.previousPosition).toEqual(firstPosition);
    });

    it('should update all movement-related fields', async () => {
      const movementUpdate = {
        playerId: 'player-1',
        position: { x: 5, y: 5 },
        direction: 'up' as const,
        timestamp: new Date(),
      };

      const beforeUpdate = Date.now();
      await playerStateManager.updatePlayerPosition(movementUpdate);
      const afterUpdate = Date.now();

      const playerState = await playerStateManager.getPlayerState('player-1');
      
      expect(playerState.position).toEqual(movementUpdate.position);
      expect(playerState.direction).toBe(movementUpdate.direction);
      expect(playerState.lastMovement).toEqual(movementUpdate.timestamp);
      
      // lastUpdate should be updated to current time
      expect(playerState.lastUpdate.getTime()).toBeGreaterThanOrEqual(beforeUpdate);
      expect(playerState.lastUpdate.getTime()).toBeLessThanOrEqual(afterUpdate);
    });

    it('should handle all movement directions', async () => {
      const directions = ['up', 'down', 'left', 'right', 'idle'] as const;
      
      for (const direction of directions) {
        const result = await playerStateManager.updatePlayerPosition({
          playerId: 'player-1',
          position: { x: Math.random() * 10, y: Math.random() * 10 },
          direction,
          timestamp: new Date(),
        });

        expect(result).toBe(true);
        
        const playerState = await playerStateManager.getPlayerState('player-1');
        expect(playerState.direction).toBe(direction);
      }
    });

    it('should allow rapid position updates', async () => {
      const positions = [
        { x: 1, y: 1 }, { x: 1.1, y: 1 }, { x: 1.2, y: 1 }, 
        { x: 1.3, y: 1 }, { x: 1.4, y: 1 }, { x: 1.5, y: 1 }
      ];

      for (let i = 0; i < positions.length; i++) {
        const result = await playerStateManager.updatePlayerPosition({
          playerId: 'player-1',
          position: positions[i],
          direction: 'right' as const,
          timestamp: new Date(Date.now() + i * 16), // 60 FPS updates
        });

        expect(result).toBe(true);
      }

      const finalState = await playerStateManager.getPlayerState('player-1');
      expect(finalState.position).toEqual(positions[positions.length - 1]);
    });

    it('should handle floating point positions accurately', async () => {
      const precisePositions = [
        { x: 1.123456789, y: 2.987654321 },
        { x: 0.000001, y: 0.000001 },
        { x: 99.999999, y: 99.999999 },
        { x: Math.PI, y: Math.E },
      ];

      for (const position of precisePositions) {
        const result = await playerStateManager.updatePlayerPosition({
          playerId: 'player-1',
          position,
          direction: 'idle' as const,
          timestamp: new Date(),
        });

        expect(result).toBe(true);
        
        const playerState = await playerStateManager.getPlayerState('player-1');
        expect(playerState.position.x).toBeCloseTo(position.x);
        expect(playerState.position.y).toBeCloseTo(position.y);
      }
    });

    it('should reject movement updates for dead players', async () => {
      // Kill the player first
      await playerStateManager.eliminatePlayer('player-1');

      const result = await playerStateManager.updatePlayerPosition({
        playerId: 'player-1',
        position: { x: 10, y: 10 },
        direction: 'up' as const,
        timestamp: new Date(),
      });

      expect(result).toBe(false);

      const playerState = await playerStateManager.getPlayerState('player-1');
      expect(playerState.status).toBe('dead');
      // Position should not have changed
      expect(playerState.position).not.toEqual({ x: 10, y: 10 });
    });

    it('should reject movement updates for non-existent players', async () => {
      const result = await playerStateManager.updatePlayerPosition({
        playerId: 'non-existent-player',
        position: { x: 5, y: 5 },
        direction: 'down' as const,
        timestamp: new Date(),
      });

      expect(result).toBe(false);
    });

    it('should handle timestamp ordering', async () => {
      const timestamps = [
        new Date('2024-01-01T10:00:00Z'),
        new Date('2024-01-01T10:00:01Z'),
        new Date('2024-01-01T10:00:02Z'),
      ];

      for (let i = 0; i < timestamps.length; i++) {
        await playerStateManager.updatePlayerPosition({
          playerId: 'player-1',
          position: { x: i, y: i },
          direction: 'right' as const,
          timestamp: timestamps[i],
        });

        const playerState = await playerStateManager.getPlayerState('player-1');
        expect(playerState.lastMovement).toEqual(timestamps[i]);
      }
    });

    it('should handle out-of-order timestamps', async () => {
      const laterTime = new Date('2024-01-01T10:00:02Z');
      const earlierTime = new Date('2024-01-01T10:00:01Z');

      // Send later timestamp first
      await playerStateManager.updatePlayerPosition({
        playerId: 'player-1',
        position: { x: 2, y: 2 },
        direction: 'right' as const,
        timestamp: laterTime,
      });

      // Send earlier timestamp second
      const result = await playerStateManager.updatePlayerPosition({
        playerId: 'player-1',
        position: { x: 1, y: 1 },
        direction: 'left' as const,
        timestamp: earlierTime,
      });

      // Should still accept the update
      expect(result).toBe(true);

      const playerState = await playerStateManager.getPlayerState('player-1');
      expect(playerState.position).toEqual({ x: 1, y: 1 });
      expect(playerState.lastMovement).toEqual(earlierTime);
    });

    it('should handle multiple players moving simultaneously', async () => {
      // Add another player
      await playerStateManager.addPlayer('player-2', 'game-1', {
        position: { x: 5, y: 5 },
        corner: 'top-right' as const,
        safeArea: [],
      });

      const timestamp = new Date();
      
      // Both players move at the same time
      const results = await Promise.all([
        playerStateManager.updatePlayerPosition({
          playerId: 'player-1',
          position: { x: 2, y: 2 },
          direction: 'down' as const,
          timestamp,
        }),
        playerStateManager.updatePlayerPosition({
          playerId: 'player-2',
          position: { x: 6, y: 6 },
          direction: 'up' as const,
          timestamp,
        }),
      ]);

      expect(results).toEqual([true, true]);

      const player1State = await playerStateManager.getPlayerState('player-1');
      const player2State = await playerStateManager.getPlayerState('player-2');

      expect(player1State.position).toEqual({ x: 2, y: 2 });
      expect(player1State.direction).toBe('down');
      expect(player2State.position).toEqual({ x: 6, y: 6 });
      expect(player2State.direction).toBe('up');
    });
  });

  describe('Position Validation', () => {
    it('should handle extreme position values', async () => {
      const extremePositions = [
        { x: -1000000, y: -1000000 },
        { x: 1000000, y: 1000000 },
        { x: 0, y: 0 },
        { x: -0, y: -0 },
      ];

      for (const position of extremePositions) {
        const result = await playerStateManager.updatePlayerPosition({
          playerId: 'player-1',
          position,
          direction: 'idle' as const,
          timestamp: new Date(),
        });

        expect(result).toBe(true);
        
        const playerState = await playerStateManager.getPlayerState('player-1');
        expect(playerState.position).toEqual(position);
      }
    });

    it('should handle invalid position values gracefully', async () => {
      const invalidPositions = [
        { x: NaN, y: NaN },
        { x: Infinity, y: -Infinity },
        { x: null as any, y: null as any },
        { x: undefined as any, y: undefined as any },
      ];

      for (const position of invalidPositions) {
        const result = await playerStateManager.updatePlayerPosition({
          playerId: 'player-1',
          position,
          direction: 'idle' as const,
          timestamp: new Date(),
        });

        // Should still accept the update (implementation dependent)
        expect(typeof result).toBe('boolean');
      }
    });
  });
});