/**
 * DatabaseService Unit Tests - Redis Operations
 * Tests all Redis cache and pub/sub operations
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createDatabaseService } from '../../src/modules/DatabaseService';
import type { DatabaseService, DatabaseConfig } from '../../src/interfaces/core/DatabaseService.d.ts';

describe('DatabaseService - Redis Operations', () => {
  let databaseService: DatabaseService;
  let mockConfig: DatabaseConfig;

  beforeEach(async () => {
    mockConfig = {
      postgresql: {
        host: 'localhost',
        port: 5432,
        database: 'bomberman_test',
        username: 'test_user',
        password: 'test_pass',
        ssl: false,
        maxConnections: 10
      },
      redis: {
        host: 'localhost',
        port: 6379,
        password: 'redis_pass',
        database: 0,
        keyPrefix: 'bomberman:test:',
        cluster: false,
        ttl: 3600
      },
      connectionTimeout: 5000,
      retryAttempts: 3,
      poolSize: 10
    };

    databaseService = await createDatabaseService();
    await databaseService.initialize(mockConfig);
  });

  afterEach(async () => {
    if (databaseService) {
      // Clean up test keys
      await databaseService.clearAllCaches();
      await databaseService.shutdown();
    }
  });

  describe('Basic Cache Operations', () => {
    it('should set and get string values', async () => {
      const setResult = await databaseService.setCache('test:string', 'Hello World');
      expect(setResult.success).toBe(true);

      const getResult = await databaseService.getCache('test:string');
      expect(getResult.success).toBe(true);
      expect(getResult.data).toBe('Hello World');
      expect(getResult.exists).toBe(true);
    });

    it('should set and get object values', async () => {
      const testObject = { name: 'Player1', score: 1500, level: 5 };
      
      const setResult = await databaseService.setCache('test:object', testObject);
      expect(setResult.success).toBe(true);

      const getResult = await databaseService.getCache('test:object');
      expect(getResult.success).toBe(true);
      expect(getResult.data).toEqual(testObject);
    });

    it('should handle non-existent keys', async () => {
      const getResult = await databaseService.getCache('test:nonexistent');
      
      expect(getResult.success).toBe(true);
      expect(getResult.exists).toBe(false);
      expect(getResult.data).toBeUndefined();
    });

    it('should set values with TTL', async () => {
      const setResult = await databaseService.setCache('test:ttl', 'expires soon', 1); // 1 second TTL
      expect(setResult.success).toBe(true);

      // Should exist immediately
      const getResult1 = await databaseService.getCache('test:ttl');
      expect(getResult1.exists).toBe(true);
      expect(getResult1.data).toBe('expires soon');

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Should be expired
      const getResult2 = await databaseService.getCache('test:ttl');
      expect(getResult2.exists).toBe(false);
    });

    it('should check key existence', async () => {
      await databaseService.setCache('test:exists', 'value');

      const existsResult1 = await databaseService.existsCache('test:exists');
      expect(existsResult1.success).toBe(true);
      expect(existsResult1.data).toBe(true);

      const existsResult2 = await databaseService.existsCache('test:notexists');
      expect(existsResult2.success).toBe(true);
      expect(existsResult2.data).toBe(false);
    });

    it('should delete keys', async () => {
      await databaseService.setCache('test:delete', 'to be deleted');

      const deleteResult = await databaseService.deleteCache('test:delete');
      expect(deleteResult.success).toBe(true);

      const getResult = await databaseService.getCache('test:delete');
      expect(getResult.exists).toBe(false);
    });
  });

  describe('Batch Cache Operations', () => {
    it('should set multiple keys at once', async () => {
      const pairs = {
        'test:batch1': 'value1',
        'test:batch2': { score: 100 },
        'test:batch3': [1, 2, 3, 4, 5]
      };

      const setResult = await databaseService.setCacheBatch(pairs);
      expect(setResult.success).toBe(true);

      // Verify all keys were set
      for (const [key, expectedValue] of Object.entries(pairs)) {
        const getResult = await databaseService.getCache(key);
        expect(getResult.exists).toBe(true);
        expect(getResult.data).toEqual(expectedValue);
      }
    });

    it('should get multiple keys at once', async () => {
      // Set up test data
      await databaseService.setCache('test:multi1', 'value1');
      await databaseService.setCache('test:multi2', { type: 'object' });
      await databaseService.setCache('test:multi3', 123);

      const keys = ['test:multi1', 'test:multi2', 'test:multi3', 'test:nonexistent'];
      const getResult = await databaseService.getCacheBatch(keys);
      
      expect(getResult.success).toBe(true);
      expect(getResult.data).toEqual({
        'test:multi1': 'value1',
        'test:multi2': { type: 'object' },
        'test:multi3': 123,
        'test:nonexistent': undefined
      });
    });

    it('should set batch with TTL', async () => {
      const pairs = {
        'test:batch_ttl1': 'expires1',
        'test:batch_ttl2': 'expires2'
      };

      const setResult = await databaseService.setCacheBatch(pairs, 1); // 1 second TTL
      expect(setResult.success).toBe(true);

      // Should exist immediately
      const getResult1 = await databaseService.getCacheBatch(Object.keys(pairs));
      expect(getResult1.data['test:batch_ttl1']).toBe('expires1');
      expect(getResult1.data['test:batch_ttl2']).toBe('expires2');

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Should be expired
      const getResult2 = await databaseService.getCacheBatch(Object.keys(pairs));
      expect(getResult2.data['test:batch_ttl1']).toBeUndefined();
      expect(getResult2.data['test:batch_ttl2']).toBeUndefined();
    });
  });

  describe('Numeric Operations', () => {
    it('should increment numeric values', async () => {
      // Set initial value
      await databaseService.setCache('test:counter', 10);

      // Increment by 1 (default)
      const incResult1 = await databaseService.incrementCache('test:counter');
      expect(incResult1.success).toBe(true);
      expect(incResult1.data).toBe(11);

      // Increment by 5
      const incResult2 = await databaseService.incrementCache('test:counter', 5);
      expect(incResult2.success).toBe(true);
      expect(incResult2.data).toBe(16);

      // Verify final value
      const getResult = await databaseService.getCache('test:counter');
      expect(getResult.data).toBe(16);
    });

    it('should increment non-existent key (start from 0)', async () => {
      const incResult = await databaseService.incrementCache('test:new_counter', 3);
      
      expect(incResult.success).toBe(true);
      expect(incResult.data).toBe(3);
    });

    it('should handle negative increments (decrement)', async () => {
      await databaseService.setCache('test:decrement', 100);

      const decResult = await databaseService.incrementCache('test:decrement', -25);
      expect(decResult.success).toBe(true);
      expect(decResult.data).toBe(75);
    });
  });

  describe('Expiration Management', () => {
    it('should set expiration on existing key', async () => {
      await databaseService.setCache('test:expire_later', 'persistent value');

      const expireResult = await databaseService.expireCache('test:expire_later', 1);
      expect(expireResult.success).toBe(true);

      // Should exist immediately
      const getResult1 = await databaseService.getCache('test:expire_later');
      expect(getResult1.exists).toBe(true);

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Should be expired
      const getResult2 = await databaseService.getCache('test:expire_later');
      expect(getResult2.exists).toBe(false);
    });

    it('should handle expiration on non-existent key', async () => {
      const expireResult = await databaseService.expireCache('test:nonexistent', 10);
      expect(expireResult.success).toBe(true); // Should not fail
    });
  });

  describe('Pub/Sub Operations', () => {
    it('should publish and subscribe to channels', async (context) => {
      const receivedMessages: any[] = [];
      const testMessage = { type: 'test', data: 'Hello PubSub' };

      // Set up subscription
      const subscribeResult = await databaseService.subscribe('test:channel', (message) => {
        receivedMessages.push(message);
      });
      expect(subscribeResult.success).toBe(true);

      // Small delay to ensure subscription is active
      await new Promise(resolve => setTimeout(resolve, 10));

      // Publish message
      const publishResult = await databaseService.publish('test:channel', testMessage);
      expect(publishResult.success).toBe(true);
      expect(publishResult.data).toBe(1); // Should have 1 subscriber

      // Wait for message delivery
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(receivedMessages).toHaveLength(1);
      expect(receivedMessages[0]).toEqual(testMessage);

      // Clean up subscription
      await databaseService.unsubscribe('test:channel');
    });

    it('should handle multiple subscribers', async () => {
      const messages1: any[] = [];
      const messages2: any[] = [];
      const testMessage = 'broadcast message';

      // Set up multiple subscriptions
      await databaseService.subscribe('test:broadcast', (msg) => messages1.push(msg));
      await databaseService.subscribe('test:broadcast', (msg) => messages2.push(msg));

      await new Promise(resolve => setTimeout(resolve, 10));

      // Publish message
      const publishResult = await databaseService.publish('test:broadcast', testMessage);
      expect(publishResult.data).toBe(2); // Should have 2 subscribers

      await new Promise(resolve => setTimeout(resolve, 50));

      expect(messages1).toContain(testMessage);
      expect(messages2).toContain(testMessage);

      await databaseService.unsubscribe('test:broadcast');
    });

    it('should subscribe to patterns', async () => {
      const receivedMessages: Array<{ channel: string; message: any }> = [];

      // Subscribe to pattern
      const subscribeResult = await databaseService.subscribePattern('test:game:*', (channel, message) => {
        receivedMessages.push({ channel, message });
      });
      expect(subscribeResult.success).toBe(true);

      await new Promise(resolve => setTimeout(resolve, 10));

      // Publish to matching channels
      await databaseService.publish('test:game:room1', 'room1 message');
      await databaseService.publish('test:game:room2', 'room2 message');
      await databaseService.publish('test:other:channel', 'other message'); // Should not match

      await new Promise(resolve => setTimeout(resolve, 50));

      expect(receivedMessages).toHaveLength(2);
      expect(receivedMessages.some(m => m.channel === 'test:game:room1' && m.message === 'room1 message')).toBe(true);
      expect(receivedMessages.some(m => m.channel === 'test:game:room2' && m.message === 'room2 message')).toBe(true);
    });

    it('should unsubscribe from channels', async () => {
      const receivedMessages: any[] = [];

      await databaseService.subscribe('test:unsub', (msg) => receivedMessages.push(msg));
      await new Promise(resolve => setTimeout(resolve, 10));

      // Publish before unsubscribe
      await databaseService.publish('test:unsub', 'before unsub');
      await new Promise(resolve => setTimeout(resolve, 50));

      // Unsubscribe
      const unsubResult = await databaseService.unsubscribe('test:unsub');
      expect(unsubResult.success).toBe(true);
      await new Promise(resolve => setTimeout(resolve, 10));

      // Publish after unsubscribe
      await databaseService.publish('test:unsub', 'after unsub');
      await new Promise(resolve => setTimeout(resolve, 50));

      // Should only have received the first message
      expect(receivedMessages).toHaveLength(1);
      expect(receivedMessages[0]).toBe('before unsub');
    });
  });

  describe('Advanced Operations', () => {
    it('should execute Lua scripts', async () => {
      // Lua script to atomically increment and return previous value
      const script = `
        local current = redis.call('get', KEYS[1])
        if current == false then current = 0 else current = tonumber(current) end
        redis.call('set', KEYS[1], current + tonumber(ARGV[1]))
        return current
      `;

      // Set initial value
      await databaseService.setCache('test:lua_counter', 10);

      // Execute script
      const scriptResult = await databaseService.executeScript(script, ['test:lua_counter'], [5]);
      expect(scriptResult.success).toBe(true);
      expect(scriptResult.data).toBe(10); // Should return previous value (10)

      // Verify the counter was incremented
      const getResult = await databaseService.getCache('test:lua_counter');
      expect(getResult.data).toBe(15); // 10 + 5
    });

    it('should provide raw Redis connection for advanced operations', async () => {
      const redisConnection = await databaseService.getRedisConnection();
      expect(redisConnection).toBeDefined();
      expect(typeof redisConnection.get).toBe('function');
      expect(typeof redisConnection.set).toBe('function');
    });

    it('should provide PostgreSQL pool for advanced operations', async () => {
      const pgPool = await databaseService.getPostgreSQLPool();
      expect(pgPool).toBeDefined();
      expect(typeof pgPool.query).toBe('function');
    });
  });

  describe('Error Handling', () => {
    it('should handle Redis connection errors gracefully', async () => {
      // Simulate connection error by shutting down
      await databaseService.shutdown();

      const getResult = await databaseService.getCache('test:error');
      expect(getResult.success).toBe(false);
      expect(getResult.error).toBeDefined();
    });

    it('should handle invalid data serialization', async () => {
      // Try to store circular reference (should fail gracefully)
      const circularObj: any = { name: 'circular' };
      circularObj.self = circularObj;

      const setResult = await databaseService.setCache('test:circular', circularObj);
      expect(setResult.success).toBe(false);
      expect(setResult.error).toBeDefined();
    });

    it('should handle pub/sub errors gracefully', async () => {
      await databaseService.shutdown();

      const publishResult = await databaseService.publish('test:error', 'message');
      expect(publishResult.success).toBe(false);
      expect(publishResult.error).toBeDefined();
    });
  });

  describe('Performance and Monitoring', () => {
    it('should provide performance metrics', async () => {
      // Generate some activity
      await databaseService.setCache('test:perf1', 'value1');
      await databaseService.getCache('test:perf1');
      await databaseService.incrementCache('test:perf_counter');

      const metrics = await databaseService.getPerformanceMetrics();
      
      expect(metrics.redis).toBeDefined();
      expect(metrics.redis.commandsPerSecond).toBeGreaterThanOrEqual(0);
      expect(metrics.redis.averageLatency).toBeGreaterThanOrEqual(0);
      expect(metrics.redis.memoryUsage).toBeGreaterThan(0);
      expect(metrics.redis.connectedClients).toBeGreaterThanOrEqual(1);
    });

    it('should clear all caches when requested', async () => {
      // Set multiple test keys
      await databaseService.setCache('test:clear1', 'value1');
      await databaseService.setCache('test:clear2', 'value2');

      // Verify they exist
      const exists1 = await databaseService.existsCache('test:clear1');
      const exists2 = await databaseService.existsCache('test:clear2');
      expect(exists1.data).toBe(true);
      expect(exists2.data).toBe(true);

      // Clear all caches
      const clearResult = await databaseService.clearAllCaches();
      expect(clearResult.success).toBe(true);

      // Verify they're gone
      const exists1After = await databaseService.existsCache('test:clear1');
      const exists2After = await databaseService.existsCache('test:clear2');
      expect(exists1After.data).toBe(false);
      expect(exists2After.data).toBe(false);
    });
  });
});