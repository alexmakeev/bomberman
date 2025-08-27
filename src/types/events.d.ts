/**
 * Unified Event System - Reusable pub/sub infrastructure
 * Supports game events, user notifications, user actions, admin events, and system events
 */

import { EntityId, Timestamp, Position, ValidationResult } from './common';

/**
 * Universal event categories for the entire system
 */
export enum EventCategory {
  // Game-related events
  GAME_STATE = 'game_state',
  PLAYER_ACTION = 'player_action',
  GAME_MECHANICS = 'game_mechanics',
  
  // User-related events  
  USER_NOTIFICATION = 'user_notification',
  USER_SESSION = 'user_session',
  USER_PREFERENCE = 'user_preference',
  
  // Room/Lobby events
  ROOM_MANAGEMENT = 'room_management',
  LOBBY_STATE = 'lobby_state',
  CHAT_MESSAGE = 'chat_message',
  
  // Administrative events
  ADMIN_ACTION = 'admin_action',
  MODERATION = 'moderation',
  SYSTEM_CONFIG = 'system_config',
  
  // System events
  SYSTEM_STATUS = 'system_status',
  PERFORMANCE = 'performance',
  SECURITY = 'security',
  
  // External integration events
  WEBHOOK = 'webhook',
  API_EVENT = 'api_event',
  THIRD_PARTY = 'third_party'
}

/**
 * Event priorities for processing and delivery
 */
export enum EventPriority {
  LOW = 0,
  NORMAL = 1,
  HIGH = 2,
  CRITICAL = 3,
  IMMEDIATE = 4
}

/**
 * Event delivery modes
 */
export enum DeliveryMode {
  /** Fire and forget - no delivery guarantee */
  FIRE_AND_FORGET = 'fire_and_forget',
  /** At least once delivery */
  AT_LEAST_ONCE = 'at_least_once',  
  /** Exactly once delivery */
  EXACTLY_ONCE = 'exactly_once',
  /** Ordered delivery within partition */
  ORDERED = 'ordered'
}

/**
 * Universal event interface - base for all events in the system
 */
export interface UniversalEvent<TData = any> {
  /** Unique event identifier */
  eventId: EntityId;
  /** Event category */
  category: EventCategory;
  /** Specific event type within category */
  type: string;
  /** Event source identifier */
  sourceId: EntityId;
  /** Event target(s) - can be specific entities or patterns */
  targets: EventTarget[];
  /** Event payload data */
  data: TData;
  /** Event metadata */
  metadata: EventMetadata;
  /** Event timestamp */
  timestamp: Timestamp;
  /** Event version for schema evolution */
  version: string;
}

/**
 * Event targeting specification
 */
export interface EventTarget {
  /** Target type */
  type: TargetType;
  /** Target identifier or pattern */
  id: string;
  /** Additional targeting filters */
  filters?: EventFilter[];
}

/**
 * Event target types
 */
export enum TargetType {
  /** Specific player */
  PLAYER = 'player',
  /** All players in a room */
  ROOM = 'room',
  /** All players in a game */
  GAME = 'game',
  /** Admin users */
  ADMIN = 'admin',
  /** System-wide broadcast */
  BROADCAST = 'broadcast',
  /** External webhook */
  WEBHOOK = 'webhook',
  /** Custom target pattern */
  CUSTOM = 'custom'
}

/**
 * Event filtering criteria
 */
export interface EventFilter {
  /** Filter field path (dot notation supported) */
  field: string;
  /** Filter operator */
  operator: FilterOperator;
  /** Filter value */
  value: any;
  /** Case sensitive matching */
  caseSensitive?: boolean;
}

/**
 * Filter operators
 */
export enum FilterOperator {
  EQUALS = 'eq',
  NOT_EQUALS = 'ne',
  GREATER_THAN = 'gt',
  GREATER_THAN_OR_EQUAL = 'gte',
  LESS_THAN = 'lt',
  LESS_THAN_OR_EQUAL = 'lte',
  CONTAINS = 'contains',
  STARTS_WITH = 'starts_with',
  ENDS_WITH = 'ends_with',
  REGEX_MATCH = 'regex',
  IN_ARRAY = 'in',
  NOT_IN_ARRAY = 'not_in',
  EXISTS = 'exists',
  NOT_EXISTS = 'not_exists'
}

/**
 * Event metadata for routing and processing
 */
export interface EventMetadata {
  /** Event priority level */
  priority: EventPriority;
  /** Delivery mode */
  deliveryMode: DeliveryMode;
  /** Time to live (milliseconds) */
  ttl?: number;
  /** Retry configuration */
  retry?: RetryConfig;
  /** Event correlation ID for tracking */
  correlationId?: EntityId;
  /** Event tracing information */
  trace?: EventTrace;
  /** Custom tags for categorization */
  tags: string[];
  /** Event schema name for validation */
  schema?: string;
}

/**
 * Retry configuration for failed event delivery
 */
export interface RetryConfig {
  /** Maximum retry attempts */
  maxAttempts: number;
  /** Base delay between retries (milliseconds) */
  baseDelayMs: number;
  /** Exponential backoff multiplier */
  backoffMultiplier: number;
  /** Maximum delay cap (milliseconds) */
  maxDelayMs: number;
  /** Retry only on specific error types */
  retryOn?: string[];
}

/**
 * Event tracing for debugging and monitoring
 */
export interface EventTrace {
  /** Trace identifier */
  traceId: EntityId;
  /** Parent span ID */
  parentSpanId?: EntityId;
  /** Current span ID */
  spanId: EntityId;
  /** Processing steps */
  steps: TraceStep[];
}

/**
 * Individual trace step
 */
export interface TraceStep {
  /** Step name */
  name: string;
  /** Step timestamp */
  timestamp: Timestamp;
  /** Step duration (milliseconds) */
  duration?: number;
  /** Step metadata */
  metadata?: Record<string, any>;
}

/**
 * Event subscription configuration
 */
export interface EventSubscription {
  /** Subscription identifier */
  subscriptionId: EntityId;
  /** Subscriber identifier */
  subscriberId: EntityId;
  /** Subscription name/description */
  name: string;
  /** Event categories to subscribe to */
  categories: EventCategory[];
  /** Specific event types within categories */
  eventTypes?: string[];
  /** Subscription filters */
  filters: EventFilter[];
  /** Target routing */
  targets: EventTarget[];
  /** Subscription options */
  options: SubscriptionOptions;
  /** Creation timestamp */
  createdAt: Timestamp;
  /** Expiration timestamp */
  expiresAt?: Timestamp;
}

/**
 * Subscription configuration options
 */
export interface SubscriptionOptions {
  /** Buffer events during disconnection */
  bufferDuringDisconnect: boolean;
  /** Maximum buffer size */
  maxBufferSize: number;
  /** Batch events for delivery */
  batchEvents: boolean;
  /** Maximum batch size */
  maxBatchSize: number;
  /** Batch timeout (milliseconds) */
  batchTimeoutMs: number;
  /** Enable event deduplication */
  enableDeduplication: boolean;
  /** Deduplication key field path */
  deduplicationKey?: string;
  /** Include event history in subscription */
  includeHistory: boolean;
  /** Historical events to include */
  historyLimit?: number;
}

/**
 * Event publishing result
 */
export interface EventPublishResult {
  /** Publishing successful */
  success: boolean;
  /** Published event ID */
  eventId: EntityId;
  /** Number of targets reached */
  targetsReached: number;
  /** Publishing errors */
  errors?: PublishError[];
  /** Publishing metadata */
  metadata: PublishMetadata;
}

/**
 * Publishing error details
 */
export interface PublishError {
  /** Target that failed */
  target: EventTarget;
  /** Error code */
  errorCode: string;
  /** Error message */
  errorMessage: string;
  /** Error timestamp */
  timestamp: Timestamp;
  /** Retry scheduled */
  willRetry: boolean;
}

/**
 * Publishing metadata
 */
export interface PublishMetadata {
  /** Publishing timestamp */
  publishedAt: Timestamp;
  /** Processing duration (milliseconds) */
  processingTimeMs: number;
  /** Channel used for publishing */
  channel: string;
  /** Message size (bytes) */
  messageSizeBytes: number;
}

/**
 * Event handler function signature
 */
export type EventHandler<TData = any> = (event: UniversalEvent<TData>) => Promise<void> | void;

/**
 * Event middleware function signature
 */
export type EventMiddleware<TData = any> = (
  event: UniversalEvent<TData>, 
  next: () => Promise<void>
) => Promise<void>;

/**
 * Event bus configuration
 */
export interface EventBusConfig {
  /** Default event TTL (milliseconds) */
  defaultTTL: number;
  /** Maximum event size (bytes) */
  maxEventSize: number;
  /** Enable event persistence */
  enablePersistence: boolean;
  /** Persistence configuration */
  persistence?: PersistenceConfig;
  /** Enable event tracing */
  enableTracing: boolean;
  /** Default retry configuration */
  defaultRetry: RetryConfig;
  /** Performance monitoring */
  monitoring: MonitoringConfig;
}

/**
 * Event persistence configuration
 */
export interface PersistenceConfig {
  /** Persistence provider */
  provider: 'redis' | 'postgres' | 'hybrid';
  /** Event retention period (milliseconds) */
  retentionMs: number;
  /** Compress stored events */
  compression: boolean;
  /** Batch writes for performance */
  batchWrites: boolean;
  /** Maximum batch size */
  maxBatchSize: number;
}

/**
 * Monitoring configuration
 */
export interface MonitoringConfig {
  /** Enable performance metrics */
  enableMetrics: boolean;
  /** Metrics collection interval (milliseconds) */
  metricsIntervalMs: number;
  /** Enable event sampling */
  enableSampling: boolean;
  /** Sampling rate (0-1) */
  samplingRate: number;
  /** Alert thresholds */
  alertThresholds: AlertThresholds;
}

/**
 * Alert threshold configuration
 */
export interface AlertThresholds {
  /** Maximum event processing latency (milliseconds) */
  maxLatencyMs: number;
  /** Maximum error rate (errors per second) */
  maxErrorRate: number;
  /** Maximum queue depth */
  maxQueueDepth: number;
  /** Maximum memory usage (bytes) */
  maxMemoryBytes: number;
}

// Specific event data types for common use cases

/**
 * Game-related event data types
 */
export interface GameEventData {
  /** Game identifier */
  gameId: EntityId;
  /** Room identifier */
  roomId?: EntityId;
  /** Specific game data */
  gameData: any;
}

/**
 * User notification event data
 */
export interface UserNotificationData {
  /** Notification type */
  type: NotificationType;
  /** Notification title */
  title: string;
  /** Notification content */
  content: string;
  /** Action buttons */
  actions?: NotificationAction[];
  /** Notification metadata */
  metadata?: Record<string, any>;
}

/**
 * Notification types
 */
export enum NotificationType {
  INFO = 'info',
  SUCCESS = 'success',
  WARNING = 'warning',
  ERROR = 'error',
  ACHIEVEMENT = 'achievement',
  INVITATION = 'invitation',
  SYSTEM_UPDATE = 'system_update'
}

/**
 * Notification action button
 */
export interface NotificationAction {
  /** Action identifier */
  id: string;
  /** Action label */
  label: string;
  /** Action type */
  type: 'primary' | 'secondary' | 'danger';
  /** Action URL or callback */
  target: string;
}

/**
 * User action event data
 */
export interface UserActionData {
  /** Action type */
  actionType: string;
  /** Action payload */
  payload: any;
  /** Action context */
  context: ActionContext;
}

/**
 * Action context information
 */
export interface ActionContext {
  /** User session ID */
  sessionId: EntityId;
  /** User device information */
  deviceInfo: any;
  /** Action location */
  location?: Position;
  /** Additional context */
  metadata: Record<string, any>;
}

/**
 * Event stream configuration for real-time processing
 */
export interface EventStream {
  /** Stream identifier */
  streamId: EntityId;
  /** Stream name */
  name: string;
  /** Event categories in stream */
  categories: EventCategory[];
  /** Stream partitioning key */
  partitionKey: string;
  /** Stream retention policy */
  retention: StreamRetention;
  /** Stream processing options */
  processing: StreamProcessing;
}

/**
 * Stream retention policy
 */
export interface StreamRetention {
  /** Retention duration (milliseconds) */
  durationMs: number;
  /** Maximum events to retain */
  maxEvents?: number;
  /** Maximum stream size (bytes) */
  maxSizeBytes?: number;
}

/**
 * Stream processing configuration
 */
export interface StreamProcessing {
  /** Enable real-time processing */
  realTime: boolean;
  /** Processing parallelism */
  parallelism: number;
  /** Checkpoint interval (milliseconds) */
  checkpointIntervalMs: number;
  /** Enable exactly-once processing */
  exactlyOnce: boolean;
}