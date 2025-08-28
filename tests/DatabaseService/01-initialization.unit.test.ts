/**
 * DatabaseService Unit Tests - Initialization
 * Tests basic DatabaseService initialization and configuration
 */

import { createDatabaseService } from '../../src/modules/DatabaseService';
import { EventBusImpl } from '../../src/modules/EventBusImpl';
import type { EventBus, EventBusConfig } from '../../src/interfaces/core/EventBus';
import { EventCategory, EventPriority, DeliveryMode } from '../../src/types/events.d.ts';

describe('DatabaseService - Initialization', () => {
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
    it('should create DatabaseService instance', () => {
      const databaseService = createDatabaseService(eventBus);
      
      expect(databaseService).toBeDefined();
      expect(databaseService.eventBus).toBe(eventBus);
    });

    it('should have eventBus property accessible', () => {
      const databaseService = createDatabaseService(eventBus);
      
      expect(databaseService).toHaveProperty('eventBus');
      expect(databaseService.eventBus).toBeInstanceOf(EventBusImpl);
    });
  });

  describe('Interface Compliance', () => {
    it('should implement all required methods', () => {
      const databaseService = createDatabaseService(eventBus);
      
      // Core methods
      expect(typeof databaseService.initialize).toBe('function');
    });

    it('should have async methods that return Promises', async () => {
      const databaseService = createDatabaseService(eventBus);
      
      const initializeResult = databaseService.initialize();
      expect(initializeResult).toBeInstanceOf(Promise);
      await initializeResult;
    });
  });

  describe('initialize()', () => {
    it('should initialize successfully', async () => {
      const databaseService = createDatabaseService(eventBus);
      
      await expect(databaseService.initialize()).resolves.toBeUndefined();
    });

    it('should handle multiple initializations gracefully', async () => {
      const databaseService = createDatabaseService(eventBus);
      
      await databaseService.initialize();
      await expect(databaseService.initialize()).resolves.toBeUndefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle operations with uninitialized DatabaseService', async () => {
      const databaseService = createDatabaseService(eventBus);
      
      // Should still work without initialization for now (stub implementation)
      await expect(databaseService.initialize()).resolves.toBeUndefined();
    });

    it('should handle creation without eventBus gracefully', () => {
      // Test that it handles null/undefined eventBus
      expect(() => createDatabaseService(null as any)).not.toThrow();
      expect(() => createDatabaseService(undefined as any)).not.toThrow();
    });
  });

  describe('Integration with EventBus', () => {
    it('should maintain reference to eventBus', async () => {
      const databaseService = createDatabaseService(eventBus);
      
      expect(databaseService.eventBus).toBe(eventBus);
      expect(databaseService.eventBus.getStatus().running).toBe(true);
    });

    it('should work with different eventBus instances', async () => {
      const eventBus2 = new EventBusImpl();
      await eventBus2.initialize(mockConfig);
      
      const databaseService1 = createDatabaseService(eventBus);
      const databaseService2 = createDatabaseService(eventBus2);
      
      expect(databaseService1.eventBus).toBe(eventBus);
      expect(databaseService2.eventBus).toBe(eventBus2);
      expect(databaseService1.eventBus).not.toBe(databaseService2.eventBus);
      
      await eventBus2.shutdown();
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle multiple concurrent initializations', async () => {
      const databaseService = createDatabaseService(eventBus);
      
      const promises = Array.from({ length: 5 }, () => databaseService.initialize());
      await expect(Promise.all(promises)).resolves.toEqual([undefined, undefined, undefined, undefined, undefined]);
    });

    it('should handle multiple service instances with same eventBus', async () => {
      const services = Array.from({ length: 3 }, () => createDatabaseService(eventBus));
      
      const initPromises = services.map(service => service.initialize());
      await expect(Promise.all(initPromises)).resolves.toEqual([undefined, undefined, undefined]);
      
      // All should share the same eventBus
      services.forEach(service => {
        expect(service.eventBus).toBe(eventBus);
      });
    });
  });
});