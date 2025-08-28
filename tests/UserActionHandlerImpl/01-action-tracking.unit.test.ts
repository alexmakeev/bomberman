/**
 * UserActionHandlerImpl Unit Tests - Action Tracking
 * Tests core action tracking functionality
 * 
 * Documentation References:
 * - src/interfaces/specialized/UserActionHandler.d.ts:341-344 (UserActionHandler interface)
 * - src/interfaces/specialized/UserActionHandler.d.ts:345-396 (Action Tracking Methods)
 * - src/interfaces/specialized/UserActionHandler.d.ts:89-108 (EnhancedUserActionData interface)
 * - src/interfaces/specialized/UserActionHandler.d.ts:18-73 (UserActionType enum)
 * - src/interfaces/specialized/UserActionHandler.d.ts:78-86 (ActionResult enum)
 */

import { UserActionHandlerImpl } from '../../src/modules/UserActionHandlerImpl';
import { EventBusImpl } from '../../src/modules/EventBusImpl';
import type { 
  UserActionHandler, 
  EnhancedUserActionData
} from '../../src/interfaces/specialized/UserActionHandler';
import { 
  UserActionType, 
  ActionResult 
} from '../../src/interfaces/specialized/UserActionHandler.d.ts';
import type { EventBus, EventBusConfig, EventPublishResult } from '../../src/interfaces/core/EventBus';

describe('UserActionHandlerImpl - Action Tracking', () => {
  let eventBus: EventBus;
  let actionHandler: UserActionHandler;
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
    actionHandler = new UserActionHandlerImpl(eventBus);
  });

  afterEach(async () => {
    if (eventBus) {
      await eventBus.shutdown();
    }
  });

  describe('Constructor and Interface Compliance', () => {
    /**
     * Tests interface requirement from UserActionHandler.d.ts:341-344
     * UserActionHandler must have readonly eventBus property
     */
    it('should create UserActionHandler instance with eventBus reference', () => {
      expect(actionHandler).toBeInstanceOf(UserActionHandlerImpl);
      expect(actionHandler).toBeDefined();
      expect(actionHandler.eventBus).toBe(eventBus);
    });

    /**
     * Tests all required action tracking methods exist from UserActionHandler.d.ts:345-396
     */
    it('should implement all action tracking methods', () => {
      expect(typeof actionHandler.trackAction).toBe('function');
      expect(typeof actionHandler.trackActionBatch).toBe('function');
      expect(typeof actionHandler.trackUserAction).toBe('function');
      expect(typeof actionHandler.startActionTimer).toBe('function');
      expect(typeof actionHandler.endActionTimer).toBe('function');
    });

    /**
     * Tests that async methods return Promises as specified in interface
     */
    it('should have async methods that return Promises', () => {
      const mockActionData: EnhancedUserActionData = {
        actionId: 'action-1',
        userId: 'user-1',
        actionType: 'login' as UserActionType,
        payload: { username: 'test' },
        result: ActionResult.SUCCESS,
        context: {
          sessionId: 'session-1',
          deviceInfo: { platform: 'web' },
          metadata: {},
        },
        tags: ['authentication'],
      };

      const trackResult = actionHandler.trackAction(mockActionData);
      expect(trackResult).toBeInstanceOf(Promise);

      const userActionResult = actionHandler.trackUserAction(
        'user-1', 
        UserActionType.LOGIN, 
        { username: 'test' }, 
        ActionResult.SUCCESS
      );
      expect(userActionResult).toBeInstanceOf(Promise);
    });
  });

  describe('trackAction()', () => {
    /**
     * Tests UserActionHandler.d.ts:347-352 - trackAction method
     * Tests EnhancedUserActionData interface from UserActionHandler.d.ts:89-108
     */
    it('should track action with complete data structure', async () => {
      const actionData: EnhancedUserActionData = {
        actionId: 'action-123',
        userId: 'user-456',
        actionType: UserActionType.GAME_JOIN,
        payload: {
          gameId: 'game-789',
          gameMode: 'cooperative',
          difficulty: 'normal',
        },
        result: ActionResult.SUCCESS,
        durationMs: 1500,
        context: {
          sessionId: 'session-abc',
          deviceInfo: {
            platform: 'web',
            browser: 'chrome',
            screenResolution: '1920x1080',
          },
          location: { x: 5, y: 3 },
          metadata: {
            serverRegion: 'us-east-1',
            latency: 45,
          },
        },
        tags: ['game', 'multiplayer', 'cooperative'],
        experiments: ['new_ui_v2', 'faster_matchmaking'],
        variants: {
          'ui_theme': 'dark',
          'matchmaking_algo': 'v2',
        },
      };

      const result: EventPublishResult = await actionHandler.trackAction(actionData);

      expect(result).toBeDefined();
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('eventId');
      expect(result).toHaveProperty('targetsReached');
      expect(result).toHaveProperty('metadata');
      expect(result.success).toBe(true);
    });

    /**
     * Tests different UserActionType enum values from UserActionHandler.d.ts:18-73
     */
    it('should handle all action types', async () => {
      const actionTypes = [
        UserActionType.LOGIN,
        UserActionType.GAME_JOIN,
        UserActionType.ROOM_CREATE,
        UserActionType.CHAT_MESSAGE,
        UserActionType.PREFERENCES_UPDATE,
        UserActionType.PURCHASE_ATTEMPT,
        UserActionType.FEATURE_USE,
        UserActionType.ERROR_REPORT,
      ];

      for (const actionType of actionTypes) {
        const actionData: EnhancedUserActionData = {
          actionId: `action-${actionType}`,
          userId: 'user-456',
          actionType,
          payload: { test: true },
          result: ActionResult.SUCCESS,
          context: {
            sessionId: 'session-1',
            deviceInfo: { platform: 'web' },
            metadata: {},
          },
          tags: [actionType],
        };

        const result = await actionHandler.trackAction(actionData);
        expect(result.success).toBe(true);
      }
    });

    /**
     * Tests different ActionResult enum values from UserActionHandler.d.ts:78-86
     */
    it('should handle all action results', async () => {
      const actionResults = [
        ActionResult.SUCCESS,
        ActionResult.FAILURE,
        ActionResult.PARTIAL,
        ActionResult.CANCELLED,
        ActionResult.TIMEOUT,
        ActionResult.UNAUTHORIZED,
        ActionResult.INVALID,
      ];

      for (const result of actionResults) {
        const actionData: EnhancedUserActionData = {
          actionId: `action-result-${result}`,
          userId: 'user-456',
          actionType: UserActionType.GAME_ACTION,
          payload: { action: 'test' },
          result,
          context: {
            sessionId: 'session-1',
            deviceInfo: { platform: 'web' },
            metadata: {},
          },
          tags: ['test'],
        };

        const trackResult = await actionHandler.trackAction(actionData);
        expect(trackResult.success).toBe(true);
      }
    });

    /**
     * Tests action error tracking
     * ActionError interface from UserActionHandler.d.ts:111-122
     */
    it('should track actions with errors', async () => {
      const actionData: EnhancedUserActionData = {
        actionId: 'action-error',
        userId: 'user-456',
        actionType: UserActionType.PURCHASE_ATTEMPT,
        payload: { itemId: 'premium-skin', price: 9.99 },
        result: ActionResult.FAILURE,
        error: {
          code: 'PAYMENT_FAILED',
          message: 'Credit card declined',
          stack: 'Error: Payment failed at...',
          context: {
            errorId: 'err-123',
            paymentProvider: 'stripe',
            cardType: 'visa',
          },
        },
        context: {
          sessionId: 'session-1',
          deviceInfo: { platform: 'web' },
          metadata: {},
        },
        tags: ['purchase', 'error'],
      };

      const result = await actionHandler.trackAction(actionData);
      expect(result.success).toBe(true);
    });
  });

  describe('trackActionBatch()', () => {
    /**
     * Tests UserActionHandler.d.ts:354-359 - trackActionBatch method
     */
    it('should track multiple actions in batch', async () => {
      const actions: EnhancedUserActionData[] = [
        {
          actionId: 'batch-1',
          userId: 'user-1',
          actionType: UserActionType.PAGE_VIEW,
          payload: { page: '/lobby' },
          result: ActionResult.SUCCESS,
          context: {
            sessionId: 'session-1',
            deviceInfo: { platform: 'web' },
            metadata: {},
          },
          tags: ['navigation'],
        },
        {
          actionId: 'batch-2',
          userId: 'user-1',
          actionType: UserActionType.MENU_INTERACTION,
          payload: { menu: 'main', item: 'play' },
          result: ActionResult.SUCCESS,
          durationMs: 250,
          context: {
            sessionId: 'session-1',
            deviceInfo: { platform: 'web' },
            metadata: {},
          },
          tags: ['ui', 'interaction'],
        },
        {
          actionId: 'batch-3',
          userId: 'user-1',
          actionType: UserActionType.ROOM_JOIN,
          payload: { roomId: 'room-123' },
          result: ActionResult.SUCCESS,
          durationMs: 800,
          context: {
            sessionId: 'session-1',
            deviceInfo: { platform: 'web' },
            metadata: {},
          },
          tags: ['room', 'multiplayer'],
        },
      ];

      const results: EventPublishResult[] = await actionHandler.trackActionBatch(actions);

      expect(results).toHaveLength(3);
      results.forEach((result, index) => {
        expect(result.success).toBe(true);
        expect(result.eventId).toBeDefined();
      });
    });

    /**
     * Tests empty batch handling
     */
    it('should handle empty batch gracefully', async () => {
      const results = await actionHandler.trackActionBatch([]);
      expect(results).toEqual([]);
    });
  });

  describe('trackUserAction()', () => {
    /**
     * Tests UserActionHandler.d.ts:361-374 - trackUserAction convenience method
     */
    it('should track action with automatic context capture', async () => {
      const result = await actionHandler.trackUserAction(
        'user-789',
        UserActionType.FRIEND_REQUEST,
        { targetUserId: 'user-456', message: 'Want to play together?' },
        ActionResult.SUCCESS
      );

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.eventId).toBeDefined();
    });

    /**
     * Tests tracking various social actions
     */
    it('should handle social action tracking', async () => {
      const socialActions = [
        {
          actionType: UserActionType.FRIEND_REQUEST,
          payload: { targetUserId: 'user-2' },
        },
        {
          actionType: UserActionType.FRIEND_ACCEPT,
          payload: { friendUserId: 'user-3' },
        },
        {
          actionType: UserActionType.CHAT_MESSAGE,
          payload: { message: 'Hello!', channel: 'game' },
        },
        {
          actionType: UserActionType.PLAYER_REPORT,
          payload: { reportedUserId: 'user-4', reason: 'cheating' },
        },
      ];

      for (const { actionType, payload } of socialActions) {
        const result = await actionHandler.trackUserAction(
          'user-1',
          actionType,
          payload,
          ActionResult.SUCCESS
        );
        expect(result.success).toBe(true);
      }
    });
  });

  describe('Action Timing', () => {
    /**
     * Tests UserActionHandler.d.ts:376-395 - Action timing methods
     * Tests startActionTimer and endActionTimer methods
     */
    it('should track action duration with timer', async () => {
      const timerId = actionHandler.startActionTimer('user-123', UserActionType.TUTORIAL_STEP);
      
      expect(timerId).toBeDefined();
      expect(typeof timerId).toBe('string');
      expect(timerId.length).toBeGreaterThan(0);

      // Simulate some time passing
      await new Promise(resolve => setTimeout(resolve, 10));

      const result = await actionHandler.endActionTimer(
        timerId,
        { step: 1, completed: true },
        ActionResult.SUCCESS
      );

      expect(result.success).toBe(true);
    });

    /**
     * Tests multiple concurrent timers
     */
    it('should handle multiple concurrent action timers', async () => {
      const timer1 = actionHandler.startActionTimer('user-1', UserActionType.GAME_ACTION);
      const timer2 = actionHandler.startActionTimer('user-2', UserActionType.INPUT_ACTION);
      const timer3 = actionHandler.startActionTimer('user-1', UserActionType.FEATURE_USE);

      expect(timer1).not.toBe(timer2);
      expect(timer1).not.toBe(timer3);
      expect(timer2).not.toBe(timer3);

      const result1 = await actionHandler.endActionTimer(timer1, { action: 'bomb_place' }, ActionResult.SUCCESS);
      const result2 = await actionHandler.endActionTimer(timer2, { input: 'arrow_key' }, ActionResult.SUCCESS);
      const result3 = await actionHandler.endActionTimer(timer3, { feature: 'minimap' }, ActionResult.SUCCESS);

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      expect(result3.success).toBe(true);
    });

    /**
     * Tests timer with failure result
     */
    it('should handle failed action timing', async () => {
      const timerId = actionHandler.startActionTimer('user-123', UserActionType.PURCHASE_COMPLETE);
      
      const result = await actionHandler.endActionTimer(
        timerId,
        { itemId: 'premium-character', error: 'insufficient_funds' },
        ActionResult.FAILURE
      );

      expect(result.success).toBe(true); // Tracking should succeed even if the action failed
    });
  });

  describe('Error Handling', () => {
    /**
     * Tests validation of required fields in action data
     */
    it('should validate required action fields', async () => {
      const incompleteAction = {
        actionId: 'incomplete',
        // Missing required fields like userId, actionType, etc.
      };

      await expect(
        actionHandler.trackAction(incompleteAction as any)
      ).rejects.toBeDefined();
    });

    /**
     * Tests handling of invalid timer IDs
     */
    it('should handle invalid timer IDs gracefully', async () => {
      await expect(
        actionHandler.endActionTimer('invalid-timer-id', {}, ActionResult.SUCCESS)
      ).rejects.toBeDefined();
    });

    /**
     * Tests null/undefined parameter handling
     */
    it('should handle null/undefined parameters gracefully', async () => {
      await expect(
        actionHandler.trackAction(null as any)
      ).rejects.toBeDefined();

      await expect(
        actionHandler.trackUserAction(null as any, UserActionType.LOGIN, {}, ActionResult.SUCCESS)
      ).rejects.toBeDefined();
    });
  });
});