/**
 * EventBusImpl Unit Tests - Event Publishing
 * Tests event publishing functionality
 */

import { EventBusImpl } from '../../src/modules/EventBusImpl';
import type { EventBusConfig, EventPublishResult } from '../../src/interfaces/core/EventBus';
import { EventCategory, EventPriority, DeliveryMode, TargetType } from '../../src/types/events';
import type { UniversalEvent } from '../../src/types/events';

describe('EventBusImpl - Event Publishing', () => {
  let eventBus: EventBusImpl;
  let mockConfig: EventBusConfig;
  let sampleEvent: UniversalEvent;

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

    sampleEvent = {
      eventId: 'test-event-1',
      category: EventCategory.PLAYER_ACTION,
      type: 'player_move',
      sourceId: 'player-123',
      targets: [
        {
          type: TargetType.GAME,
          id: 'game-456',
        },
      ],
      data: {
        position: { x: 5, y: 3 },
        direction: 'up',
      },
      metadata: {
        priority: EventPriority.NORMAL,
        deliveryMode: DeliveryMode.FIRE_AND_FORGET,
        tags: ['movement', 'player'],
      },
      timestamp: new Date(),
      version: '1.0.0',
    };

    await eventBus.initialize(mockConfig);
  });

  afterEach(async () => {
    if (eventBus) {
      await eventBus.shutdown();
    }
  });

  describe('publish()', () => {
    it('should publish event successfully', async () => {
      const result: EventPublishResult = await eventBus.publish(sampleEvent);
      
      expect(result).toBeDefined();
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('eventId');
      expect(result).toHaveProperty('targetsReached');
      expect(result).toHaveProperty('metadata');
      
      expect(result.success).toBe(true);
      expect(result.eventId).toBe(sampleEvent.eventId);
      expect(typeof result.targetsReached).toBe('number');
    });

    it('should handle different event categories', async () => {
      const categories = [
        EventCategory.GAME_STATE,
        EventCategory.USER_NOTIFICATION,
        EventCategory.ADMIN_ACTION,
        EventCategory.SYSTEM_STATUS,
      ];

      for (const category of categories) {
        const event = { ...sampleEvent, category, eventId: `test-${category}` };
        const result = await eventBus.publish(event);
        
        expect(result.success).toBe(true);
        expect(result.eventId).toBe(event.eventId);
      }
    });

    it('should handle different priority levels', async () => {
      const priorities = [
        EventPriority.LOW,
        EventPriority.NORMAL,
        EventPriority.HIGH,
        EventPriority.CRITICAL,
        EventPriority.IMMEDIATE,
      ];

      for (let i = 0; i < priorities.length; i++) {
        const priority = priorities[i];
        const event = {
          ...sampleEvent,
          eventId: `test-priority-${i}`,
          metadata: {
            ...sampleEvent.metadata,
            priority,
          },
        };
        
        const result = await eventBus.publish(event);
        expect(result.success).toBe(true);
      }
    });

    it('should handle events with different delivery modes', async () => {
      const deliveryModes = [
        DeliveryMode.FIRE_AND_FORGET,
        DeliveryMode.AT_LEAST_ONCE,
        DeliveryMode.EXACTLY_ONCE,
        DeliveryMode.ORDERED,
      ];

      for (let i = 0; i < deliveryModes.length; i++) {
        const deliveryMode = deliveryModes[i];
        const event = {
          ...sampleEvent,
          eventId: `test-delivery-${i}`,
          metadata: {
            ...sampleEvent.metadata,
            deliveryMode,
          },
        };
        
        const result = await eventBus.publish(event);
        expect(result.success).toBe(true);
      }
    });

    it('should reject publishing when bus is not running', async () => {
      await eventBus.shutdown();
      
      await expect(eventBus.publish(sampleEvent)).rejects.toThrow();
    });
  });

  describe('emit() convenience method', () => {
    it('should emit event with simplified parameters', async () => {
      const result = await eventBus.emit(
        EventCategory.PLAYER_ACTION,
        'player_attack',
        { damage: 10, target: 'enemy-1' },
        [{ type: TargetType.GAME, id: 'game-123' }]
      );
      
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(typeof result.eventId).toBe('string');
      expect(result.targetsReached).toBeGreaterThanOrEqual(0);
    });

    it('should emit event with optional parameters', async () => {
      const result = await eventBus.emit(
        EventCategory.USER_NOTIFICATION,
        'achievement_unlocked',
        { achievement: 'first-kill' },
        [{ type: TargetType.PLAYER, id: 'player-456' }],
        {
          metadata: {
            priority: EventPriority.HIGH,
            deliveryMode: DeliveryMode.AT_LEAST_ONCE,
            tags: ['achievement', 'notification'],
          },
        }
      );
      
      expect(result.success).toBe(true);
    });
  });

  describe('Event Validation', () => {
    it('should handle events with missing optional fields', async () => {
      const minimalEvent = {
        eventId: 'minimal-test',
        category: EventCategory.SYSTEM_STATUS,
        type: 'health_check',
        sourceId: 'system',
        targets: [{ type: TargetType.BROADCAST, id: '*' }],
        data: {},
        metadata: {
          priority: EventPriority.NORMAL,
          deliveryMode: DeliveryMode.FIRE_AND_FORGET,
          tags: [],
        },
        timestamp: new Date(),
        version: '1.0.0',
      };

      const result = await eventBus.publish(minimalEvent);
      expect(result.success).toBe(true);
    });

    it('should handle events with complex data payloads', async () => {
      const complexEvent = {
        ...sampleEvent,
        eventId: 'complex-data-test',
        data: {
          gameState: {
            players: [
              { id: 'player-1', position: { x: 1, y: 1 }, health: 100 },
              { id: 'player-2', position: { x: 5, y: 5 }, health: 75 },
            ],
            bombs: [
              { id: 'bomb-1', position: { x: 3, y: 3 }, timer: 3000 },
            ],
            powerUps: [],
          },
          metadata: {
            gameMode: 'cooperative',
            difficulty: 'normal',
          },
        },
      };

      const result = await eventBus.publish(complexEvent);
      expect(result.success).toBe(true);
    });
  });
});