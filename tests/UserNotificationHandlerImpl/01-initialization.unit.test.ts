/**
 * UserNotificationHandlerImpl Unit Tests - Initialization
 * Tests initialization and interface compliance
 * 
 * Documentation References:
 * - src/interfaces/specialized/UserNotificationHandler.d.ts:221-224 (UserNotificationHandler interface)
 * - src/interfaces/specialized/UserNotificationHandler.d.ts:559 (UserNotificationHandlerFactory)
 * - src/modules/UserNotificationHandlerImpl.ts (implementation)
 */

import { UserNotificationHandlerImpl } from '../../src/modules/UserNotificationHandlerImpl';
import { EventBusImpl } from '../../src/modules/EventBusImpl';
import type { UserNotificationHandler } from '../../src/interfaces/specialized/UserNotificationHandler';
import type { EventBus, EventBusConfig } from '../../src/interfaces/core/EventBus';

describe('UserNotificationHandlerImpl - Initialization', () => {
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

  describe('Constructor', () => {
    /**
     * Tests interface requirement from UserNotificationHandler.d.ts:221-224
     * UserNotificationHandler must have readonly eventBus property
     */
    it('should create UserNotificationHandler instance with eventBus reference', () => {
      expect(notificationHandler).toBeInstanceOf(UserNotificationHandlerImpl);
      expect(notificationHandler).toBeDefined();
      expect(notificationHandler.eventBus).toBe(eventBus);
    });

    /**
     * Tests that the eventBus property is readonly as specified in interface
     * UserNotificationHandler.d.ts:223 - readonly eventBus: EventBus
     */
    it('should have readonly eventBus property', () => {
      expect(notificationHandler.eventBus).toBeDefined();
      expect(notificationHandler.eventBus).toBeInstanceOf(EventBusImpl);
      
      // Verify it's the same reference passed in constructor
      expect(notificationHandler.eventBus).toBe(eventBus);
    });
  });

  describe('Interface Compliance', () => {
    /**
     * Tests all required methods exist as specified in UserNotificationHandler.d.ts
     * This ensures the implementation matches the interface definition
     */
    it('should implement all notification sending methods', () => {
      // Notification Sending Methods (UserNotificationHandler.d.ts:225-268)
      expect(typeof notificationHandler.sendNotification).toBe('function');
      expect(typeof notificationHandler.sendFromTemplate).toBe('function');
      expect(typeof notificationHandler.sendBulkNotifications).toBe('function');
      expect(typeof notificationHandler.broadcastNotification).toBe('function');
    });

    /**
     * Tests template management methods from UserNotificationHandler.d.ts:269-302
     */
    it('should implement all template management methods', () => {
      expect(typeof notificationHandler.createTemplate).toBe('function');
      expect(typeof notificationHandler.updateTemplate).toBe('function');
      expect(typeof notificationHandler.deleteTemplate).toBe('function');
      expect(typeof notificationHandler.getTemplates).toBe('function');
    });

    /**
     * Tests subscription management methods from UserNotificationHandler.d.ts:303-337
     */
    it('should implement all subscription management methods', () => {
      expect(typeof notificationHandler.subscribeToUserNotifications).toBe('function');
      expect(typeof notificationHandler.subscribeToDeliveryEvents).toBe('function');
      expect(typeof notificationHandler.subscribeToEntityNotifications).toBe('function');
    });

    /**
     * Tests user preference management methods from UserNotificationHandler.d.ts:338-364
     */
    it('should implement all user preference management methods', () => {
      expect(typeof notificationHandler.setUserPreferences).toBe('function');
      expect(typeof notificationHandler.getUserPreferences).toBe('function');
      expect(typeof notificationHandler.updateUserPreferences).toBe('function');
    });

    /**
     * Tests notification management methods from UserNotificationHandler.d.ts:365-414
     */
    it('should implement all notification management methods', () => {
      expect(typeof notificationHandler.markAsRead).toBe('function');
      expect(typeof notificationHandler.markManyAsRead).toBe('function');
      expect(typeof notificationHandler.dismissNotification).toBe('function');
      expect(typeof notificationHandler.getUnreadNotifications).toBe('function');
      expect(typeof notificationHandler.getNotificationHistory).toBe('function');
    });

    /**
     * Tests channel management methods from UserNotificationHandler.d.ts:415-441
     */
    it('should implement all channel management methods', () => {
      expect(typeof notificationHandler.registerChannel).toBe('function');
      expect(typeof notificationHandler.sendToChannel).toBe('function');
      expect(typeof notificationHandler.testChannel).toBe('function');
    });

    /**
     * Tests analytics and monitoring methods from UserNotificationHandler.d.ts:442-465
     */
    it('should implement all analytics and monitoring methods', () => {
      expect(typeof notificationHandler.getDeliveryStatistics).toBe('function');
      expect(typeof notificationHandler.getEngagementMetrics).toBe('function');
    });

    /**
     * Tests that async methods return Promises as specified in interface
     * All async methods in UserNotificationHandler.d.ts should return Promise<T>
     */
    it('should have async methods that return Promises', () => {
      const mockNotification = {
        notificationId: 'notif-1',
        userId: 'user-1',
        type: 'info' as const,
        title: 'Test',
        content: 'Test content',
        priority: 1 as const,
        channels: ['in_game' as const],
        requireAck: false,
        dismissible: true,
        actions: [],
        metadata: {},
      };

      // Test a few key methods return promises
      const sendResult = notificationHandler.sendNotification(mockNotification);
      expect(sendResult).toBeInstanceOf(Promise);

      const preferencesResult = notificationHandler.getUserPreferences('user-1');
      expect(preferencesResult).toBeInstanceOf(Promise);

      const templatesResult = notificationHandler.getTemplates();
      expect(templatesResult).toBeInstanceOf(Promise);
    });
  });

  describe('Error Handling', () => {
    /**
     * Tests behavior when EventBus is not properly initialized
     * Should handle gracefully per general error handling patterns
     */
    it('should handle operations with uninitialized EventBus', async () => {
      const uninitializedBus = new EventBusImpl();
      const uninitializedHandler = new UserNotificationHandlerImpl(uninitializedBus);

      const mockNotification = {
        notificationId: 'notif-1',
        userId: 'user-1',
        type: 'info' as const,
        title: 'Test',
        content: 'Test content',
        priority: 1 as const,
        channels: ['in_game' as const],
        requireAck: false,
        dismissible: true,
        actions: [],
        metadata: {},
      };

      // Should not throw during method calls, but might fail at EventBus level
      await expect(uninitializedHandler.sendNotification(mockNotification)).rejects.toBeDefined();
    });

    /**
     * Tests null/undefined parameter handling
     * Interface doesn't specify null handling, but good defensive programming
     */
    it('should handle null/undefined parameters gracefully', async () => {
      const nullData = null as any;
      const undefinedData = undefined as any;

      // These should either handle gracefully or throw meaningful errors
      await expect(notificationHandler.sendNotification(nullData)).rejects.toBeDefined();
      await expect(notificationHandler.sendNotification(undefinedData)).rejects.toBeDefined();
      await expect(notificationHandler.getUserPreferences(nullData)).rejects.toBeDefined();
    });
  });
});