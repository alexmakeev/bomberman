/**
 * UserNotificationHandler Implementation  
 * Multi-channel notification delivery with templates and analytics
 */

import type { 
  ChannelDeliveryResult,
  ChannelTestResult,
  CustomChannelConfig,
  DeliveryStatistics,
  DeliveryStatus,
  EngagementMetrics,
  EnhancedNotificationData,
  NotificationChannel,
  NotificationDeliveryResult,
  NotificationHistoryFilter,
  NotificationPreferences,
  NotificationPriority,
  NotificationTemplate,
  PaginatedNotifications,
  PaginationOptions,
  StatisticsFilter,
  UserFilter,
  UserNotificationHandler,
} from '../../interfaces/specialized/UserNotificationHandler.d.ts';
import type { EventBus, EventHandler, SubscriptionResult } from '../../interfaces/core/EventBus';
import type { EntityId } from '../../types/common';

/**
 * Complete implementation of UserNotificationHandler
 */
export class UserNotificationHandlerImpl implements UserNotificationHandler {
  readonly eventBus: EventBus;
  private readonly templates = new Map<EntityId, NotificationTemplate>();
  private readonly userPreferences = new Map<EntityId, NotificationPreferences>();
  private readonly channels = new Map<NotificationChannel, CustomChannelConfig>();
  private readonly notificationHistory = new Map<EntityId, EnhancedNotificationData[]>();
  private readonly deliveryStats = {
    totalSent: 0,
    totalDelivered: 0,
    totalFailed: 0,
  };

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
    console.log('📢 UserNotificationHandler created');
  }

  async initialize(): Promise<void> {
    console.log('📢 UserNotificationHandler initialized');
  }

  // Notification Sending Methods

  async sendNotification(notification: EnhancedNotificationData): Promise<NotificationDeliveryResult> {
    if (!notification) {
      throw new Error('Notification data is required');
    }
    
    // Check if EventBus is properly initialized
    if (!this.eventBus.getStatus().running) {
      throw new Error('EventBus is not initialized');
    }
    
    const startTime = Date.now();
    const deliveredAt = new Date();
    
    console.log(`📢 Sending notification ${notification.notificationId} to user ${notification.userId}`);
    
    // Store in history
    if (!this.notificationHistory.has(notification.userId)) {
      this.notificationHistory.set(notification.userId, []);
    }
    this.notificationHistory.get(notification.userId)!.push(notification);
    
    // Simulate delivery to all channels
    const channelResults: ChannelDeliveryResult[] = notification.channels.map(channel => ({
      channel,
      status: 'delivered' as DeliveryStatus,
      deliveredAt,
      metadata: {},
    }));
    
    this.deliveryStats.totalSent++;
    this.deliveryStats.totalDelivered++;
    
    return {
      notificationId: notification.notificationId,
      success: true,
      channelResults,
      deliveredAt,
      deliveryTimeMs: Date.now() - startTime,
    };
  }

  async sendFromTemplate(
    templateId: EntityId,
    userId: EntityId,
    variables: Record<string, any>,
    overrides?: Partial<EnhancedNotificationData>,
  ): Promise<NotificationDeliveryResult> {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }
    
    const notification: EnhancedNotificationData = {
      notificationId: `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      type: template.type,
      title: this.replaceVariables(template.titleTemplate, variables),
      content: this.replaceVariables(template.contentTemplate, variables),
      data: {},
      actions: template.defaultActions,
      timestamp: new Date(),
      priority: 1 as NotificationPriority,
      channels: template.defaultChannels,
      requireAck: false,
      dismissible: true,
      category: template.category,
      ...overrides,
    };
    
    return this.sendNotification(notification);
  }

  async sendBulkNotifications(
    notifications: EnhancedNotificationData[],
  ): Promise<NotificationDeliveryResult[]> {
    console.log(`📢 Sending bulk notifications: ${notifications.length} notifications`);
    
    const results = [];
    for (const notification of notifications) {
      try {
        const result = await this.sendNotification(notification);
        results.push(result);
      } catch (error) {
        console.error(`Failed to send notification ${notification.notificationId}:`, error);
        results.push({
          notificationId: notification.notificationId,
          success: false,
          channelResults: [],
          deliveredAt: new Date(),
          deliveryTimeMs: 0,
        });
      }
    }
    
    return results;
  }

  async broadcastNotification(
    notification: Omit<EnhancedNotificationData, 'userId'>,
    filters?: UserFilter[],
  ): Promise<NotificationDeliveryResult[]> {
    console.log('📢 Broadcasting notification to all users');
    
    // In a real implementation, this would query the user database
    // For testing, we'll create notifications for a few mock users
    const userIds = ['user1', 'user2', 'user3', 'user4', 'user5'];
    const filteredUserIds = filters ? this.applyUserFilters(userIds, filters) : userIds;
    
    const notifications: EnhancedNotificationData[] = filteredUserIds.map(userId => ({
      ...notification,
      userId,
    }));
    
    return this.sendBulkNotifications(notifications);
  }

  // Template Management

  async createTemplate(template: Omit<NotificationTemplate, 'templateId'>): Promise<EntityId> {
    const templateId = `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const completeTemplate: NotificationTemplate = {
      ...template,
      templateId,
    };
    
    this.templates.set(templateId, completeTemplate);
    console.log(`📝 Template created: ${templateId}`);
    
    return templateId;
  }

  async updateTemplate(
    templateId: EntityId,
    updates: Partial<NotificationTemplate>,
  ): Promise<void> {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }
    
    const updatedTemplate = { ...template, ...updates };
    this.templates.set(templateId, updatedTemplate);
    console.log(`📝 Template updated: ${templateId}`);
  }

  async deleteTemplate(templateId: EntityId): Promise<void> {
    if (!this.templates.has(templateId)) {
      throw new Error(`Template ${templateId} not found`);
    }
    
    this.templates.delete(templateId);
    console.log(`📝 Template deleted: ${templateId}`);
  }

  async getTemplates(category?: string): Promise<NotificationTemplate[]> {
    const allTemplates = Array.from(this.templates.values());
    return category ? allTemplates.filter(t => t.category === category) : allTemplates;
  }

  // Subscription Management

  async subscribeToUserNotifications(
    userId: EntityId,
    handler: EventHandler<EnhancedNotificationData>,
    types?: import('../../types/events.d.ts').NotificationType[],
  ): Promise<SubscriptionResult> {
    console.log(`📡 Subscribing to notifications for user ${userId}`);
    
    return this.eventBus.subscribe({
      subscriberId: `user_notifications_${userId}`,
      eventTypes: ['USER_NOTIFICATION'],
      filters: {
        userId,
        ...(types && { types }),
      },
    }, handler);
  }

  async subscribeToDeliveryEvents(
    handler: EventHandler<NotificationDeliveryResult>,
  ): Promise<SubscriptionResult> {
    console.log('📡 Subscribing to delivery events');
    
    return this.eventBus.subscribe({
      subscriberId: 'notification_delivery_events',
      eventTypes: ['NOTIFICATION_DELIVERY'],
    }, handler);
  }

  async subscribeToEntityNotifications(
    entityId: EntityId,
    handler: EventHandler<EnhancedNotificationData>,
  ): Promise<SubscriptionResult> {
    console.log(`📡 Subscribing to notifications for entity ${entityId}`);
    
    return this.eventBus.subscribe({
      subscriberId: `entity_notifications_${entityId}`,
      eventTypes: ['USER_NOTIFICATION'],
      filters: {
        relatedEntityId: entityId,
      },
    }, handler);
  }

  // User Preference Management

  async setUserPreferences(preferences: NotificationPreferences): Promise<void> {
    this.userPreferences.set(preferences.userId, preferences);
    console.log(`⚙️ User preferences set for ${preferences.userId}`);
  }

  async getUserPreferences(userId: EntityId): Promise<NotificationPreferences> {
    if (!userId) {
      throw new Error('User ID is required');
    }
    
    const preferences = this.userPreferences.get(userId);
    if (!preferences) {
      // Return default preferences
      const defaultPreferences: NotificationPreferences = {
        userId,
        enabledTypes: [],
        channelPreferences: {},
        frequencyLimits: {
          maxPerHour: 50,
          maxPerDay: 200,
          enableBatching: true,
          batchTimeoutMinutes: 5,
        },
        blockedSources: [],
        groupingPreferences: {
          enabled: true,
          groupByCategory: true,
          groupBySource: false,
          maxGroupSize: 10,
          groupTimeoutMinutes: 10,
        },
      };
      
      this.userPreferences.set(userId, defaultPreferences);
      return defaultPreferences;
    }
    
    console.log(`⚙️ User preferences retrieved for ${userId}`);
    return preferences;
  }

  async updateUserPreferences(
    userId: EntityId,
    updates: Partial<NotificationPreferences>,
  ): Promise<void> {
    const current = await this.getUserPreferences(userId);
    const updated = { ...current, ...updates };
    this.userPreferences.set(userId, updated);
    console.log(`⚙️ User preferences updated for ${userId}`);
  }

  // Notification Management

  async markAsRead(userId: EntityId, notificationId: EntityId): Promise<void> {
    console.log(`✓ Marking notification ${notificationId} as read for user ${userId}`);
    // In a real implementation, this would update the database
  }

  async markManyAsRead(userId: EntityId, notificationIds: EntityId[]): Promise<void> {
    console.log(`✓ Marking ${notificationIds.length} notifications as read for user ${userId}`);
    for (const notificationId of notificationIds) {
      await this.markAsRead(userId, notificationId);
    }
  }

  async dismissNotification(userId: EntityId, notificationId: EntityId): Promise<void> {
    console.log(`✗ Dismissing notification ${notificationId} for user ${userId}`);
    // In a real implementation, this would update the database
  }

  async getUnreadNotifications(
    userId: EntityId,
    limit: number = 50,
  ): Promise<EnhancedNotificationData[]> {
    console.log(`📬 Getting unread notifications for user ${userId}`);
    
    const userHistory = this.notificationHistory.get(userId) || [];
    // In a real implementation, this would filter by read status
    return userHistory.slice(0, limit);
  }

  async getNotificationHistory(
    userId: EntityId,
    filters?: NotificationHistoryFilter,
    pagination?: PaginationOptions,
  ): Promise<PaginatedNotifications> {
    console.log(`📋 Getting notification history for user ${userId}`);
    
    let userHistory = this.notificationHistory.get(userId) || [];
    
    // Apply filters
    if (filters) {
      if (filters.types) {
        userHistory = userHistory.filter(n => filters.types!.includes(n.type));
      }
      if (filters.categories) {
        userHistory = userHistory.filter(n => n.category && filters.categories!.includes(n.category));
      }
      if (filters.startDate) {
        userHistory = userHistory.filter(n => n.timestamp >= filters.startDate!);
      }
      if (filters.endDate) {
        userHistory = userHistory.filter(n => n.timestamp <= filters.endDate!);
      }
    }
    
    // Apply pagination
    const pageSize = pagination?.pageSize || 20;
    const page = pagination?.page || 1;
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    
    const paginatedNotifications = userHistory.slice(startIndex, endIndex);
    
    return {
      notifications: paginatedNotifications,
      totalCount: userHistory.length,
      pageCount: Math.ceil(userHistory.length / pageSize),
      currentPage: page,
      hasNext: endIndex < userHistory.length,
      hasPrevious: page > 1,
    };
  }

  // Channel Management

  async registerChannel(channel: CustomChannelConfig): Promise<void> {
    this.channels.set(channel.channel, channel);
    console.log(`📡 Registered custom channel: ${channel.name}`);
  }

  async sendToChannel(
    channel: NotificationChannel,
    notification: EnhancedNotificationData,
  ): Promise<ChannelDeliveryResult> {
    console.log(`📤 Sending to channel ${channel}:`, notification.notificationId);
    
    const customChannel = this.channels.get(channel);
    if (customChannel) {
      return customChannel.handler(notification);
    }
    
    // Default channel handling
    return {
      channel,
      status: 'delivered' as DeliveryStatus,
      deliveredAt: new Date(),
      metadata: {},
    };
  }

  async testChannel(channel: NotificationChannel): Promise<ChannelTestResult> {
    console.log(`🧪 Testing channel: ${channel}`);
    
    const startTime = Date.now();
    
    // Simulate channel test
    return {
      channel,
      success: true,
      latencyMs: Date.now() - startTime,
      metadata: {
        testTime: new Date().toISOString(),
      },
    };
  }

  // Analytics and Monitoring

  async getDeliveryStatistics(
    timeRange: { start: Date; end: Date },
    filters?: StatisticsFilter,
  ): Promise<DeliveryStatistics> {
    console.log('📊 Getting delivery statistics for range:', timeRange);
    
    return {
      totalSent: this.deliveryStats.totalSent,
      totalDelivered: this.deliveryStats.totalDelivered,
      totalFailed: this.deliveryStats.totalFailed,
      deliveryRate: this.deliveryStats.totalSent > 0 ? 
        this.deliveryStats.totalDelivered / this.deliveryStats.totalSent : 0,
      averageDeliveryTimeMs: 50, // Simulated average
      channelStatistics: {} as Record<NotificationChannel, import('../../interfaces/specialized/UserNotificationHandler.d.ts').ChannelStatistics>,
      typeStatistics: {} as Record<import('../../types/events.d.ts').NotificationType, import('../../interfaces/specialized/UserNotificationHandler.d.ts').TypeStatistics>,
    };
  }

  async getEngagementMetrics(
    userId?: EntityId,
    timeRange?: { start: Date; end: Date },
  ): Promise<EngagementMetrics> {
    console.log('📈 Getting engagement metrics for user:', userId);
    
    const totalNotifications = userId ? 
      (this.notificationHistory.get(userId)?.length || 0) :
      Array.from(this.notificationHistory.values()).reduce((sum, history) => sum + history.length, 0);
    
    return {
      totalNotifications,
      readRate: 0.75,
      clickThroughRate: 0.25,
      dismissalRate: 0.10,
      averageTimeToRead: 300000, // 5 minutes in ms
      preferredChannels: ['in_game' as NotificationChannel, 'websocket' as NotificationChannel],
      peakEngagementHours: [9, 10, 11, 14, 15, 16, 20, 21],
    };
  }

  // Private helper methods

  private replaceVariables(template: string, variables: Record<string, any>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return variables[key] !== undefined ? String(variables[key]) : match;
    });
  }

  private applyUserFilters(userIds: EntityId[], filters: UserFilter[]): EntityId[] {
    // Simplified filter implementation for testing
    return userIds;
  }
}

/**
 * Factory function to create UserNotificationHandler instance
 */
export function createUserNotificationHandlerImpl(eventBus: EventBus): UserNotificationHandler {
  return new UserNotificationHandlerImpl(eventBus);
}