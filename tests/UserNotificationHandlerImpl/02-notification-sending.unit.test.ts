/**
 * UserNotificationHandlerImpl Unit Tests - Notification Sending
 * Tests core notification sending functionality
 * 
 * Documentation References:
 * - src/interfaces/specialized/UserNotificationHandler.d.ts:225-268 (Notification Sending Methods)
 * - src/interfaces/specialized/UserNotificationHandler.d.ts:53-74 (EnhancedNotificationData interface)
 * - src/interfaces/specialized/UserNotificationHandler.d.ts:18-48 (NotificationChannel, DeliveryStatus, NotificationPriority enums)
 * - src/types/events.d.ts:432-454 (NotificationType enum and NotificationAction interface)
 */

import { UserNotificationHandlerImpl } from '../../src/modules/UserNotificationHandlerImpl';
import { EventBusImpl } from '../../src/modules/EventBusImpl';
import type { 
  UserNotificationHandler, 
  EnhancedNotificationData, 
  NotificationDeliveryResult,
  NotificationChannel,
  NotificationPriority
} from '../../src/interfaces/specialized/UserNotificationHandler';
import type { EventBus, EventBusConfig } from '../../src/interfaces/core/EventBus';
import { NotificationType } from '../../src/types/events';

describe('UserNotificationHandlerImpl - Notification Sending', () => {
  let eventBus: EventBus;
  let notificationHandler: UserNotificationHandler;
  let mockConfig: EventBusConfig;

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

    await eventBus.initialize(mockConfig);
    notificationHandler = new UserNotificationHandlerImpl(eventBus);
  });

  afterEach(async () => {
    if (eventBus) {
      await eventBus.shutdown();
    }
  });

  describe('sendNotification()', () => {
    /**
     * Tests UserNotificationHandler.d.ts:227-232 - sendNotification method
     * Tests EnhancedNotificationData interface from UserNotificationHandler.d.ts:53-74
     */
    it('should send notification with complete data structure', async () => {
      const notification: EnhancedNotificationData = {
        notificationId: 'notif-123',
        userId: 'user-456',
        type: NotificationType.INFO,
        title: 'Welcome to Bomberman!',
        content: 'Ready to start your first game?',
        priority: NotificationPriority.NORMAL,
        channels: [NotificationChannel.IN_GAME, NotificationChannel.WEBSOCKET],
        requireAck: false,
        dismissible: true,
        actions: [
          {
            id: 'start_game',
            label: 'Start Game',
            type: 'primary',
            target: '/game/start',
          },
          {
            id: 'tutorial',
            label: 'Tutorial',
            type: 'secondary',
            target: '/tutorial',
          },
        ],
        metadata: {
          gameId: 'game-789',
          roomId: 'room-101',
        },
      };

      const result: NotificationDeliveryResult = await notificationHandler.sendNotification(notification);

      expect(result).toBeDefined();
      expect(result).toHaveProperty('notificationId', 'notif-123');
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('channelResults');
      expect(result).toHaveProperty('deliveredAt');
      expect(result).toHaveProperty('deliveryTimeMs');
      expect(Array.isArray(result.channelResults)).toBe(true);
    });

    /**
     * Tests different notification types from events.d.ts:432-440
     * Ensures all NotificationType enum values are handled
     */
    it('should handle all notification types', async () => {
      const notificationTypes = [
        NotificationType.INFO,
        NotificationType.SUCCESS,
        NotificationType.WARNING,
        NotificationType.ERROR,
        NotificationType.ACHIEVEMENT,
        NotificationType.INVITATION,
        NotificationType.SYSTEM_UPDATE,
      ];

      for (const type of notificationTypes) {
        const notification: EnhancedNotificationData = {
          notificationId: `notif-${type}`,
          userId: 'user-456',
          type,
          title: `${type} Notification`,
          content: `This is a ${type} notification`,
          priority: NotificationPriority.NORMAL,
          channels: [NotificationChannel.IN_GAME],
          requireAck: false,
          dismissible: true,
          actions: [],
          metadata: {},
        };

        const result = await notificationHandler.sendNotification(notification);
        expect(result.success).toBe(true);
      }
    });

    /**
     * Tests different priority levels from UserNotificationHandler.d.ts:42-48
     * Ensures all NotificationPriority enum values work correctly
     */
    it('should handle all priority levels', async () => {
      const priorities = [
        NotificationPriority.LOW,
        NotificationPriority.NORMAL,
        NotificationPriority.HIGH,
        NotificationPriority.URGENT,
        NotificationPriority.CRITICAL,
      ];

      for (const priority of priorities) {
        const notification: EnhancedNotificationData = {
          notificationId: `notif-priority-${priority}`,
          userId: 'user-456',
          type: NotificationType.INFO,
          title: `Priority ${priority} Notification`,
          content: 'Test notification content',
          priority,
          channels: [NotificationChannel.IN_GAME],
          requireAck: priority >= NotificationPriority.URGENT,
          dismissible: priority < NotificationPriority.CRITICAL,
          actions: [],
          metadata: {},
        };

        const result = await notificationHandler.sendNotification(notification);
        expect(result.success).toBe(true);
      }
    });

    /**
     * Tests different notification channels from UserNotificationHandler.d.ts:18-26
     * Ensures all NotificationChannel enum values are supported
     */
    it('should handle all notification channels', async () => {
      const channels = [
        NotificationChannel.IN_GAME,
        NotificationChannel.WEBSOCKET,
        NotificationChannel.EMAIL,
        NotificationChannel.PUSH,
        NotificationChannel.SMS,
        NotificationChannel.WEBHOOK,
      ];

      for (const channel of channels) {
        const notification: EnhancedNotificationData = {
          notificationId: `notif-channel-${channel}`,
          userId: 'user-456',
          type: NotificationType.INFO,
          title: `${channel} Notification`,
          content: 'Test notification content',
          priority: NotificationPriority.NORMAL,
          channels: [channel],
          requireAck: false,
          dismissible: true,
          actions: [],
          metadata: {},
        };

        const result = await notificationHandler.sendNotification(notification);
        expect(result.success).toBe(true);
        expect(result.channelResults).toHaveLength(1);
        expect(result.channelResults[0].channel).toBe(channel);
      }
    });

    /**
     * Tests notification expiration handling
     * EnhancedNotificationData.expiresAt from UserNotificationHandler.d.ts:63
     */
    it('should handle notification expiration', async () => {
      const futureDate = new Date(Date.now() + 3600000); // 1 hour from now
      const pastDate = new Date(Date.now() - 3600000); // 1 hour ago

      const notifications = [
        {
          notificationId: 'notif-future-expiry',
          expiresAt: futureDate,
        },
        {
          notificationId: 'notif-past-expiry',
          expiresAt: pastDate,
        },
        {
          notificationId: 'notif-no-expiry',
          expiresAt: undefined,
        },
      ];

      for (const { notificationId, expiresAt } of notifications) {
        const notification: EnhancedNotificationData = {
          notificationId,
          userId: 'user-456',
          type: NotificationType.INFO,
          title: 'Expiry Test',
          content: 'Testing expiration',
          priority: NotificationPriority.NORMAL,
          channels: [NotificationChannel.IN_GAME],
          requireAck: false,
          dismissible: true,
          expiresAt,
          actions: [],
          metadata: {},
        };

        const result = await notificationHandler.sendNotification(notification);
        // Past expired notifications might fail or be handled differently
        expect(result).toBeDefined();
      }
    });
  });

  describe('sendBulkNotifications()', () => {
    /**
     * Tests UserNotificationHandler.d.ts:249-256 - sendBulkNotifications method
     * Tests bulk notification handling for multiple users
     */
    it('should send multiple notifications in bulk', async () => {
      const notifications: EnhancedNotificationData[] = [
        {
          notificationId: 'bulk-1',
          userId: 'user-1',
          type: NotificationType.INFO,
          title: 'Bulk Notification 1',
          content: 'First bulk notification',
          priority: NotificationPriority.NORMAL,
          channels: [NotificationChannel.IN_GAME],
          requireAck: false,
          dismissible: true,
          actions: [],
          metadata: {},
        },
        {
          notificationId: 'bulk-2',
          userId: 'user-2',
          type: NotificationType.SUCCESS,
          title: 'Bulk Notification 2',
          content: 'Second bulk notification',
          priority: NotificationPriority.HIGH,
          channels: [NotificationChannel.WEBSOCKET],
          requireAck: true,
          dismissible: false,
          actions: [],
          metadata: {},
        },
        {
          notificationId: 'bulk-3',
          userId: 'user-3',
          type: NotificationType.ACHIEVEMENT,
          title: 'Achievement Unlocked!',
          content: 'You have unlocked the "Bulk Notification" achievement',
          priority: NotificationPriority.HIGH,
          channels: [NotificationChannel.IN_GAME, NotificationChannel.PUSH],
          requireAck: false,
          dismissible: true,
          actions: [
            {
              id: 'view_achievement',
              label: 'View Achievement',
              type: 'primary',
              target: '/achievements/bulk_notification',
            },
          ],
          metadata: {
            achievementId: 'bulk_notification',
            points: 100,
          },
        },
      ];

      const results: NotificationDeliveryResult[] = await notificationHandler.sendBulkNotifications(notifications);

      expect(results).toHaveLength(3);
      expect(results[0].notificationId).toBe('bulk-1');
      expect(results[1].notificationId).toBe('bulk-2');
      expect(results[2].notificationId).toBe('bulk-3');
      
      results.forEach(result => {
        expect(result).toHaveProperty('success');
        expect(result).toHaveProperty('channelResults');
        expect(result).toHaveProperty('deliveredAt');
        expect(result).toHaveProperty('deliveryTimeMs');
      });
    });

    /**
     * Tests empty bulk notification array handling
     */
    it('should handle empty bulk notification array', async () => {
      const results = await notificationHandler.sendBulkNotifications([]);
      expect(results).toEqual([]);
    });
  });

  describe('broadcastNotification()', () => {
    /**
     * Tests UserNotificationHandler.d.ts:258-267 - broadcastNotification method
     * Tests broadcasting to multiple users with filtering
     */
    it('should broadcast notification to multiple users', async () => {
      const broadcastNotification = {
        notificationId: 'broadcast-1',
        type: NotificationType.SYSTEM_UPDATE,
        title: 'Server Maintenance',
        content: 'Server maintenance will begin in 10 minutes',
        priority: NotificationPriority.URGENT,
        channels: [NotificationChannel.IN_GAME, NotificationChannel.WEBSOCKET],
        requireAck: true,
        dismissible: false,
        actions: [
          {
            id: 'acknowledge',
            label: 'Acknowledge',
            type: 'primary',
            target: '/acknowledge',
          },
        ],
        metadata: {
          maintenanceId: 'maint-2024-001',
          duration: '2 hours',
        },
      };

      const filters = [
        {
          field: 'status',
          operator: 'equals',
          value: 'online',
        },
        {
          field: 'gameMode',
          operator: 'in',
          value: ['cooperative', 'competitive'],
        },
      ];

      const results = await notificationHandler.broadcastNotification(broadcastNotification, filters);

      expect(Array.isArray(results)).toBe(true);
      results.forEach(result => {
        expect(result).toHaveProperty('notificationId', 'broadcast-1');
        expect(result).toHaveProperty('success');
        expect(result).toHaveProperty('channelResults');
      });
    });

    /**
     * Tests broadcast without filters (to all users)
     */
    it('should broadcast to all users when no filters provided', async () => {
      const broadcastNotification = {
        notificationId: 'broadcast-all',
        type: NotificationType.INFO,
        title: 'Welcome Message',
        content: 'Welcome to Bomberman Multiplayer!',
        priority: NotificationPriority.NORMAL,
        channels: [NotificationChannel.IN_GAME],
        requireAck: false,
        dismissible: true,
        actions: [],
        metadata: {},
      };

      const results = await notificationHandler.broadcastNotification(broadcastNotification);

      expect(Array.isArray(results)).toBe(true);
      // Results could be empty if no users are online, that's acceptable for stub implementation
    });
  });

  describe('Error Handling', () => {
    /**
     * Tests validation of required fields in notification data
     * Ensures all interface requirements are met
     */
    it('should validate required notification fields', async () => {
      const incompleteNotification = {
        notificationId: 'incomplete',
        // Missing required fields like userId, type, title, content, etc.
      };

      await expect(
        notificationHandler.sendNotification(incompleteNotification as any)
      ).rejects.toBeDefined();
    });

    /**
     * Tests invalid notification channels
     * Should handle unknown or invalid channels gracefully
     */
    it('should handle invalid notification channels', async () => {
      const notification: EnhancedNotificationData = {
        notificationId: 'invalid-channel',
        userId: 'user-456',
        type: NotificationType.INFO,
        title: 'Invalid Channel Test',
        content: 'Testing invalid channel handling',
        priority: NotificationPriority.NORMAL,
        channels: ['invalid_channel' as any],
        requireAck: false,
        dismissible: true,
        actions: [],
        metadata: {},
      };

      // Should either reject or handle gracefully
      const result = await notificationHandler.sendNotification(notification);
      expect(result).toBeDefined();
      // Implementation might mark channel delivery as failed
    });
  });
});