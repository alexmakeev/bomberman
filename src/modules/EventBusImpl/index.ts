/**
 * EventBus Implementation
 * Core pub/sub infrastructure for the unified event system
 */

import type { 
  EventBus,
  EventBusConfig,
  EventBusStatus,
  EventHandler,
  EventMiddleware,
  EventPublishResult,
  SubscriptionResult,
} from '../../interfaces/core/EventBus';
import { 
  DeliveryMode,
  EventPriority,
  FilterOperator,
} from '../../types/events.d.ts';
import type { 
  EventCategory,
  EventFilter,
  EventSubscription,
  EventTarget,
  UniversalEvent,
} from '../../types/events.d.ts';
import type { EntityId } from '../../types/common';

/**
 * Stub implementation of EventBus
 */
class EventBusImpl implements EventBus {
  private _config?: EventBusConfig;
  private readonly _subscriptions = new Map<EntityId, EventSubscription>();
  private readonly _handlers = new Map<string, EventHandler[]>();
  private readonly _middleware: EventMiddleware[] = [];
  private _isRunning = false;

  async initialize(config: EventBusConfig): Promise<void> {
    this._config = config;
    this._isRunning = true;
    console.log('📡 EventBus initialized');
    // TODO: Setup Redis connections, persistence layer
  }

  async shutdown(): Promise<void> {
    this._isRunning = false;
    this._subscriptions.clear();
    this._handlers.clear();
    console.log('📡 EventBus shutdown');
    // TODO: Cleanup connections and resources
  }

  async publish<TData>(event: UniversalEvent<TData>): Promise<EventPublishResult> {
    if (!this._isRunning) {
      throw new Error('EventBus is not running');
    }

    console.log(`📤 Publishing event: ${event.category}/${event.type}`);
    
    // TODO: Apply middleware, validate event, publish to Redis
    // For now, just execute local handlers
    const handlers = this._handlers.get(`${event.category}:${event.type}`) ?? [];
    
    let successCount = 0;
    const errors: any[] = [];

    for (const handler of handlers) {
      try {
        await handler(event);
        successCount++;
      } catch (error) {
        errors.push(error);
        console.error(`❌ Handler error for ${event.category}/${event.type}:`, error);
      }
    }

    return {
      success: errors.length === 0,
      eventId: event.eventId,
      targetsReached: successCount,
      errors: errors.map(err => ({
        target: { type: 'handler' as any, id: 'local' },
        errorCode: 'HANDLER_ERROR',
        errorMessage: err.message,
        timestamp: new Date(),
        willRetry: false,
      })),
      metadata: {
        publishedAt: new Date(),
        processingTimeMs: 0, // TODO: Measure actual time
        channel: `${event.category}:${event.type}`,
        messageSizeBytes: JSON.stringify(event).length,
      },
    };
  }

  async emit<TData = any>(
    category: EventCategory, 
    type: string, 
    data: TData, 
    targets: EventTarget[],
    options?: Partial<UniversalEvent<TData>>,
  ): Promise<EventPublishResult> {
    const event: UniversalEvent<TData> = {
      eventId: options?.eventId || `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      category,
      type,
      sourceId: options?.sourceId || 'eventbus',
      targets,
      data,
      metadata: {
        priority: options?.metadata?.priority || EventPriority.NORMAL,
        deliveryMode: options?.metadata?.deliveryMode || DeliveryMode.FIRE_AND_FORGET,
        tags: options?.metadata?.tags || [],
        ...options?.metadata,
      },
      timestamp: options?.timestamp || new Date(),
      version: options?.version || '1.0.0',
    };
    
    return this.publish(event);
  }

  async subscribe<TData>(
    subscription: Omit<EventSubscription, 'subscriptionId' | 'createdAt'>,
    handler: EventHandler<TData>,
  ): Promise<SubscriptionResult> {
    if (!this._isRunning) {
      throw new Error('EventBus is not running');
    }

    // Generate unique subscription ID and create complete subscription
    const subscriptionId = `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const createdAt = new Date();
    
    const completeSubscription: EventSubscription = {
      ...subscription,
      subscriptionId,
      createdAt,
    };

    this._subscriptions.set(subscriptionId, completeSubscription);
    
    // Register handler for each category/type combination
    for (const category of completeSubscription.categories) {
      const eventTypes = completeSubscription.eventTypes ?? ['*'];
      for (const eventType of eventTypes) {
        const key = `${category}:${eventType}`;
        const existingHandlers = this._handlers.get(key) ?? [];
        this._handlers.set(key, [...existingHandlers, handler as EventHandler]);
      }
    }

    console.log(`📩 Subscription created: ${subscriptionId}`);

    return {
      success: true,
      subscriptionId,
      subscription: completeSubscription,
      channels: completeSubscription.categories.map(cat => `${cat}:*`),
      metadata: {
        subscribedAt: createdAt,
        channelCount: completeSubscription.categories.length,
      },
    };
  }

  async unsubscribe(subscriptionId: EntityId): Promise<void> {
    const subscription = this._subscriptions.get(subscriptionId);
    if (!subscription) {
      return;
    }

    // TODO: Remove specific handlers for this subscription
    this._subscriptions.delete(subscriptionId);
    console.log(`📩 Unsubscribed: ${subscriptionId}`);
  }

  async unsubscribeAll(subscriberId: EntityId): Promise<void> {
    const subscriptionsToRemove = Array.from(this._subscriptions.values())
      .filter(sub => sub.subscriberId === subscriberId);
    
    for (const subscription of subscriptionsToRemove) {
      await this.unsubscribe(subscription.subscriptionId);
    }
    
    console.log(`📩 Unsubscribed all for: ${subscriberId}`);
  }

  getActiveSubscriptions(): EventSubscription[] {
    return Array.from(this._subscriptions.values());
  }

  getSubscriptionsForSubscriber(subscriberId: EntityId): EventSubscription[] {
    return Array.from(this._subscriptions.values())
      .filter(sub => sub.subscriberId === subscriberId);
  }

  async addMiddleware(middleware: EventMiddleware): Promise<void> {
    this._middleware.push(middleware);
    console.log('🔧 Middleware added to EventBus');
  }

  getSubscriptionCount(): number {
    return this._subscriptions.size;
  }

  getStatus(): EventBusStatus {
    return {
      running: this._isRunning,
      activeSubscriptions: this._subscriptions.size,
      eventsPerSecond: 0, // TODO: Implement actual metrics tracking
      queueDepth: 0, // TODO: Implement queue tracking
      memoryUsage: 0, // TODO: Implement memory tracking
      errorRate: 0, // TODO: Implement error rate tracking
      redisConnections: 0, // TODO: Implement Redis connection tracking
      webSocketConnections: 0, // TODO: Implement WebSocket connection tracking
    };
  }

  async on<TData = any>(
    subscriptionId: EntityId,
    categories: EventCategory | EventCategory[],
    handler: EventHandler<TData>,
    filters?: EventFilter[],
  ): Promise<SubscriptionResult> {
    const categoriesArray = Array.isArray(categories) ? categories : [categories];
    
    const subscription: EventSubscription = {
      subscriptionId,
      subscriberId: subscriptionId,
      categories: categoriesArray,
      eventTypes: ['*'], // Listen to all event types within categories
      filters: filters || [],
      metadata: {
        createdAt: new Date(),
        subscriptionType: 'category_based',
      },
    };

    return this.subscribe(subscription, handler);
  }

  async onEvent<TData = any>(
    subscriptionId: EntityId,
    eventType: string,
    handler: EventHandler<TData>,
  ): Promise<SubscriptionResult> {
    // For specific event types, we'll subscribe to all categories but filter by type
    const subscription: EventSubscription = {
      subscriptionId,
      subscriberId: subscriptionId,
      categories: ['*' as EventCategory], // Listen to all categories
      eventTypes: [eventType], // But only this specific event type
      filters: [],
      metadata: {
        createdAt: new Date(),
        subscriptionType: 'event_type_based',
      },
    };

    return this.subscribe(subscription, handler);
  }

  getEventCategories(): EventCategory[] {
    // Return all event categories from our type system
    return [
      'game_state' as EventCategory,
      'player_action' as EventCategory,
      'user_notification' as EventCategory,
      'room_management' as EventCategory,
      'admin_action' as EventCategory,
      'system_status' as EventCategory,
    ];
  }
}

/**
 * Factory function to create EventBus instance
 */
export function createEventBusImpl(): EventBus {
  return new EventBusImpl();
}

/**
 * Export the implementation class for testing
 */
export { EventBusImpl };