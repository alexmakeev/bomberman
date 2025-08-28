/**
 * DatabaseService Unit Tests - PostgreSQL Operations
 * Tests all PostgreSQL database operations including CRUD and transactions
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createDatabaseService } from '../../src/modules/DatabaseService';
import type { DatabaseService, DatabaseConfig } from '../../src/interfaces/core/DatabaseService.d.ts';

describe('DatabaseService - PostgreSQL Operations', () => {
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
      await databaseService.shutdown();
    }
  });

  describe('Raw Query Operations', () => {
    it('should execute simple SELECT query', async () => {
      const result = await databaseService.query('SELECT 1 as test_value');
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data[0]).toEqual({ test_value: 1 });
      expect(result.rowCount).toBe(1);
      expect(result.executionTime).toBeGreaterThan(0);
    });

    it('should execute parameterized queries safely', async () => {
      const result = await databaseService.query(
        'SELECT $1::text as name, $2::int as age',
        ['John', 25]
      );
      
      expect(result.success).toBe(true);
      expect(result.data[0]).toEqual({ name: 'John', age: 25 });
    });

    it('should handle query errors gracefully', async () => {
      const result = await databaseService.query('SELECT * FROM non_existent_table');
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.data).toBeUndefined();
    });

    it('should measure query execution time', async () => {
      const result = await databaseService.query('SELECT pg_sleep(0.01)'); // 10ms delay
      
      expect(result.executionTime).toBeGreaterThan(10); // Should be at least 10ms
      expect(result.executionTime).toBeLessThan(1000); // Should be less than 1s
    });
  });

  describe('Insert Operations', () => {
    beforeEach(async () => {
      // Create test table
      await databaseService.query(`
        CREATE TABLE IF NOT EXISTS test_players (
          id SERIAL PRIMARY KEY,
          name VARCHAR(100) NOT NULL,
          score INTEGER DEFAULT 0,
          created_at TIMESTAMPTZ DEFAULT NOW()
        )
      `);
    });

    afterEach(async () => {
      // Clean up test table
      await databaseService.query('DROP TABLE IF EXISTS test_players');
    });

    it('should insert new record and return ID', async () => {
      const result = await databaseService.insert('test_players', {
        name: 'TestPlayer1',
        score: 100
      });
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.id).toBeDefined();
      expect(typeof result.data.id).toBe('string');
    });

    it('should handle insert with all field types', async () => {
      const testData = {
        name: 'CompletePlayer',
        score: 1500,
        created_at: new Date().toISOString()
      };

      const result = await databaseService.insert('test_players', testData);
      
      expect(result.success).toBe(true);
      expect(result.data.id).toBeDefined();
    });

    it('should handle insert errors (constraint violations)', async () => {
      // First insert
      await databaseService.insert('test_players', { name: 'Player1', score: 100 });
      
      // Try to insert invalid data (assuming name has unique constraint in future)
      const result = await databaseService.insert('test_players', {
        name: null // Should violate NOT NULL constraint
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Update Operations', () => {
    let testRecordId: string;

    beforeEach(async () => {
      await databaseService.query(`
        CREATE TABLE IF NOT EXISTS test_players (
          id SERIAL PRIMARY KEY,
          name VARCHAR(100) NOT NULL,
          score INTEGER DEFAULT 0,
          active BOOLEAN DEFAULT true
        )
      `);

      const insertResult = await databaseService.insert('test_players', {
        name: 'UpdateTestPlayer',
        score: 50
      });
      testRecordId = insertResult.data.id;
    });

    afterEach(async () => {
      await databaseService.query('DROP TABLE IF EXISTS test_players');
    });

    it('should update records by ID', async () => {
      const result = await databaseService.update(
        'test_players',
        { score: 200, name: 'UpdatedPlayer' },
        { id: testRecordId }
      );
      
      expect(result.success).toBe(true);
      expect(result.rowCount).toBe(1);
    });

    it('should update multiple records by condition', async () => {
      // Insert additional records
      await databaseService.insert('test_players', { name: 'Player2', score: 30 });
      await databaseService.insert('test_players', { name: 'Player3', score: 40 });

      const result = await databaseService.update(
        'test_players',
        { active: false },
        { score: { $lt: 100 } } // Update all players with score < 100
      );
      
      expect(result.success).toBe(true);
      expect(result.rowCount).toBeGreaterThan(0);
    });

    it('should handle update with no matching records', async () => {
      const result = await databaseService.update(
        'test_players',
        { score: 999 },
        { name: 'NonExistentPlayer' }
      );
      
      expect(result.success).toBe(true);
      expect(result.rowCount).toBe(0);
    });
  });

  describe('Delete Operations', () => {
    beforeEach(async () => {
      await databaseService.query(`
        CREATE TABLE IF NOT EXISTS test_players (
          id SERIAL PRIMARY KEY,
          name VARCHAR(100) NOT NULL,
          score INTEGER DEFAULT 0
        )
      `);

      // Insert test data
      await databaseService.insert('test_players', { name: 'DeleteTest1', score: 100 });
      await databaseService.insert('test_players', { name: 'DeleteTest2', score: 200 });
      await databaseService.insert('test_players', { name: 'KeepTest1', score: 300 });
    });

    afterEach(async () => {
      await databaseService.query('DROP TABLE IF EXISTS test_players');
    });

    it('should delete records by condition', async () => {
      const result = await databaseService.delete('test_players', {
        name: 'DeleteTest1'
      });
      
      expect(result.success).toBe(true);
      expect(result.rowCount).toBe(1);
    });

    it('should delete multiple records', async () => {
      const result = await databaseService.delete('test_players', {
        score: { $lt: 250 } // Delete players with score < 250
      });
      
      expect(result.success).toBe(true);
      expect(result.rowCount).toBe(2); // Should delete DeleteTest1 and DeleteTest2
    });

    it('should handle delete with no matching records', async () => {
      const result = await databaseService.delete('test_players', {
        name: 'NonExistentPlayer'
      });
      
      expect(result.success).toBe(true);
      expect(result.rowCount).toBe(0);
    });
  });

  describe('Select Operations', () => {
    beforeEach(async () => {
      await databaseService.query(`
        CREATE TABLE IF NOT EXISTS test_players (
          id SERIAL PRIMARY KEY,
          name VARCHAR(100) NOT NULL,
          score INTEGER DEFAULT 0,
          level INTEGER DEFAULT 1,
          created_at TIMESTAMPTZ DEFAULT NOW()
        )
      `);

      // Insert test data
      for (let i = 1; i <= 10; i++) {
        await databaseService.insert('test_players', {
          name: `Player${i}`,
          score: i * 100,
          level: Math.ceil(i / 3)
        });
      }
    });

    afterEach(async () => {
      await databaseService.query('DROP TABLE IF EXISTS test_players');
    });

    it('should select all records', async () => {
      const result = await databaseService.select('test_players');
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data.length).toBe(10);
    });

    it('should select with WHERE conditions', async () => {
      const result = await databaseService.select('test_players', {
        where: { level: 2 }
      });
      
      expect(result.success).toBe(true);
      expect(result.data.length).toBe(3); // Players 4, 5, 6 should have level 2
    });

    it('should select with ORDER BY', async () => {
      const result = await databaseService.select('test_players', {
        orderBy: 'score DESC'
      });
      
      expect(result.success).toBe(true);
      expect(result.data[0].score).toBe(1000); // Player10 should be first
      expect(result.data[9].score).toBe(100);  // Player1 should be last
    });

    it('should select with LIMIT and OFFSET', async () => {
      const result = await databaseService.select('test_players', {
        orderBy: 'id ASC',
        limit: 3,
        offset: 5
      });
      
      expect(result.success).toBe(true);
      expect(result.data.length).toBe(3);
      expect(result.data[0].name).toBe('Player6'); // Should start from 6th record
    });

    it('should combine WHERE, ORDER BY, LIMIT, and OFFSET', async () => {
      const result = await databaseService.select('test_players', {
        where: { score: { $gte: 300 } }, // score >= 300
        orderBy: 'score ASC',
        limit: 2,
        offset: 1
      });
      
      expect(result.success).toBe(true);
      expect(result.data.length).toBe(2);
      expect(result.data[0].score).toBe(400); // Should be Player4 (second in filtered set)
    });
  });

  describe('Transaction Operations', () => {
    beforeEach(async () => {
      await databaseService.query(`
        CREATE TABLE IF NOT EXISTS test_accounts (
          id SERIAL PRIMARY KEY,
          name VARCHAR(100) NOT NULL,
          balance INTEGER DEFAULT 0
        )
      `);

      await databaseService.insert('test_accounts', { name: 'Account1', balance: 1000 });
      await databaseService.insert('test_accounts', { name: 'Account2', balance: 500 });
    });

    afterEach(async () => {
      await databaseService.query('DROP TABLE IF EXISTS test_accounts');
    });

    it('should execute successful transaction', async () => {
      const result = await databaseService.transaction(async (query) => {
        // Transfer 100 from Account1 to Account2
        await query('UPDATE test_accounts SET balance = balance - 100 WHERE name = $1', ['Account1']);
        await query('UPDATE test_accounts SET balance = balance + 100 WHERE name = $1', ['Account2']);
        
        return 'Transfer completed';
      });
      
      expect(result).toBe('Transfer completed');
      
      // Verify balances changed
      const account1 = await databaseService.select('test_accounts', { where: { name: 'Account1' } });
      const account2 = await databaseService.select('test_accounts', { where: { name: 'Account2' } });
      
      expect(account1.data[0].balance).toBe(900);
      expect(account2.data[0].balance).toBe(600);
    });

    it('should rollback failed transaction', async () => {
      await expect(databaseService.transaction(async (query) => {
        await query('UPDATE test_accounts SET balance = balance - 100 WHERE name = $1', ['Account1']);
        // This should cause a rollback
        throw new Error('Transaction failed');
      })).rejects.toThrow('Transaction failed');
      
      // Verify balances unchanged
      const account1 = await databaseService.select('test_accounts', { where: { name: 'Account1' } });
      expect(account1.data[0].balance).toBe(1000); // Should be unchanged
    });

    it('should handle nested transaction operations', async () => {
      const result = await databaseService.transaction(async (query) => {
        const result1 = await query('UPDATE test_accounts SET balance = balance - 50 WHERE name = $1', ['Account1']);
        const result2 = await query('UPDATE test_accounts SET balance = balance + 50 WHERE name = $1', ['Account2']);
        
        return { updated1: result1.rowCount, updated2: result2.rowCount };
      });
      
      expect(result.updated1).toBe(1);
      expect(result.updated2).toBe(1);
    });
  });
});