/**
 * EventBus Implementation
 * Core pub/sub infrastructure for the unified event system
 */

import type { 
  EventBus,
  EventBusConfig,
  EventHandler,
  EventMiddleware,
  EventPublishResult,
  SubscriptionResult,
} from '../interfaces/core/EventBus';
import type { 
  EventCategory,
  EventSubscription,
  UniversalEvent,
} from '../types/events';
import type { EntityId } from '../types/common';

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

  async subscribe<TData>(
    subscription: EventSubscription,
    handler: EventHandler<TData>,
  ): Promise<SubscriptionResult> {
    if (!this._isRunning) {
      throw new Error('EventBus is not running');
    }

    this._subscriptions.set(subscription.subscriptionId, subscription);
    
    // Register handler for each category/type combination
    for (const category of subscription.categories) {
      const eventTypes = subscription.eventTypes ?? ['*'];
      for (const eventType of eventTypes) {
        const key = `${category}:${eventType}`;
        const existingHandlers = this._handlers.get(key) ?? [];
        this._handlers.set(key, [...existingHandlers, handler as EventHandler]);
      }
    }

    console.log(`📩 Subscription created: ${subscription.subscriptionId}`);

    return {
      success: true,
      subscriptionId: subscription.subscriptionId,
      channels: subscription.categories.map(cat => `${cat}:*`),
      metadata: {
        subscribedAt: new Date(),
        channelCount: subscription.categories.length,
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

  async addMiddleware(middleware: EventMiddleware): Promise<void> {
    this._middleware.push(middleware);
    console.log('🔧 Middleware added to EventBus');
  }

  getSubscriptionCount(): number {
    return this._subscriptions.size;
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