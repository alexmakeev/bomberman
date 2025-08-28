/**
 * Unified GameServer Interface - Enhanced with reusable EventBus infrastructure
 * 
 * This interface extends the basic GameServer with the unified event system,
 * providing maximum code reuse across game events, user notifications, 
 * user actions, admin events, and system events.
 */

import { EntityId, Result, ValidationResult } from '../../types/common';
import { Room, RoomSettings, RoomPlayer } from '../../types/room';
import { Game } from '../../types/game';
import { 
  WebSocketMessage, 
  WebSocketEventMessage, 
  WebSocketSubscription,
  WebSocketDeliveryOptions
} from '../../types/websocket';
import { 
  UniversalEvent, 
  EventCategory, 
  EventPublishResult, 
  EventHandler,
  EventSubscription,
  EventTarget
} from '../../types/events.d.ts';
import { EventBus } from './EventBus';
import { GameEventHandler } from '../specialized/GameEventHandler';
import { UserNotificationHandler } from '../specialized/UserNotificationHandler';
import { UserActionHandler } from '../specialized/UserActionHandler';

/**
 * Subscription context for auto-subscription
 */
export interface SubscriptionContext {
  /** Current room ID */
  roomId?: EntityId;
  /** Current game ID */
  gameId?: EntityId;
  /** User role (player, admin, spectator) */
  role: 'player' | 'admin' | 'spectator';
  /** Additional context data */
  metadata?: Record<string, any>;
}

/**
 * WebSocket connection status with EventBus integration
 */
export interface WebSocketConnectionStatus {
  /** Connection identifier */
  connectionId: EntityId;
  /** Associated player ID */
  playerId: EntityId;
  /** Connection is active */
  isActive: boolean;
  /** Active subscriptions */
  subscriptions: WebSocketSubscription[];
  /** EventBus connection healthy */
  eventBusConnected: boolean;
  /** Last event received timestamp */
  lastEventAt?: Date;
  /** Events published count */
  eventsPublished: number;
  /** Events received count */
  eventsReceived: number;
  /** Average event latency (ms) */
  averageLatency: number;
  /** Delivery options */
  deliveryOptions: WebSocketDeliveryOptions;
}

/**
 * Enhanced GameServer with unified event system
 */
export interface UnifiedGameServer {
  // Core EventBus Integration

  /** 
   * Get the underlying EventBus instance 
   * @returns EventBus instance used by the server
   */
  readonly eventBus: EventBus;

  /** 
   * Get the GameEventHandler instance 
   * @returns GameEventHandler for game-specific events
   */
  readonly gameEvents: GameEventHandler;

  /** 
   * Get the UserNotificationHandler instance 
   * @returns UserNotificationHandler for user notifications
   */
  readonly notifications: UserNotificationHandler;

  /** 
   * Get the UserActionHandler instance 
   * @returns UserActionHandler for user action tracking
   */
  readonly userActions: UserActionHandler;

  // Server Lifecycle Methods

  /**
   * Initialize the server with EventBus integration
   * @param config - Server configuration
   * @returns Promise that resolves when server is ready
   * @throws Error if initialization fails
   */
  initialize(config: UnifiedServerConfig): Promise<void>;

  /**
   * Start the WebSocket server with EventBus
   * @param port - Port number to listen on
   * @returns Promise that resolves when server is started
   * @throws Error if server fails to start
   */
  start(port: number): Promise<void>;

  /**
   * Stop the server gracefully
   * @returns Promise that resolves when server is stopped
   * @throws Error if server fails to stop cleanly
   */
  stop(): Promise<void>;

  // Connection Management with EventBus

  /**
   * Handle new WebSocket connection with auto event subscription
   * @param connection - New WebSocket connection
   * @returns Promise resolving to connection setup result
   * @throws Error if connection cannot be established
   */
  handleConnection(connection: WebSocketConnectionInfo): Promise<WebSocketConnectionResult>;

  /**
   * Handle WebSocket disconnection with cleanup
   * @param connectionId - Connection to disconnect
   * @returns Promise that resolves when cleanup is complete
   * @throws Error if disconnection cleanup fails
   */
  handleDisconnection(connectionId: EntityId): Promise<void>;

  /**
   * Authenticate and associate player with connection
   * @param connectionId - WebSocket connection
   * @param playerId - Player identifier
   * @param authToken - Authentication token
   * @returns Promise resolving to authentication result
   * @throws Error if authentication fails
   */
  authenticateConnection(
    connectionId: EntityId,
    playerId: EntityId,
    authToken: string
  ): Promise<AuthenticationResult>;

  // Event Subscription Management

  /**
   * Subscribe WebSocket connection to event categories
   * @param connectionId - WebSocket connection to subscribe
   * @param playerId - Associated player ID
   * @param categories - Event categories to subscribe to
   * @param targets - Optional specific event targets
   * @param options - WebSocket-specific delivery options
   * @returns Promise resolving to subscription
   * @throws Error if subscription fails
   */
  subscribeToEvents(
    connectionId: EntityId,
    playerId: EntityId,
    categories: EventCategory[],
    targets?: EventTarget[],
    options?: Partial<WebSocketDeliveryOptions>
  ): Promise<WebSocketSubscription>;

  /**
   * Unsubscribe WebSocket connection from events
   * @param connectionId - WebSocket connection
   * @param subscriptionId - Specific subscription to cancel (optional)
   * @returns Promise that resolves when unsubscribed
   * @throws Error if unsubscription fails
   */
  unsubscribeFromEvents(
    connectionId: EntityId,
    subscriptionId?: EntityId
  ): Promise<void>;

  /**
   * Auto-subscribe connection based on context
   * @param connectionId - WebSocket connection
   * @param playerId - Associated player ID
   * @param context - Current context (room, game, etc.)
   * @returns Promise resolving to created subscriptions
   * @throws Error if auto-subscription fails
   */
  autoSubscribeToContext(
    connectionId: EntityId,
    playerId: EntityId,
    context: SubscriptionContext
  ): Promise<WebSocketSubscription[]>;

  /**
   * Update subscription context (when player joins room/game)
   * @param connectionId - WebSocket connection
   * @param context - New context
   * @returns Promise that resolves when context is updated
   * @throws Error if context update fails
   */
  updateSubscriptionContext(
    connectionId: EntityId,
    context: SubscriptionContext
  ): Promise<void>;

  // Event Publishing

  /**
   * Publish event from WebSocket client through EventBus
   * @param connectionId - Originating WebSocket connection
   * @param event - Event to publish
   * @returns Promise resolving to publish result
   * @throws Error if publishing fails or permission denied
   */
  publishEvent(
    connectionId: EntityId,
    event: UniversalEvent
  ): Promise<EventPublishResult>;

  /**
   * Publish event with simplified parameters
   * @param connectionId - Originating connection
   * @param category - Event category
   * @param type - Event type
   * @param data - Event data
   * @param targets - Event targets
   * @returns Promise resolving to publish result
   */
  publishSimpleEvent(
    connectionId: EntityId,
    category: EventCategory,
    type: string,
    data: any,
    targets: EventTarget[]
  ): Promise<EventPublishResult>;

  // Event Handling

  /**
   * Handle EventBus event and forward to WebSocket clients
   * @param event - EventBus event received
   * @returns void - Event forwarding is asynchronous
   * @throws Error if event forwarding fails
   */
  handleEventBusEvent(event: UniversalEvent): void;

  /**
   * Register custom event handler middleware
   * @param category - Event category to handle
   * @param handler - Event handler function
   * @param priority - Handler priority (higher = earlier execution)
   * @returns Handler identifier for removal
   */
  addEventMiddleware(
    category: EventCategory,
    handler: EventHandler,
    priority?: number
  ): EntityId;

  /**
   * Remove event handler middleware
   * @param handlerId - Handler to remove
   * @returns Promise that resolves when removed
   */
  removeEventMiddleware(handlerId: EntityId): Promise<void>;

  // Room Management with Events

  /**
   * Create room with automatic event setup
   * @param hostId - Room host player ID
   * @param settings - Room configuration
   * @returns Promise resolving to created room
   * @throws Error if room creation fails
   */
  createRoom(hostId: EntityId, settings: RoomSettings): Promise<Room>;

  /**
   * Join room with automatic event subscription
   * @param roomId - Target room ID
   * @param playerId - Joining player ID
   * @param connectionId - Player's WebSocket connection
   * @returns Promise resolving to room player data
   * @throws Error if join fails
   */
  joinRoom(
    roomId: EntityId,
    playerId: EntityId,
    connectionId: EntityId
  ): Promise<RoomPlayer>;

  /**
   * Leave room with subscription cleanup
   * @param roomId - Target room ID
   * @param playerId - Leaving player ID
   * @param connectionId - Player's WebSocket connection
   * @returns Promise that resolves when player leaves
   * @throws Error if leave fails
   */
  leaveRoom(
    roomId: EntityId,
    playerId: EntityId,
    connectionId: EntityId
  ): Promise<void>;

  // Game Management with Events

  /**
   * Start game with event setup and notifications
   * @param roomId - Room to start game in
   * @returns Promise resolving to started game
   * @throws Error if game start fails
   */
  startGame(roomId: EntityId): Promise<Game>;

  /**
   * End game with cleanup and statistics
   * @param gameId - Game to end
   * @param result - Game outcome data
   * @returns Promise that resolves when game ends
   * @throws Error if game end fails
   */
  endGame(gameId: EntityId, result: GameResult): Promise<void>;

  // Broadcasting and Messaging

  /**
   * Broadcast event to all connections in room
   * @param roomId - Target room
   * @param event - Event to broadcast
   * @returns Promise resolving to broadcast result
   * @throws Error if broadcast fails
   */
  broadcastToRoom(roomId: EntityId, event: UniversalEvent): Promise<EventPublishResult>;

  /**
   * Broadcast event to all connections in game
   * @param gameId - Target game
   * @param event - Event to broadcast
   * @returns Promise resolving to broadcast result
   * @throws Error if broadcast fails
   */
  broadcastToGame(gameId: EntityId, event: UniversalEvent): Promise<EventPublishResult>;

  /**
   * Send event to specific player
   * @param playerId - Target player
   * @param event - Event to send
   * @returns Promise resolving to send result
   * @throws Error if send fails
   */
  sendToPlayer(playerId: EntityId, event: UniversalEvent): Promise<EventPublishResult>;

  /**
   * Send notification to user
   * @param userId - Target user
   * @param notification - Notification data
   * @returns Promise resolving to delivery result
   * @throws Error if notification fails
   */
  sendNotification(userId: EntityId, notification: any): Promise<EventPublishResult>;

  // Status and Monitoring

  /**
   * Get WebSocket connection status with EventBus metrics
   * @param connectionId - WebSocket connection
   * @returns Connection status with event metrics
   * @throws Error if connection not found
   */
  getConnectionStatus(connectionId: EntityId): WebSocketConnectionStatus;

  /**
   * Get all active WebSocket connections with EventBus data
   * @returns Array of connection statuses
   * @throws Error if status cannot be retrieved
   */
  getAllConnectionStatuses(): WebSocketConnectionStatus[];

  /**
   * Get server status including EventBus metrics
   * @returns Enhanced server status
   * @throws Error if status cannot be retrieved
   */
  getServerStatus(): EnhancedServerStatus;

  /**
   * Get event system metrics
   * @param timeRangeMs - Time range for metrics
   * @returns Event system metrics
   * @throws Error if metrics cannot be retrieved
   */
  getEventMetrics(timeRangeMs: number): Promise<EventSystemMetrics>;

  // Configuration and Administration

  /**
   * Configure WebSocket event delivery options globally
   * @param options - Global delivery options
   * @returns Promise that resolves when configured
   * @throws Error if configuration fails
   */
  configureGlobalDelivery(options: WebSocketDeliveryOptions): Promise<void>;

  /**
   * Configure connection-specific delivery options
   * @param connectionId - WebSocket connection
   * @param options - Connection-specific options
   * @returns Promise that resolves when configured
   * @throws Error if configuration fails
   */
  configureConnectionDelivery(
    connectionId: EntityId,
    options: Partial<WebSocketDeliveryOptions>
  ): Promise<void>;

  /**
   * Pause event delivery for maintenance
   * @param connectionId - Connection to pause (optional, all if not specified)
   * @returns Promise that resolves when paused
   * @throws Error if pause fails
   */
  pauseEventDelivery(connectionId?: EntityId): Promise<void>;

  /**
   * Resume event delivery
   * @param connectionId - Connection to resume (optional, all if not specified)
   * @returns Promise that resolves when resumed
   * @throws Error if resume fails
   */
  resumeEventDelivery(connectionId?: EntityId): Promise<void>;

  /**
   * Health check for unified server
   * @returns Promise resolving to health status
   * @throws Error if health check fails
   */
  healthCheck(): Promise<UnifiedHealthCheckResult>;
}

// Supporting interfaces for the unified server

export interface UnifiedServerConfig {
  /** Basic server configuration */
  server: ServerConfig;
  /** EventBus configuration */
  eventBus: EventBusConfig;
  /** WebSocket delivery defaults */
  websocketDefaults: WebSocketDeliveryOptions;
  /** Auto-subscription settings */
  autoSubscription: AutoSubscriptionConfig;
}

export interface ServerConfig {
  port: number;
  maxConnections: number;
  connectionTimeout: number;
  enableCompression: boolean;
  ssl?: {
    enabled: boolean;
    certPath: string;
    keyPath: string;
  };
}

export interface EventBusConfig {
  defaultTTL: number;
  maxEventSize: number;
  enablePersistence: boolean;
  enableTracing: boolean;
  redisConfig: RedisConfig;
  postgresConfig: PostgresConfig;
}

export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  database: number;
  cluster?: boolean;
}

export interface PostgresConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl?: boolean;
}

export interface AutoSubscriptionConfig {
  /** Enable automatic subscription on connection */
  enabled: boolean;
  /** Default categories to subscribe to */
  defaultCategories: EventCategory[];
  /** Subscribe to room events on room join */
  subscribeToRoomOnJoin: boolean;
  /** Subscribe to game events on game start */
  subscribeToGameOnStart: boolean;
  /** Maximum subscriptions per connection */
  maxSubscriptionsPerConnection: number;
}

export interface WebSocketConnectionInfo {
  id: EntityId;
  socket: any;
  ipAddress: string;
  userAgent: string;
  protocolVersion: string;
}

export interface WebSocketConnectionResult {
  success: boolean;
  connectionId: EntityId;
  error?: string;
  subscriptions: WebSocketSubscription[];
}

export interface AuthenticationResult {
  success: boolean;
  playerId?: EntityId;
  permissions: string[];
  error?: string;
}

export interface GameResult {
  gameId: EntityId;
  outcome: 'victory' | 'defeat' | 'timeout' | 'terminated';
  duration: number;
  participants: EntityId[];
  statistics: any;
  endedAt: Date;
}

export interface EnhancedServerStatus {
  /** Basic server status */
  running: boolean;
  uptime: number;
  connections: number;
  rooms: number;
  games: number;
  /** EventBus status */
  eventBusStatus: EventBusStatus;
  /** WebSocket metrics */
  websocketMetrics: WebSocketMetrics;
  /** Performance indicators */
  performance: PerformanceMetrics;
}

export interface EventBusStatus {
  running: boolean;
  eventsPerSecond: number;
  subscriptions: number;
  queueDepth: number;
  errorRate: number;
}

export interface WebSocketMetrics {
  activeConnections: number;
  messagesPerSecond: number;
  averageLatency: number;
  compressionRatio: number;
  deliverySuccessRate: number;
}

export interface PerformanceMetrics {
  cpuUsage: number;
  memoryUsage: number;
  networkLatency: number;
  redisLatency: number;
  postgresLatency: number;
}

export interface EventSystemMetrics {
  totalEvents: number;
  eventsByCategory: Record<EventCategory, number>;
  averageProcessingTime: number;
  errorCount: number;
  subscriptionMetrics: SubscriptionMetrics;
}

export interface SubscriptionMetrics {
  totalSubscriptions: number;
  activeSubscriptions: number;
  subscriptionsByCategory: Record<EventCategory, number>;
  averageEventsPerSubscription: number;
}

export interface UnifiedHealthCheckResult {
  overall: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: Date;
  components: {
    webSocket: ComponentHealth;
    eventBus: ComponentHealth;
    redis: ComponentHealth;
    postgres: ComponentHealth;
  };
  performance: PerformanceIndicators;
}

export interface ComponentHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  latency?: number;
  errorRate?: number;
  lastCheck: Date;
  message?: string;
}

export interface PerformanceIndicators {
  responseTime: number;
  throughput: number;
  errorRate: number;
  resourceUtilization: number;
}

/**
 * Factory function for creating unified game server
 */
export type UnifiedGameServerFactory = (config: UnifiedServerConfig) => UnifiedGameServer;