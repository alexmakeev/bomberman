/**
 * EventBusImpl Unit Tests - Initialization
 * Tests basic EventBus initialization and configuration
 */

import { EventBusImpl } from '../../src/modules/EventBusImpl';
import type { EventBusConfig } from '../../src/interfaces/core/EventBus';
import { EventCategory, EventPriority, DeliveryMode } from '../../src/types/events';

describe('EventBusImpl - Initialization', () => {
  let eventBus: EventBusImpl;
  let mockConfig: EventBusConfig;

  beforeEach(() => {
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
  });

  afterEach(async () => {
    if (eventBus) {
      await eventBus.shutdown();
    }
  });

  describe('Constructor', () => {
    it('should create EventBusImpl instance', () => {
      expect(eventBus).toBeInstanceOf(EventBusImpl);
      expect(eventBus).toBeDefined();
    });

    it('should initialize with default state', () => {
      const status = eventBus.getStatus();
      expect(status.running).toBe(false);
      expect(status.activeSubscriptions).toBe(0);
    });
  });

  describe('initialize()', () => {
    it('should initialize successfully with valid config', async () => {
      await expect(eventBus.initialize(mockConfig)).resolves.not.toThrow();
      
      const status = eventBus.getStatus();
      expect(status.running).toBe(true);
    });

    it('should handle minimal config', async () => {
      const minimalConfig: EventBusConfig = {
        defaultTTL: 60000,
        maxEventSize: 1024,
        enablePersistence: false,
        enableTracing: false,
        defaultRetry: {
          maxAttempts: 1,
          baseDelayMs: 500,
          backoffMultiplier: 1,
          maxDelayMs: 500,
        },
        monitoring: {
          enableMetrics: false,
          metricsIntervalMs: 10000,
          enableSampling: false,
          samplingRate: 0,
          alertThresholds: {
            maxLatencyMs: 5000,
            maxErrorRate: 100,
            maxQueueDepth: 100,
            maxMemoryBytes: 100 * 1024 * 1024,
          },
        },
      };

      await expect(eventBus.initialize(minimalConfig)).resolves.not.toThrow();
    });
  });

  describe('shutdown()', () => {
    it('should shutdown gracefully when not initialized', async () => {
      await expect(eventBus.shutdown()).resolves.not.toThrow();
    });

    it('should shutdown gracefully after initialization', async () => {
      await eventBus.initialize(mockConfig);
      await expect(eventBus.shutdown()).resolves.not.toThrow();
      
      const status = eventBus.getStatus();
      expect(status.running).toBe(false);
    });
  });

  describe('getStatus()', () => {
    it('should return valid status when not running', () => {
      const status = eventBus.getStatus();
      
      expect(status).toHaveProperty('running');
      expect(status).toHaveProperty('activeSubscriptions');
      expect(status).toHaveProperty('eventsPerSecond');
      expect(status).toHaveProperty('queueDepth');
      expect(status).toHaveProperty('memoryUsage');
      expect(status).toHaveProperty('errorRate');
      
      expect(status.running).toBe(false);
      expect(status.activeSubscriptions).toBe(0);
    });

    it('should return valid status when running', async () => {
      await eventBus.initialize(mockConfig);
      const status = eventBus.getStatus();
      
      expect(status.running).toBe(true);
      expect(typeof status.activeSubscriptions).toBe('number');
      expect(typeof status.eventsPerSecond).toBe('number');
      expect(typeof status.queueDepth).toBe('number');
      expect(typeof status.memoryUsage).toBe('number');
      expect(typeof status.errorRate).toBe('number');
    });
  });

  describe('Error Handling', () => {
    it('should handle double initialization gracefully', async () => {
      await eventBus.initialize(mockConfig);
      
      // Second initialization should not throw
      await expect(eventBus.initialize(mockConfig)).resolves.not.toThrow();
    });

    it('should handle multiple shutdowns gracefully', async () => {
      await eventBus.initialize(mockConfig);
      await eventBus.shutdown();
      
      // Second shutdown should not throw
      await expect(eventBus.shutdown()).resolves.not.toThrow();
    });
  });
});