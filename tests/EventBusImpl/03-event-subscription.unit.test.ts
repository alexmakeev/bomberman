/**
 * EventBusImpl Unit Tests - Event Subscription
 * Tests event subscription and handler management
 */

import { EventBusImpl } from '../../src/modules/EventBusImpl';
import type { EventBusConfig, SubscriptionResult } from '../../src/interfaces/core/EventBus';
import type { EventSubscription, EventHandler, UniversalEvent } from '../../src/types/events.d.ts';
import { EventCategory, EventPriority, DeliveryMode, TargetType, FilterOperator } from '../../src/types/events.d.ts';

describe('EventBusImpl - Event Subscription', () => {
  let eventBus: EventBusImpl;
  let mockConfig: EventBusConfig;
  let handlerCallCount: number;
  let lastReceivedEvent: UniversalEvent | null;
  let mockHandler: EventHandler;

  beforeEach(async () => {
    eventBus = new EventBusImpl();
    handlerCallCount = 0;
    lastReceivedEvent = null;
    
    mockHandler = vi.fn((event: UniversalEvent) => {
      handlerCallCount++;
      lastReceivedEvent = event;
    });

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
  });

  afterEach(async () => {
    if (eventBus) {
      await eventBus.shutdown();
    }
  });

  describe('subscribe()', () => {
    it('should create subscription successfully', async () => {
      const subscription = {
        subscriberId: 'subscriber-1',
        name: 'Test Subscription',
        categories: [EventCategory.PLAYER_ACTION],
        eventTypes: ['player_move'],
        filters: [],
        targets: [{ type: TargetType.GAME, id: 'game-123' }],
        options: {
          bufferDuringDisconnect: false,
          maxBufferSize: 100,
          batchEvents: false,
          maxBatchSize: 10,
          batchTimeoutMs: 1000,
          enableDeduplication: false,
          includeHistory: false,
        },
      };

      const result: SubscriptionResult = await eventBus.subscribe(subscription, mockHandler);
      
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.subscriptionId).toBeDefined();
      expect(typeof result.subscriptionId).toBe('string');
      expect(result.subscription).toBeDefined();
      
      const status = eventBus.getStatus();
      expect(status.activeSubscriptions).toBe(1);
    });

    it('should handle multiple subscriptions', async () => {
      const subscriptions = [
        {
          subscriberId: 'subscriber-1',
          name: 'Player Actions',
          categories: [EventCategory.PLAYER_ACTION],
          eventTypes: [],
          filters: [],
          targets: [],
          options: {
            bufferDuringDisconnect: false,
            maxBufferSize: 100,
            batchEvents: false,
            maxBatchSize: 10,
            batchTimeoutMs: 1000,
            enableDeduplication: false,
            includeHistory: false,
          },
        },
        {
          subscriberId: 'subscriber-2',
          name: 'Game State',
          categories: [EventCategory.GAME_STATE],
          eventTypes: [],
          filters: [],
          targets: [],
          options: {
            bufferDuringDisconnect: false,
            maxBufferSize: 100,
            batchEvents: false,
            maxBatchSize: 10,
            batchTimeoutMs: 1000,
            enableDeduplication: false,
            includeHistory: false,
          },
        },
      ];

      for (const subscription of subscriptions) {
        const result = await eventBus.subscribe(subscription, mockHandler);
        expect(result.success).toBe(true);
      }

      const status = eventBus.getStatus();
      expect(status.activeSubscriptions).toBe(2);
    });

    it('should subscribe to multiple event categories', async () => {
      const subscription = {
        subscriberId: 'multi-subscriber',
        name: 'Multi-Category Subscription',
        categories: [EventCategory.PLAYER_ACTION, EventCategory.GAME_STATE, EventCategory.USER_NOTIFICATION],
        eventTypes: [],
        filters: [],
        targets: [],
        options: {
          bufferDuringDisconnect: false,
          maxBufferSize: 100,
          batchEvents: false,
          maxBatchSize: 10,
          batchTimeoutMs: 1000,
          enableDeduplication: false,
          includeHistory: false,
        },
      };

      const result = await eventBus.subscribe(subscription, mockHandler);
      expect(result.success).toBe(true);
    });

    it('should reject subscription when bus is not running', async () => {
      await eventBus.shutdown();

      const subscription = {
        subscriberId: 'test-subscriber',
        name: 'Test',
        categories: [EventCategory.PLAYER_ACTION],
        eventTypes: [],
        filters: [],
        targets: [],
        options: {
          bufferDuringDisconnect: false,
          maxBufferSize: 100,
          batchEvents: false,
          maxBatchSize: 10,
          batchTimeoutMs: 1000,
          enableDeduplication: false,
          includeHistory: false,
        },
      };

      await expect(eventBus.subscribe(subscription, mockHandler)).rejects.toThrow();
    });
  });

  describe('on() convenience method', () => {
    it('should subscribe to single category', async () => {
      const result = await eventBus.on('simple-subscriber', EventCategory.PLAYER_ACTION, mockHandler);
      
      expect(result.success).toBe(true);
      expect(result.subscriptionId).toBeDefined();
    });

    it('should subscribe to multiple categories', async () => {
      const result = await eventBus.on(
        'multi-subscriber', 
        [EventCategory.PLAYER_ACTION, EventCategory.GAME_STATE], 
        mockHandler
      );
      
      expect(result.success).toBe(true);
    });

    it('should subscribe with filters', async () => {
      const filters = [
        {
          field: 'data.playerId',
          operator: FilterOperator.EQUALS,
          value: 'player-123',
        },
      ];

      const result = await eventBus.on('filtered-subscriber', EventCategory.PLAYER_ACTION, mockHandler, filters);
      expect(result.success).toBe(true);
    });
  });

  describe('onEvent() convenience method', () => {
    it('should subscribe to specific event type', async () => {
      const result = await eventBus.onEvent('event-subscriber', 'player_move', mockHandler);
      
      expect(result.success).toBe(true);
      expect(result.subscriptionId).toBeDefined();
    });
  });

  describe('unsubscribe()', () => {
    it('should unsubscribe successfully', async () => {
      const result = await eventBus.on('test-subscriber', EventCategory.PLAYER_ACTION, mockHandler);
      const subscriptionId = result.subscriptionId!;

      await expect(eventBus.unsubscribe(subscriptionId)).resolves.not.toThrow();
      
      const status = eventBus.getStatus();
      expect(status.activeSubscriptions).toBe(0);
    });

    it('should handle unsubscribing non-existent subscription', async () => {
      await expect(eventBus.unsubscribe('non-existent-id')).resolves.not.toThrow();
    });
  });

  describe('unsubscribeAll()', () => {
    it('should unsubscribe all subscriptions for subscriber', async () => {
      const subscriberId = 'test-subscriber';
      
      // Create multiple subscriptions for same subscriber
      await eventBus.on(subscriberId, EventCategory.PLAYER_ACTION, mockHandler);
      await eventBus.on(subscriberId, EventCategory.GAME_STATE, mockHandler);
      
      let status = eventBus.getStatus();
      expect(status.activeSubscriptions).toBe(2);
      
      await eventBus.unsubscribeAll(subscriberId);
      
      status = eventBus.getStatus();
      expect(status.activeSubscriptions).toBe(0);
    });
  });

  describe('getActiveSubscriptions()', () => {
    it('should return empty array when no subscriptions', () => {
      const subscriptions = eventBus.getActiveSubscriptions();
      expect(subscriptions).toEqual([]);
    });

    it('should return active subscriptions', async () => {
      await eventBus.on('subscriber-1', EventCategory.PLAYER_ACTION, mockHandler);
      await eventBus.on('subscriber-2', EventCategory.GAME_STATE, mockHandler);
      
      const subscriptions = eventBus.getActiveSubscriptions();
      expect(subscriptions).toHaveLength(2);
      expect(subscriptions[0]).toHaveProperty('subscriptionId');
      expect(subscriptions[0]).toHaveProperty('subscriberId');
      expect(subscriptions[0]).toHaveProperty('categories');
    });
  });

  describe('getSubscriptionsForSubscriber()', () => {
    it('should return subscriptions for specific subscriber', async () => {
      const subscriberId = 'test-subscriber';
      await eventBus.on(subscriberId, EventCategory.PLAYER_ACTION, mockHandler);
      await eventBus.on('other-subscriber', EventCategory.GAME_STATE, mockHandler);
      
      const subscriptions = eventBus.getSubscriptionsForSubscriber(subscriberId);
      expect(subscriptions).toHaveLength(1);
      expect(subscriptions[0].subscriberId).toBe(subscriberId);
    });

    it('should return empty array for subscriber with no subscriptions', () => {
      const subscriptions = eventBus.getSubscriptionsForSubscriber('non-existent');
      expect(subscriptions).toEqual([]);
    });
  });
});