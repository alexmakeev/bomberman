/**
 * LoggingService Unit Tests - Initialization
 * Tests basic LoggingService initialization and configuration
 */

import { createLoggingService } from '../../src/modules/LoggingService';
import { EventBusImpl } from '../../src/modules/EventBusImpl';
import type { EventBus, EventBusConfig } from '../../src/interfaces/core/EventBus';
import { EventCategory, EventPriority, DeliveryMode } from '../../src/types/events.d.ts';

describe('LoggingService - Initialization', () => {
  let eventBus: EventBus;
  let mockConfig: EventBusConfig;

  beforeEach(async () => {
    eventBus = new EventBusImpl();
    mockConfig = {
      redisUrl: 'redis://localhost:6379',
      postgresUrl: 'postgresql://localhost:5432/bomberman',
      eventCategories: [
        EventCategory.GAME_STATE,
        EventCategory.PLAYER_ACTION,
        EventCategory.SYSTEM_STATUS
      ],
      rateLimiting: {
        enabled: true,
        maxEventsPerSecond: 100,
        burstLimit: 500,
      },
      middleware: {
        enabled: true,
        logEvents: true,
        validateEvents: true,
      },
      persistence: {
        enabled: true,
        retentionDays: 30,
      },
    };
    await eventBus.initialize(mockConfig);
  });

  afterEach(async () => {
    await eventBus.shutdown();
  });

  describe('Constructor', () => {
    it('should create LoggingService instance', () => {
      const loggingService = createLoggingService(eventBus);
      
      expect(loggingService).toBeDefined();
      expect(loggingService.eventBus).toBe(eventBus);
    });

    it('should have eventBus property accessible', () => {
      const loggingService = createLoggingService(eventBus);
      
      expect(loggingService).toHaveProperty('eventBus');
      expect(loggingService.eventBus).toBeInstanceOf(EventBusImpl);
    });
  });

  describe('Interface Compliance', () => {
    it('should implement all required methods', () => {
      const loggingService = createLoggingService(eventBus);
      
      // Core methods
      expect(typeof loggingService.initialize).toBe('function');
    });

    it('should have async methods that return Promises', async () => {
      const loggingService = createLoggingService(eventBus);
      
      const initializeResult = loggingService.initialize();
      expect(initializeResult).toBeInstanceOf(Promise);
      await initializeResult;
    });
  });

  describe('initialize()', () => {
    it('should initialize successfully', async () => {
      const loggingService = createLoggingService(eventBus);
      
      await expect(loggingService.initialize()).resolves.toBeUndefined();
    });

    it('should handle multiple initializations gracefully', async () => {
      const loggingService = createLoggingService(eventBus);
      
      await loggingService.initialize();
      await expect(loggingService.initialize()).resolves.toBeUndefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle operations with uninitialized LoggingService', async () => {
      const loggingService = createLoggingService(eventBus);
      
      // Should still work without initialization for now (stub implementation)
      await expect(loggingService.initialize()).resolves.toBeUndefined();
    });

    it('should handle creation without eventBus gracefully', () => {
      // Test that it handles null/undefined eventBus
      expect(() => createLoggingService(null as any)).not.toThrow();
      expect(() => createLoggingService(undefined as any)).not.toThrow();
    });
  });

  describe('Integration with EventBus', () => {
    it('should maintain reference to eventBus', async () => {
      const loggingService = createLoggingService(eventBus);
      
      expect(loggingService.eventBus).toBe(eventBus);
      expect(loggingService.eventBus.getStatus().running).toBe(true);
    });

    it('should work with different eventBus instances', async () => {
      const eventBus2 = new EventBusImpl();
      await eventBus2.initialize(mockConfig);
      
      const loggingService1 = createLoggingService(eventBus);
      const loggingService2 = createLoggingService(eventBus2);
      
      expect(loggingService1.eventBus).toBe(eventBus);
      expect(loggingService2.eventBus).toBe(eventBus2);
      expect(loggingService1.eventBus).not.toBe(loggingService2.eventBus);
      
      await eventBus2.shutdown();
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle multiple concurrent initializations', async () => {
      const loggingService = createLoggingService(eventBus);
      
      const promises = Array.from({ length: 5 }, () => loggingService.initialize());
      await expect(Promise.all(promises)).resolves.toEqual([undefined, undefined, undefined, undefined, undefined]);
    });

    it('should handle multiple service instances with same eventBus', async () => {
      const services = Array.from({ length: 3 }, () => createLoggingService(eventBus));
      
      const initPromises = services.map(service => service.initialize());
      await expect(Promise.all(initPromises)).resolves.toEqual([undefined, undefined, undefined]);
      
      // All should share the same eventBus
      services.forEach(service => {
        expect(service.eventBus).toBe(eventBus);
      });
    });
  });

  describe('Service Lifecycle', () => {
    it('should maintain consistent state after initialization', async () => {
      const loggingService = createLoggingService(eventBus);
      
      // Verify initial state
      expect(loggingService.eventBus).toBe(eventBus);
      
      // Initialize
      await loggingService.initialize();
      
      // Verify state after initialization
      expect(loggingService.eventBus).toBe(eventBus);
      expect(loggingService.eventBus.getStatus().running).toBe(true);
    });

    it('should handle service creation with various eventBus states', async () => {
      // Create service with running eventBus
      const loggingService1 = createLoggingService(eventBus);
      expect(loggingService1.eventBus.getStatus().running).toBe(true);
      
      // Create service with stopped eventBus
      await eventBus.shutdown();
      const loggingService2 = createLoggingService(eventBus);
      expect(loggingService2.eventBus.getStatus().running).toBe(false);
      
      // Both should reference the same eventBus instance
      expect(loggingService1.eventBus).toBe(loggingService2.eventBus);
    });
  });

  describe('Resource Management', () => {
    it('should handle rapid service creation and initialization', async () => {
      const services = Array.from({ length: 10 }, () => createLoggingService(eventBus));
      
      // Initialize all services concurrently
      const initPromises = services.map(service => service.initialize());
      await expect(Promise.all(initPromises)).resolves.toHaveLength(10);
      
      // Verify all services are properly initialized
      services.forEach(service => {
        expect(service.eventBus).toBe(eventBus);
      });
    });

    it('should handle service operations with eventBus state changes', async () => {
      const loggingService = createLoggingService(eventBus);
      
      // Initialize with running eventBus
      await loggingService.initialize();
      expect(loggingService.eventBus.getStatus().running).toBe(true);
      
      // Shutdown eventBus
      await eventBus.shutdown();
      expect(loggingService.eventBus.getStatus().running).toBe(false);
      
      // Restart eventBus
      await eventBus.initialize(mockConfig);
      expect(loggingService.eventBus.getStatus().running).toBe(true);
      
      // Service should continue to work
      await expect(loggingService.initialize()).resolves.toBeUndefined();
    });
  });
});