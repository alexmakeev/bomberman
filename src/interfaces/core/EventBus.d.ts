/**
 * EventBus Interface - Unified pub/sub infrastructure for reusable event handling
 * 
 * This is the core event system that handles:
 * - Game events (player actions, state changes, mechanics)
 * - User notifications (achievements, invitations, system messages)
 * - User actions (input, preferences, session changes)
 * - Admin events (moderation, configuration, monitoring)
 * - System events (performance, security, status)
 * 
 * Designed for maximum code reuse across all system components.
 */

import { EntityId, Result, ValidationResult } from '../../types/common';
import { 
  UniversalEvent, 
  EventCategory, 
  EventSubscription, 
  EventPublishResult, 
  EventHandler, 
  EventMiddleware, 
  EventBusConfig,
  EventStream,
  EventFilter,
  EventTarget
} from '../../types/events';

/**
 * Event bus operational status
 */
export interface EventBusStatus {
  /** Bus is running */
  running: boolean;
  /** Active subscriptions count */
  activeSubscriptions: number;
  /** Events processed per second */
  eventsPerSecond: number;
  /** Current queue depth */
  queueDepth: number;
  /** Memory usage (bytes) */
  memoryUsage: number;
  /** Error rate (errors per minute) */
  errorRate: number;
  /** Connected Redis instances */
  redisConnections: number;
  /** WebSocket connections */
  webSocketConnections: number;
}

/**
 * Subscription management result
 */
export interface SubscriptionResult {
  /** Operation successful */
  success: boolean;
  /** Subscription ID */
  subscriptionId?: EntityId;
  /** Error message */
  error?: string;
  /** Subscription details */
  subscription?: EventSubscription;
}

/**
 * Event query parameters for history and filtering
 */
export interface EventQuery {
  /** Event categories to query */
  categories?: EventCategory[];
  /** Specific event types */
  eventTypes?: string[];
  /** Event filters */
  filters: EventFilter[];
  /** Time range start */
  startTime?: Date;
  /** Time range end */
  endTime?: Date;
  /** Source IDs to include */
  sourceIds?: EntityId[];
  /** Target IDs to include */
  targetIds?: EntityId[];
  /** Maximum results */
  limit?: number;
  /** Pagination offset */
  offset?: number;
  /** Sort order */
  sortOrder: 'asc' | 'desc';
}

/**
 * Event batch for bulk operations
 */
export interface EventBatch<TData = any> {
  /** Batch identifier */
  batchId: EntityId;
  /** Events in batch */
  events: UniversalEvent<TData>[];
  /** Batch metadata */
  metadata: BatchMetadata;
}

/**
 * Batch processing metadata
 */
export interface BatchMetadata {
  /** Batch size */
  size: number;
  /** Batch creation timestamp */
  createdAt: Date;
  /** Processing mode */
  mode: 'parallel' | 'sequential' | 'priority_ordered';
  /** Failure handling */
  failureHandling: 'fail_fast' | 'continue' | 'retry_failed';
}

/**
 * Main EventBus interface
 */
export interface EventBus {
  /**
   * Initialize the event bus with configuration
   * @param config - Event bus configuration
   * @returns Promise that resolves when bus is ready
   * @throws Error if initialization fails
   */
  initialize(config: EventBusConfig): Promise<void>;

  /**
   * Shutdown the event bus gracefully
   * @returns Promise that resolves when shutdown is complete
   * @throws Error if shutdown fails
   */
  shutdown(): Promise<void>;

  // Event Publishing Methods

  /**
   * Publish a single event to the bus
   * @param event - Event to publish
   * @returns Promise resolving to publish result
   * @throws Error if publishing fails
   */
  publish<TData = any>(event: UniversalEvent<TData>): Promise<EventPublishResult>;

  /**
   * Publish multiple events as a batch
   * @param batch - Event batch to publish
   * @returns Promise resolving to batch results
   * @throws Error if batch publishing fails
   */
  publishBatch<TData = any>(batch: EventBatch<TData>): Promise<EventPublishResult[]>;

  /**
   * Publish event with simplified parameters (convenience method)
   * @param category - Event category
   * @param type - Event type
   * @param data - Event data
   * @param targets - Event targets
   * @param options - Optional event options
   * @returns Promise resolving to publish result
   */
  emit<TData = any>(
    category: EventCategory, 
    type: string, 
    data: TData, 
    targets: EventTarget[],
    options?: Partial<UniversalEvent<TData>>
  ): Promise<EventPublishResult>;

  // Subscription Management Methods

  /**
   * Subscribe to events with detailed configuration
   * @param subscription - Subscription configuration
   * @param handler - Event handler function
   * @returns Promise resolving to subscription result
   * @throws Error if subscription fails
   */
  subscribe<TData = any>(
    subscription: Omit<EventSubscription, 'subscriptionId' | 'createdAt'>, 
    handler: EventHandler<TData>
  ): Promise<SubscriptionResult>;

  /**
   * Subscribe to events with simplified parameters (convenience method)
   * @param subscriberId - Subscriber identifier
   * @param categories - Event categories to subscribe to
   * @param handler - Event handler function
   * @param filters - Optional event filters
   * @returns Promise resolving to subscription result
   */
  on<TData = any>(
    subscriberId: EntityId,
    categories: EventCategory | EventCategory[],
    handler: EventHandler<TData>,
    filters?: EventFilter[]
  ): Promise<SubscriptionResult>;

  /**
   * Subscribe to specific event type (convenience method)
   * @param subscriberId - Subscriber identifier
   * @param eventType - Specific event type to subscribe to
   * @param handler - Event handler function
   * @returns Promise resolving to subscription result
   */
  onEvent<TData = any>(
    subscriberId: EntityId,
    eventType: string,
    handler: EventHandler<TData>
  ): Promise<SubscriptionResult>;

  /**
   * Unsubscribe from events
   * @param subscriptionId - Subscription to cancel
   * @returns Promise that resolves when unsubscribed
   * @throws Error if unsubscription fails
   */
  unsubscribe(subscriptionId: EntityId): Promise<void>;

  /**
   * Unsubscribe all subscriptions for a subscriber
   * @param subscriberId - Subscriber to unsubscribe
   * @returns Promise that resolves when all unsubscribed
   * @throws Error if bulk unsubscription fails
   */
  unsubscribeAll(subscriberId: EntityId): Promise<void>;

  /**
   * Update existing subscription filters
   * @param subscriptionId - Subscription to update
   * @param filters - New filters to apply
   * @returns Promise that resolves when updated
   * @throws Error if update fails
   */
  updateSubscription(subscriptionId: EntityId, filters: EventFilter[]): Promise<void>;

  // Middleware Management

  /**
   * Add middleware to the event processing pipeline
   * @param middleware - Middleware function
   * @param priority - Middleware priority (higher = earlier execution)
   * @returns Middleware identifier for removal
   * @throws Error if middleware registration fails
   */
  addMiddleware<TData = any>(middleware: EventMiddleware<TData>, priority?: number): EntityId;

  /**
   * Remove middleware from the processing pipeline
   * @param middlewareId - Middleware to remove
   * @returns Promise that resolves when removed
   * @throws Error if middleware removal fails
   */
  removeMiddleware(middlewareId: EntityId): Promise<void>;

  // Stream Management

  /**
   * Create an event stream for real-time processing
   * @param stream - Stream configuration
   * @returns Promise resolving to stream identifier
   * @throws Error if stream creation fails
   */
  createStream(stream: Omit<EventStream, 'streamId'>): Promise<EntityId>;

  /**
   * Delete an event stream
   * @param streamId - Stream to delete
   * @returns Promise that resolves when deleted
   * @throws Error if stream deletion fails
   */
  deleteStream(streamId: EntityId): Promise<void>;

  /**
   * Subscribe to events from a specific stream
   * @param streamId - Stream to subscribe to
   * @param handler - Event handler function
   * @returns Promise resolving to subscription result
   */
  subscribeToStream<TData = any>(
    streamId: EntityId, 
    handler: EventHandler<TData>
  ): Promise<SubscriptionResult>;

  // Query and History Methods

  /**
   * Query historical events
   * @param query - Query parameters
   * @returns Promise resolving to matching events
   * @throws Error if query fails
   */
  queryEvents<TData = any>(query: EventQuery): Promise<UniversalEvent<TData>[]>;

  /**
   * Get events for a specific subscriber (useful for reconnection)
   * @param subscriberId - Subscriber identifier
   * @param since - Timestamp to get events since
   * @returns Promise resolving to events
   * @throws Error if retrieval fails
   */
  getEventsForSubscriber<TData = any>(
    subscriberId: EntityId, 
    since?: Date
  ): Promise<UniversalEvent<TData>[]>;

  /**
   * Replay events for a subscriber (useful for state recovery)
   * @param subscriberId - Subscriber identifier
   * @param query - Query parameters for replay
   * @returns Promise that resolves when replay is complete
   * @throws Error if replay fails
   */
  replayEvents(subscriberId: EntityId, query: EventQuery): Promise<void>;

  // Monitoring and Status Methods

  /**
   * Get current event bus status
   * @returns Current operational status
   * @throws Error if status cannot be retrieved
   */
  getStatus(): EventBusStatus;

  /**
   * Get all active subscriptions
   * @returns Array of active subscriptions
   * @throws Error if subscriptions cannot be retrieved
   */
  getActiveSubscriptions(): EventSubscription[];

  /**
   * Get subscriptions for a specific subscriber
   * @param subscriberId - Subscriber identifier
   * @returns Array of subscriber's subscriptions
   * @throws Error if subscriptions cannot be retrieved
   */
  getSubscriptionsForSubscriber(subscriberId: EntityId): EventSubscription[];

  /**
   * Get event processing metrics
   * @param timeRangeMs - Time range for metrics (milliseconds)
   * @returns Event processing metrics
   * @throws Error if metrics cannot be retrieved
   */
  getMetrics(timeRangeMs: number): Promise<EventMetrics>;

  // Administrative Methods

  /**
   * Pause event processing (for maintenance)
   * @returns Promise that resolves when paused
   * @throws Error if pause fails
   */
  pause(): Promise<void>;

  /**
   * Resume event processing
   * @returns Promise that resolves when resumed
   * @throws Error if resume fails
   */
  resume(): Promise<void>;

  /**
   * Flush all pending events
   * @returns Promise that resolves when flushed
   * @throws Error if flush fails
   */
  flush(): Promise<void>;

  /**
   * Clear all subscriptions and reset state
   * @returns Promise that resolves when cleared
   * @throws Error if clear fails
   */
  clear(): Promise<void>;

  /**
   * Health check for the event bus
   * @returns Promise resolving to health status
   * @throws Error if health check fails
   */
  healthCheck(): Promise<HealthCheckResult>;
}

/**
 * Event processing metrics
 */
export interface EventMetrics {
  /** Total events processed */
  totalEvents: number;
  /** Events per second */
  eventsPerSecond: number;
  /** Average processing latency (milliseconds) */
  averageLatencyMs: number;
  /** 95th percentile latency (milliseconds) */
  p95LatencyMs: number;
  /** Error count */
  errorCount: number;
  /** Error rate (errors per second) */
  errorRate: number;
  /** Queue depth statistics */
  queueMetrics: QueueMetrics;
  /** Memory usage statistics */
  memoryMetrics: MemoryMetrics;
  /** Subscription statistics */
  subscriptionMetrics: SubscriptionMetrics;
}

/**
 * Queue depth metrics
 */
export interface QueueMetrics {
  /** Current queue depth */
  currentDepth: number;
  /** Maximum queue depth */
  maxDepth: number;
  /** Average queue depth */
  averageDepth: number;
}

/**
 * Memory usage metrics
 */
export interface MemoryMetrics {
  /** Current memory usage (bytes) */
  currentUsage: number;
  /** Maximum memory usage (bytes) */
  maxUsage: number;
  /** Average memory usage (bytes) */
  averageUsage: number;
}

/**
 * Subscription metrics
 */
export interface SubscriptionMetrics {
  /** Total active subscriptions */
  totalSubscriptions: number;
  /** Subscriptions by category */
  subscriptionsByCategory: Record<EventCategory, number>;
  /** Average events per subscription */
  averageEventsPerSubscription: number;
}

/**
 * Health check result
 */
export interface HealthCheckResult {
  /** Overall health status */
  healthy: boolean;
  /** Health check timestamp */
  timestamp: Date;
  /** Individual component health */
  components: ComponentHealth[];
  /** Performance indicators */
  performance: PerformanceIndicators;
}

/**
 * Individual component health
 */
export interface ComponentHealth {
  /** Component name */
  name: string;
  /** Component healthy */
  healthy: boolean;
  /** Last check timestamp */
  lastCheck: Date;
  /** Error message (if unhealthy) */
  error?: string;
  /** Component metrics */
  metrics?: Record<string, any>;
}

/**
 * Performance indicators
 */
export interface PerformanceIndicators {
  /** CPU usage percentage */
  cpuUsage: number;
  /** Memory usage percentage */
  memoryUsage: number;
  /** Network latency (milliseconds) */
  networkLatency: number;
  /** Disk I/O rate (operations per second) */
  diskIORate: number;
}

/**
 * EventBus factory function type
 */
export type EventBusFactory = (config: EventBusConfig) => EventBus;

/**
 * Specialized event bus instances for different use cases
 */
export namespace SpecializedEventBus {
  /**
   * Game-focused event bus with game-specific optimizations
   */
  export interface GameEventBus extends EventBus {
    /** Publish game state change */
    publishGameStateChange(gameId: EntityId, stateData: any): Promise<EventPublishResult>;
    /** Subscribe to game events for a specific game */
    subscribeToGame(gameId: EntityId, handler: EventHandler): Promise<SubscriptionResult>;
    /** Broadcast to all players in a game */
    broadcastToGame(gameId: EntityId, eventType: string, data: any): Promise<EventPublishResult>;
  }

  /**
   * User notification event bus with delivery guarantees
   */
  export interface NotificationEventBus extends EventBus {
    /** Send notification with delivery confirmation */
    sendNotification(userId: EntityId, notification: any): Promise<EventPublishResult>;
    /** Subscribe to user notifications */
    subscribeToUserNotifications(userId: EntityId, handler: EventHandler): Promise<SubscriptionResult>;
    /** Mark notification as read */
    markAsRead(userId: EntityId, notificationId: EntityId): Promise<void>;
  }

  /**
   * Admin event bus with enhanced security and audit trails
   */
  export interface AdminEventBus extends EventBus {
    /** Publish admin action with audit trail */
    publishAdminAction(adminId: EntityId, action: any): Promise<EventPublishResult>;
    /** Subscribe to admin events with permission validation */
    subscribeToAdminEvents(adminId: EntityId, handler: EventHandler): Promise<SubscriptionResult>;
    /** Get audit trail for admin actions */
    getAuditTrail(timeRange: { start: Date; end: Date }): Promise<UniversalEvent[]>;
  }
}