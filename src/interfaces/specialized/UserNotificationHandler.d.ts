/**
 * User Notification Handler - Specialized event handling for user notifications
 * Extends the unified EventBus for notification-specific functionality
 */

import { EntityId } from '../../types/common';
import { 
  UniversalEvent, 
  EventCategory, 
  UserNotificationData, 
  NotificationType, 
  NotificationAction 
} from '../../types/events.d.ts';
import { EventBus, EventHandler, SubscriptionResult, EventPublishResult } from '../core/EventBus';

/**
 * Notification delivery channels
 */
export enum NotificationChannel {
  IN_GAME = 'in_game',
  WEBSOCKET = 'websocket',
  EMAIL = 'email',
  PUSH = 'push',
  SMS = 'sms',
  WEBHOOK = 'webhook'
}

/**
 * Notification delivery status
 */
export enum DeliveryStatus {
  PENDING = 'pending',
  DELIVERED = 'delivered',
  READ = 'read',
  FAILED = 'failed',
  EXPIRED = 'expired'
}

/**
 * Notification priority levels
 */
export enum NotificationPriority {
  LOW = 0,
  NORMAL = 1,
  HIGH = 2,
  URGENT = 3,
  CRITICAL = 4
}

/**
 * Enhanced notification data with delivery options
 */
export interface EnhancedNotificationData extends UserNotificationData {
  /** Notification identifier */
  notificationId: EntityId;
  /** Target user ID */
  userId: EntityId;
  /** Notification priority */
  priority: NotificationPriority;
  /** Delivery channels to use */
  channels: NotificationChannel[];
  /** Notification expiration */
  expiresAt?: Date;
  /** Require delivery confirmation */
  requireAck: boolean;
  /** Allow user to dismiss */
  dismissible: boolean;
  /** Notification category for grouping */
  category?: string;
  /** Related entity ID (game, room, etc.) */
  relatedEntityId?: EntityId;
  /** Delivery options per channel */
  channelOptions?: Record<NotificationChannel, any>;
}

/**
 * Notification template for reusable notifications
 */
export interface NotificationTemplate {
  /** Template identifier */
  templateId: EntityId;
  /** Template name */
  name: string;
  /** Template category */
  category: string;
  /** Default notification type */
  type: NotificationType;
  /** Title template (supports variables) */
  titleTemplate: string;
  /** Content template (supports variables) */
  contentTemplate: string;
  /** Default actions */
  defaultActions: NotificationAction[];
  /** Default channels */
  defaultChannels: NotificationChannel[];
  /** Template variables */
  variables: TemplateVariable[];
  /** Template metadata */
  metadata: Record<string, any>;
}

/**
 * Template variable definition
 */
export interface TemplateVariable {
  /** Variable name */
  name: string;
  /** Variable type */
  type: 'string' | 'number' | 'boolean' | 'date' | 'entity_id';
  /** Required variable */
  required: boolean;
  /** Default value */
  defaultValue?: any;
  /** Variable description */
  description: string;
}

/**
 * Notification delivery result
 */
export interface NotificationDeliveryResult {
  /** Notification ID */
  notificationId: EntityId;
  /** Overall delivery successful */
  success: boolean;
  /** Delivery results per channel */
  channelResults: ChannelDeliveryResult[];
  /** Delivery timestamp */
  deliveredAt: Date;
  /** Total delivery time (milliseconds) */
  deliveryTimeMs: number;
}

/**
 * Channel-specific delivery result
 */
export interface ChannelDeliveryResult {
  /** Delivery channel */
  channel: NotificationChannel;
  /** Channel delivery status */
  status: DeliveryStatus;
  /** Delivery timestamp */
  deliveredAt?: Date;
  /** Error message (if failed) */
  error?: string;
  /** Channel-specific metadata */
  metadata?: Record<string, any>;
}

/**
 * Notification preferences per user
 */
export interface NotificationPreferences {
  /** User identifier */
  userId: EntityId;
  /** Enabled notification types */
  enabledTypes: NotificationType[];
  /** Preferred delivery channels per type */
  channelPreferences: Record<NotificationType, NotificationChannel[]>;
  /** Quiet hours configuration */
  quietHours?: QuietHours;
  /** Notification frequency limits */
  frequencyLimits: FrequencyLimits;
  /** Block notifications from sources */
  blockedSources: EntityId[];
  /** Notification grouping preferences */
  groupingPreferences: GroupingPreferences;
}

/**
 * Quiet hours configuration
 */
export interface QuietHours {
  /** Quiet hours enabled */
  enabled: boolean;
  /** Start time (24-hour format) */
  startTime: string;
  /** End time (24-hour format) */
  endTime: string;
  /** Days of week (0=Sunday) */
  daysOfWeek: number[];
  /** Timezone */
  timezone: string;
  /** Allow urgent notifications during quiet hours */
  allowUrgent: boolean;
}

/**
 * Notification frequency limits
 */
export interface FrequencyLimits {
  /** Maximum notifications per hour */
  maxPerHour: number;
  /** Maximum notifications per day */
  maxPerDay: number;
  /** Batch similar notifications */
  enableBatching: boolean;
  /** Batch timeout (minutes) */
  batchTimeoutMinutes: number;
}

/**
 * Notification grouping preferences
 */
export interface GroupingPreferences {
  /** Enable notification grouping */
  enabled: boolean;
  /** Group by category */
  groupByCategory: boolean;
  /** Group by source */
  groupBySource: boolean;
  /** Maximum group size */
  maxGroupSize: number;
  /** Group timeout (minutes) */
  groupTimeoutMinutes: number;
}

/**
 * User Notification Handler interface
 */
export interface UserNotificationHandler {
  /** Reference to underlying event bus */
  readonly eventBus: EventBus;

  // Notification Sending Methods

  /**
   * Send notification to user
   * @param notification - Notification data
   * @returns Promise resolving to delivery result
   */
  sendNotification(notification: EnhancedNotificationData): Promise<NotificationDeliveryResult>;

  /**
   * Send notification using template
   * @param templateId - Template identifier
   * @param userId - Target user ID
   * @param variables - Template variables
   * @param overrides - Optional notification overrides
   * @returns Promise resolving to delivery result
   */
  sendFromTemplate(
    templateId: EntityId,
    userId: EntityId,
    variables: Record<string, any>,
    overrides?: Partial<EnhancedNotificationData>
  ): Promise<NotificationDeliveryResult>;

  /**
   * Send bulk notifications to multiple users
   * @param notifications - Array of notifications
   * @returns Promise resolving to delivery results
   */
  sendBulkNotifications(
    notifications: EnhancedNotificationData[]
  ): Promise<NotificationDeliveryResult[]>;

  /**
   * Broadcast notification to all users (with filtering)
   * @param notification - Notification template
   * @param filters - User filtering criteria
   * @returns Promise resolving to delivery results
   */
  broadcastNotification(
    notification: Omit<EnhancedNotificationData, 'userId'>,
    filters?: UserFilter[]
  ): Promise<NotificationDeliveryResult[]>;

  // Template Management

  /**
   * Create notification template
   * @param template - Template configuration
   * @returns Promise resolving to template ID
   */
  createTemplate(template: Omit<NotificationTemplate, 'templateId'>): Promise<EntityId>;

  /**
   * Update notification template
   * @param templateId - Template to update
   * @param updates - Template updates
   * @returns Promise that resolves when updated
   */
  updateTemplate(
    templateId: EntityId, 
    updates: Partial<NotificationTemplate>
  ): Promise<void>;

  /**
   * Delete notification template
   * @param templateId - Template to delete
   * @returns Promise that resolves when deleted
   */
  deleteTemplate(templateId: EntityId): Promise<void>;

  /**
   * Get all available templates
   * @param category - Optional category filter
   * @returns Promise resolving to templates
   */
  getTemplates(category?: string): Promise<NotificationTemplate[]>;

  // Subscription Management

  /**
   * Subscribe to user notifications
   * @param userId - User to subscribe to
   * @param handler - Notification handler function
   * @param types - Optional filter by notification types
   * @returns Promise resolving to subscription result
   */
  subscribeToUserNotifications(
    userId: EntityId,
    handler: EventHandler<EnhancedNotificationData>,
    types?: NotificationType[]
  ): Promise<SubscriptionResult>;

  /**
   * Subscribe to notification delivery events
   * @param handler - Delivery event handler
   * @returns Promise resolving to subscription result
   */
  subscribeToDeliveryEvents(
    handler: EventHandler<NotificationDeliveryResult>
  ): Promise<SubscriptionResult>;

  /**
   * Subscribe to notifications for specific entity
   * @param entityId - Entity identifier (game, room, etc.)
   * @param handler - Event handler function
   * @returns Promise resolving to subscription result
   */
  subscribeToEntityNotifications(
    entityId: EntityId,
    handler: EventHandler<EnhancedNotificationData>
  ): Promise<SubscriptionResult>;

  // User Preference Management

  /**
   * Set user notification preferences
   * @param preferences - User preferences
   * @returns Promise that resolves when preferences are set
   */
  setUserPreferences(preferences: NotificationPreferences): Promise<void>;

  /**
   * Get user notification preferences
   * @param userId - User identifier
   * @returns Promise resolving to user preferences
   */
  getUserPreferences(userId: EntityId): Promise<NotificationPreferences>;

  /**
   * Update user preferences partially
   * @param userId - User identifier
   * @param updates - Preference updates
   * @returns Promise that resolves when updated
   */
  updateUserPreferences(
    userId: EntityId, 
    updates: Partial<NotificationPreferences>
  ): Promise<void>;

  // Notification Management

  /**
   * Mark notification as read
   * @param userId - User identifier
   * @param notificationId - Notification identifier
   * @returns Promise that resolves when marked
   */
  markAsRead(userId: EntityId, notificationId: EntityId): Promise<void>;

  /**
   * Mark multiple notifications as read
   * @param userId - User identifier
   * @param notificationIds - Notification identifiers
   * @returns Promise that resolves when marked
   */
  markManyAsRead(userId: EntityId, notificationIds: EntityId[]): Promise<void>;

  /**
   * Dismiss notification
   * @param userId - User identifier
   * @param notificationId - Notification identifier
   * @returns Promise that resolves when dismissed
   */
  dismissNotification(userId: EntityId, notificationId: EntityId): Promise<void>;

  /**
   * Get unread notifications for user
   * @param userId - User identifier
   * @param limit - Maximum notifications to return
   * @returns Promise resolving to unread notifications
   */
  getUnreadNotifications(
    userId: EntityId, 
    limit?: number
  ): Promise<EnhancedNotificationData[]>;

  /**
   * Get notification history for user
   * @param userId - User identifier
   * @param filters - Optional filters
   * @param pagination - Pagination options
   * @returns Promise resolving to notification history
   */
  getNotificationHistory(
    userId: EntityId,
    filters?: NotificationHistoryFilter,
    pagination?: PaginationOptions
  ): Promise<PaginatedNotifications>;

  // Channel Management

  /**
   * Register custom notification channel
   * @param channel - Channel configuration
   * @returns Promise that resolves when registered
   */
  registerChannel(channel: CustomChannelConfig): Promise<void>;

  /**
   * Send notification to specific channel
   * @param channel - Target channel
   * @param notification - Notification data
   * @returns Promise resolving to delivery result
   */
  sendToChannel(
    channel: NotificationChannel, 
    notification: EnhancedNotificationData
  ): Promise<ChannelDeliveryResult>;

  /**
   * Test channel connectivity and configuration
   * @param channel - Channel to test
   * @returns Promise resolving to test result
   */
  testChannel(channel: NotificationChannel): Promise<ChannelTestResult>;

  // Analytics and Monitoring

  /**
   * Get notification delivery statistics
   * @param timeRange - Time range for statistics
   * @param filters - Optional filters
   * @returns Promise resolving to delivery statistics
   */
  getDeliveryStatistics(
    timeRange: { start: Date; end: Date },
    filters?: StatisticsFilter
  ): Promise<DeliveryStatistics>;

  /**
   * Get user engagement metrics
   * @param userId - User identifier (optional, for all users if not specified)
   * @param timeRange - Time range for metrics
   * @returns Promise resolving to engagement metrics
   */
  getEngagementMetrics(
    userId?: EntityId,
    timeRange?: { start: Date; end: Date }
  ): Promise<EngagementMetrics>;
}

// Supporting interfaces for the notification system

export interface UserFilter {
  field: string;
  operator: string;
  value: any;
}

export interface NotificationHistoryFilter {
  types?: NotificationType[];
  categories?: string[];
  startDate?: Date;
  endDate?: Date;
  status?: DeliveryStatus[];
}

export interface PaginationOptions {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder: 'asc' | 'desc';
}

export interface PaginatedNotifications {
  notifications: EnhancedNotificationData[];
  totalCount: number;
  pageCount: number;
  currentPage: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface CustomChannelConfig {
  channel: NotificationChannel;
  name: string;
  handler: (notification: EnhancedNotificationData) => Promise<ChannelDeliveryResult>;
  supportedTypes: NotificationType[];
  configuration: Record<string, any>;
}

export interface ChannelTestResult {
  channel: NotificationChannel;
  success: boolean;
  latencyMs: number;
  error?: string;
  metadata: Record<string, any>;
}

export interface StatisticsFilter {
  channels?: NotificationChannel[];
  types?: NotificationType[];
  userIds?: EntityId[];
}

export interface DeliveryStatistics {
  totalSent: number;
  totalDelivered: number;
  totalFailed: number;
  deliveryRate: number;
  averageDeliveryTimeMs: number;
  channelStatistics: Record<NotificationChannel, ChannelStatistics>;
  typeStatistics: Record<NotificationType, TypeStatistics>;
}

export interface ChannelStatistics {
  sent: number;
  delivered: number;
  failed: number;
  averageLatencyMs: number;
}

export interface TypeStatistics {
  sent: number;
  opened: number;
  clicked: number;
  dismissed: number;
  engagementRate: number;
}

export interface EngagementMetrics {
  totalNotifications: number;
  readRate: number;
  clickThroughRate: number;
  dismissalRate: number;
  averageTimeToRead: number;
  preferredChannels: NotificationChannel[];
  peakEngagementHours: number[];
}

/**
 * User Notification Handler factory function
 */
export type UserNotificationHandlerFactory = (eventBus: EventBus) => UserNotificationHandler;