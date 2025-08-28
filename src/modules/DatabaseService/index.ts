/**
 * DatabaseService Implementation
 * PostgreSQL and Redis database access layer with comprehensive functionality
 */

import { Pool, PoolClient } from 'pg';
import Redis from 'ioredis';
import type { 
  CacheResult, 
  DatabaseConfig, 
  DatabaseService, 
  DatabaseStatus, 
  PostgreSQLConfig,
  QueryResult,
  RedisConfig, 
} from '../../interfaces/core/DatabaseService.d.ts';
import type { EntityId, Result } from '../../types/common';

/**
 * Complete DatabaseService implementation with PostgreSQL and Redis support
 */
class DatabaseServiceImpl implements DatabaseService {
  private pgPool?: Pool;
  private redisClient?: Redis;
  private redisSubscriber?: Redis;
  private config?: DatabaseConfig;
  private isInitialized = false;
  private startTime?: Date;
  private queryCount = 0;
  private errorCount = 0;
  private readonly subscriptions = new Map<string, Set<(message: any) => void>>();
  private readonly patternSubscriptions = new Map<string, Set<(channel: string, message: any) => void>>();

  constructor() {
    console.log('🗄️ DatabaseService created');
  }

  async initialize(config: DatabaseConfig): Promise<void> {
    if (this.isInitialized) {
      console.log('🗄️ DatabaseService already initialized');
      return;
    }

    this.config = config;
    this.startTime = new Date();

    try {
      // Validate configuration
      this.validateConfig(config);

      // Initialize PostgreSQL connection pool
      await this.initializePostgreSQL(config.postgresql);
      
      // Initialize Redis connections
      await this.initializeRedis(config.redis);

      this.isInitialized = true;
      console.log('🗄️ DatabaseService initialized successfully');
      
    } catch (error) {
      console.error('🗄️ DatabaseService initialization failed:', error);
      throw error;
    }
  }

  async shutdown(): Promise<void> {
    if (!this.isInitialized) {
      return;
    }

    try {
      // Close Redis connections
      if (this.redisClient) {
        await this.redisClient.quit();
        this.redisClient = undefined;
      }
      
      if (this.redisSubscriber) {
        await this.redisSubscriber.quit();
        this.redisSubscriber = undefined;
      }

      // Close PostgreSQL pool
      if (this.pgPool) {
        await this.pgPool.end();
        this.pgPool = undefined;
      }

      this.subscriptions.clear();
      this.patternSubscriptions.clear();
      this.isInitialized = false;
      
      console.log('🗄️ DatabaseService shutdown complete');
    } catch (error) {
      console.error('🗄️ DatabaseService shutdown error:', error);
      throw error;
    }
  }

  async getStatus(): Promise<DatabaseStatus> {
    const uptime = this.startTime ? Date.now() - this.startTime.getTime() : 0;
    
    const postgresql = await this.getPostgreSQLStatus();
    const redis = await this.getRedisStatus();

    return {
      postgresql,
      redis,
      uptime,
      totalQueries: this.queryCount,
      errorCount: this.errorCount,
    };
  }

  async healthCheck(): Promise<{ postgresql: boolean; redis: boolean }> {
    try {
      const [pgHealth, redisHealth] = await Promise.allSettled([
        this.testPostgreSQLConnection(),
        this.testRedisConnection(),
      ]);

      return {
        postgresql: pgHealth.status === 'fulfilled' && pgHealth.value,
        redis: redisHealth.status === 'fulfilled' && redisHealth.value,
      };
    } catch (error) {
      return { postgresql: false, redis: false };
    }
  }

  // PostgreSQL Operations

  async query<T = any>(sql: string, params?: any[]): Promise<QueryResult<T>> {
    const startTime = performance.now();
    
    if (!this.pgPool) {
      return {
        success: false,
        error: 'PostgreSQL not initialized',
        executionTime: 0,
      };
    }

    try {
      this.queryCount++;
      const result = await this.pgPool.query(sql, params);
      const executionTime = performance.now() - startTime;

      return {
        success: true,
        data: result.rows,
        rowCount: result.rowCount || 0,
        executionTime,
      };
    } catch (error) {
      this.errorCount++;
      const executionTime = performance.now() - startTime;
      
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        executionTime,
      };
    }
  }

  async transaction<T>(callback: (query: (sql: string, params?: any[]) => Promise<QueryResult>) => Promise<T>): Promise<T> {
    if (!this.pgPool) {
      throw new Error('PostgreSQL not initialized');
    }

    const client = await this.pgPool.connect();
    
    try {
      await client.query('BEGIN');
      
      const transactionQuery = async (sql: string, params?: any[]): Promise<QueryResult> => {
        const startTime = performance.now();
        try {
          this.queryCount++;
          const result = await client.query(sql, params);
          const executionTime = performance.now() - startTime;

          return {
            success: true,
            data: result.rows,
            rowCount: result.rowCount || 0,
            executionTime,
          };
        } catch (error) {
          this.errorCount++;
          const executionTime = performance.now() - startTime;
          throw error;
        }
      };

      const result = await callback(transactionQuery);
      await client.query('COMMIT');
      return result;
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async insert(table: string, data: Record<string, any>): Promise<QueryResult<{ id: EntityId }>> {
    const columns = Object.keys(data);
    const values = Object.values(data);
    const placeholders = values.map((_, index) => `$${index + 1}`).join(', ');
    
    const sql = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders}) RETURNING id`;
    
    try {
      const result = await this.query<{ id: string }>(sql, values);
      if (result.success && result.data && result.data.length > 0) {
        return {
          success: true,
          data: { id: result.data[0].id },
          rowCount: 1,
          executionTime: result.executionTime,
        };
      }
      
      return {
        success: false,
        error: 'Insert failed - no ID returned',
        executionTime: result.executionTime,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        executionTime: 0,
      };
    }
  }

  async update(table: string, data: Record<string, any>, where: Record<string, any>): Promise<QueryResult> {
    const setClause = Object.keys(data).map((key, index) => `${key} = $${index + 1}`).join(', ');
    const whereClause = this.buildWhereClause(where, Object.keys(data).length);
    
    const sql = `UPDATE ${table} SET ${setClause} WHERE ${whereClause.clause}`;
    const params = [...Object.values(data), ...whereClause.params];
    
    return this.query(sql, params);
  }

  async delete(table: string, where: Record<string, any>): Promise<QueryResult> {
    const whereClause = this.buildWhereClause(where);
    const sql = `DELETE FROM ${table} WHERE ${whereClause.clause}`;
    
    return this.query(sql, whereClause.params);
  }

  async select<T = any>(table: string, options?: {
    where?: Record<string, any>;
    orderBy?: string;
    limit?: number;
    offset?: number;
  }): Promise<QueryResult<T[]>> {
    let sql = `SELECT * FROM ${table}`;
    const params: any[] = [];
    let paramIndex = 0;

    if (options?.where) {
      const whereClause = this.buildWhereClause(options.where, paramIndex);
      sql += ` WHERE ${whereClause.clause}`;
      params.push(...whereClause.params);
      paramIndex += whereClause.params.length;
    }

    if (options?.orderBy) {
      sql += ` ORDER BY ${options.orderBy}`;
    }

    if (options?.limit) {
      paramIndex++;
      sql += ` LIMIT $${paramIndex}`;
      params.push(options.limit);
    }

    if (options?.offset) {
      paramIndex++;
      sql += ` OFFSET $${paramIndex}`;
      params.push(options.offset);
    }

    return this.query<T>(sql, params);
  }

  // Redis Operations

  async setCache(key: string, value: any, ttlSeconds?: number): Promise<CacheResult> {
    if (!this.redisClient) {
      return { success: false, error: 'Redis not initialized', exists: false };
    }

    try {
      const serializedValue = JSON.stringify(value);
      
      if (ttlSeconds) {
        await this.redisClient.setex(this.prefixKey(key), ttlSeconds, serializedValue);
      } else {
        await this.redisClient.set(this.prefixKey(key), serializedValue);
      }

      return { success: true, exists: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        exists: false,
      };
    }
  }

  async getCache<T = any>(key: string): Promise<CacheResult<T>> {
    if (!this.redisClient) {
      return { success: false, error: 'Redis not initialized', exists: false };
    }

    try {
      const value = await this.redisClient.get(this.prefixKey(key));
      
      if (value === null) {
        return { success: true, exists: false };
      }

      const data = JSON.parse(value);
      const ttl = await this.redisClient.ttl(this.prefixKey(key));
      
      return { 
        success: true, 
        exists: true, 
        data, 
        ttl: ttl > 0 ? ttl : undefined, 
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        exists: false,
      };
    }
  }

  async deleteCache(key: string): Promise<CacheResult> {
    if (!this.redisClient) {
      return { success: false, error: 'Redis not initialized', exists: false };
    }

    try {
      const result = await this.redisClient.del(this.prefixKey(key));
      return { success: true, exists: result > 0 };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        exists: false,
      };
    }
  }

  async existsCache(key: string): Promise<CacheResult<boolean>> {
    if (!this.redisClient) {
      return { success: false, error: 'Redis not initialized', exists: false };
    }

    try {
      const exists = await this.redisClient.exists(this.prefixKey(key));
      return { success: true, exists: true, data: exists > 0 };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        exists: false,
      };
    }
  }

  async setCacheBatch(pairs: Record<string, any>, ttlSeconds?: number): Promise<CacheResult> {
    if (!this.redisClient) {
      return { success: false, error: 'Redis not initialized', exists: false };
    }

    try {
      const pipeline = this.redisClient.pipeline();
      
      for (const [key, value] of Object.entries(pairs)) {
        const serializedValue = JSON.stringify(value);
        const prefixedKey = this.prefixKey(key);
        
        if (ttlSeconds) {
          pipeline.setex(prefixedKey, ttlSeconds, serializedValue);
        } else {
          pipeline.set(prefixedKey, serializedValue);
        }
      }

      await pipeline.exec();
      return { success: true, exists: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        exists: false,
      };
    }
  }

  async getCacheBatch<T = any>(keys: string[]): Promise<CacheResult<Record<string, T>>> {
    if (!this.redisClient) {
      return { success: false, error: 'Redis not initialized', exists: false };
    }

    try {
      const prefixedKeys = keys.map(key => this.prefixKey(key));
      const values = await this.redisClient.mget(...prefixedKeys);
      
      const result: Record<string, T> = {};
      
      for (let i = 0; i < keys.length; i++) {
        const originalKey = keys[i];
        const value = values[i];
        
        if (value !== null) {
          result[originalKey] = JSON.parse(value);
        } else {
          result[originalKey] = undefined as any;
        }
      }

      return { success: true, exists: true, data: result };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        exists: false,
      };
    }
  }

  async incrementCache(key: string, by: number = 1): Promise<CacheResult<number>> {
    if (!this.redisClient) {
      return { success: false, error: 'Redis not initialized', exists: false };
    }

    try {
      const result = await this.redisClient.incrby(this.prefixKey(key), by);
      return { success: true, exists: true, data: result };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        exists: false,
      };
    }
  }

  async expireCache(key: string, ttlSeconds: number): Promise<CacheResult> {
    if (!this.redisClient) {
      return { success: false, error: 'Redis not initialized', exists: false };
    }

    try {
      const result = await this.redisClient.expire(this.prefixKey(key), ttlSeconds);
      return { success: true, exists: result > 0 };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        exists: false,
      };
    }
  }

  // Redis Pub/Sub Operations

  async publish(channel: string, message: any): Promise<CacheResult<number>> {
    if (!this.redisClient) {
      return { success: false, error: 'Redis not initialized', exists: false };
    }

    try {
      const serializedMessage = JSON.stringify(message);
      const subscriberCount = await this.redisClient.publish(channel, serializedMessage);
      return { success: true, exists: true, data: subscriberCount };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        exists: false,
      };
    }
  }

  async subscribe(channel: string, callback: (message: any) => void): Promise<CacheResult> {
    if (!this.redisSubscriber) {
      return { success: false, error: 'Redis subscriber not initialized', exists: false };
    }

    try {
      if (!this.subscriptions.has(channel)) {
        this.subscriptions.set(channel, new Set());
        await this.redisSubscriber.subscribe(channel);
      }

      this.subscriptions.get(channel)!.add(callback);
      return { success: true, exists: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        exists: false,
      };
    }
  }

  async unsubscribe(channel: string): Promise<CacheResult> {
    if (!this.redisSubscriber) {
      return { success: false, error: 'Redis subscriber not initialized', exists: false };
    }

    try {
      if (this.subscriptions.has(channel)) {
        await this.redisSubscriber.unsubscribe(channel);
        this.subscriptions.delete(channel);
      }
      return { success: true, exists: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        exists: false,
      };
    }
  }

  async subscribePattern(pattern: string, callback: (channel: string, message: any) => void): Promise<CacheResult> {
    if (!this.redisSubscriber) {
      return { success: false, error: 'Redis subscriber not initialized', exists: false };
    }

    try {
      if (!this.patternSubscriptions.has(pattern)) {
        this.patternSubscriptions.set(pattern, new Set());
        await this.redisSubscriber.psubscribe(pattern);
      }

      this.patternSubscriptions.get(pattern)!.add(callback);
      return { success: true, exists: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        exists: false,
      };
    }
  }

  // Advanced Operations

  async executeScript(script: string, keys: string[], args: any[]): Promise<CacheResult> {
    if (!this.redisClient) {
      return { success: false, error: 'Redis not initialized', exists: false };
    }

    try {
      const prefixedKeys = keys.map(key => this.prefixKey(key));
      const result = await this.redisClient.eval(script, prefixedKeys.length, ...prefixedKeys, ...args);
      return { success: true, exists: true, data: result };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        exists: false,
      };
    }
  }

  async getRedisConnection(): Promise<Redis> {
    if (!this.redisClient) {
      throw new Error('Redis not initialized');
    }
    return this.redisClient;
  }

  async getPostgreSQLPool(): Promise<Pool> {
    if (!this.pgPool) {
      throw new Error('PostgreSQL not initialized');
    }
    return this.pgPool;
  }

  async getPerformanceMetrics(): Promise<{
    postgresql: {
      averageQueryTime: number;
      slowQueries: number;
      totalQueries: number;
      activeConnections: number;
    };
    redis: {
      averageLatency: number;
      commandsPerSecond: number;
      memoryUsage: number;
      connectedClients: number;
    };
  }> {
    try {
      const [pgMetrics, redisInfo] = await Promise.allSettled([
        this.getPostgreSQLMetrics(),
        this.getRedisMetrics(),
      ]);

      return {
        postgresql: pgMetrics.status === 'fulfilled' ? pgMetrics.value : {
          averageQueryTime: 0,
          slowQueries: 0,
          totalQueries: this.queryCount,
          activeConnections: 0,
        },
        redis: redisInfo.status === 'fulfilled' ? redisInfo.value : {
          averageLatency: 0,
          commandsPerSecond: 0,
          memoryUsage: 0,
          connectedClients: 0,
        },
      };
    } catch (error) {
      throw new Error(`Failed to get performance metrics: ${error}`);
    }
  }

  async clearAllCaches(): Promise<CacheResult> {
    if (!this.redisClient) {
      return { success: false, error: 'Redis not initialized', exists: false };
    }

    try {
      await this.redisClient.flushdb();
      return { success: true, exists: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        exists: false,
      };
    }
  }

  async backup(options?: { includeTables?: string[]; excludeTables?: string[] }): Promise<Result> {
    // This would typically use pg_dump or similar tools
    // For now, return a placeholder implementation
    return {
      success: true,
      message: 'Backup functionality not implemented yet',
    };
  }

  // Private helper methods

  private validateConfig(config: DatabaseConfig): void {
    // Validate PostgreSQL config
    if (!config.postgresql.host) {
      throw new Error('Invalid PostgreSQL host');
    }
    if (config.postgresql.port < 1 || config.postgresql.port > 65535) {
      throw new Error('Invalid PostgreSQL port');
    }
    if (!config.postgresql.database) {
      throw new Error('Invalid PostgreSQL database name');
    }

    // Validate Redis config
    if (!config.redis.host) {
      throw new Error('Invalid Redis host');
    }
    if (config.redis.port < 1 || config.redis.port > 65535) {
      throw new Error('Invalid Redis port');
    }
  }

  private async initializePostgreSQL(config: PostgreSQLConfig): Promise<void> {
    this.pgPool = new Pool({
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.username,
      password: config.password,
      ssl: config.ssl,
      max: config.maxConnections,
      connectionTimeoutMillis: this.config!.connectionTimeout,
      idleTimeoutMillis: 30000,
    });

    // Test connection
    const client = await this.pgPool.connect();
    client.release();
    
    console.log(`🐘 PostgreSQL connected to ${config.host}:${config.port}/${config.database}`);
  }

  private async initializeRedis(config: RedisConfig): Promise<void> {
    const redisOptions = {
      host: config.host,
      port: config.port,
      password: config.password,
      db: config.database,
      connectTimeout: this.config!.connectionTimeout,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: this.config!.retryAttempts,
      keyPrefix: config.keyPrefix,
    };

    // Main Redis client
    this.redisClient = new Redis(redisOptions);
    
    // Separate client for pub/sub operations
    this.redisSubscriber = new Redis(redisOptions);

    // Set up pub/sub message handlers
    this.redisSubscriber.on('message', (channel: string, message: string) => {
      const callbacks = this.subscriptions.get(channel);
      if (callbacks) {
        try {
          const parsedMessage = JSON.parse(message);
          callbacks.forEach(callback => callback(parsedMessage));
        } catch (error) {
          console.error('Error parsing pub/sub message:', error);
        }
      }
    });

    this.redisSubscriber.on('pmessage', (pattern: string, channel: string, message: string) => {
      const callbacks = this.patternSubscriptions.get(pattern);
      if (callbacks) {
        try {
          const parsedMessage = JSON.parse(message);
          callbacks.forEach(callback => callback(channel, parsedMessage));
        } catch (error) {
          console.error('Error parsing pattern pub/sub message:', error);
        }
      }
    });

    // Test connections
    await this.redisClient.ping();
    await this.redisSubscriber.ping();
    
    console.log(`🟥 Redis connected to ${config.host}:${config.port}/${config.database}`);
  }

  private async getPostgreSQLStatus() {
    if (!this.pgPool) {
      return { connected: false, latency: 0, connectionCount: 0 };
    }

    try {
      const startTime = performance.now();
      const result = await this.pgPool.query('SELECT 1');
      const latency = performance.now() - startTime;

      return {
        connected: true,
        latency,
        connectionCount: this.pgPool.totalCount,
        lastError: undefined,
      };
    } catch (error) {
      return {
        connected: false,
        latency: 0,
        connectionCount: 0,
        lastError: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private async getRedisStatus() {
    if (!this.redisClient) {
      return { connected: false, latency: 0, connectionCount: 0 };
    }

    try {
      const startTime = performance.now();
      await this.redisClient.ping();
      const latency = performance.now() - startTime;

      return {
        connected: true,
        latency,
        connectionCount: 1,
        lastError: undefined,
      };
    } catch (error) {
      return {
        connected: false,
        latency: 0,
        connectionCount: 0,
        lastError: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private async testPostgreSQLConnection(): Promise<boolean> {
    if (!this.pgPool) {return false;}
    try {
      const client = await this.pgPool.connect();
      client.release();
      return true;
    } catch {
      return false;
    }
  }

  private async testRedisConnection(): Promise<boolean> {
    if (!this.redisClient) {return false;}
    try {
      await this.redisClient.ping();
      return true;
    } catch {
      return false;
    }
  }

  private async getPostgreSQLMetrics() {
    // Simplified metrics - in production would query pg_stat_* tables
    return {
      averageQueryTime: 0, // Would calculate from query history
      slowQueries: 0,      // Would query pg_stat_statements
      totalQueries: this.queryCount,
      activeConnections: this.pgPool?.totalCount || 0,
    };
  }

  private async getRedisMetrics() {
    if (!this.redisClient) {
      return { averageLatency: 0, commandsPerSecond: 0, memoryUsage: 0, connectedClients: 0 };
    }

    try {
      const info = await this.redisClient.info();
      const lines = info.split('\r\n');
      const stats: Record<string, string> = {};
      
      lines.forEach(line => {
        const [key, value] = line.split(':');
        if (key && value) {
          stats[key] = value;
        }
      });

      return {
        averageLatency: 0, // Would need to track this separately
        commandsPerSecond: parseInt(stats.instantaneous_ops_per_sec || '0'),
        memoryUsage: parseInt(stats.used_memory || '0'),
        connectedClients: parseInt(stats.connected_clients || '0'),
      };
    } catch (error) {
      return { averageLatency: 0, commandsPerSecond: 0, memoryUsage: 0, connectedClients: 0 };
    }
  }

  private buildWhereClause(where: Record<string, any>, startIndex: number = 0): { clause: string; params: any[] } {
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = startIndex;

    for (const [key, value] of Object.entries(where)) {
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        // Handle operators like { score: { $gte: 100 } }
        for (const [operator, operatorValue] of Object.entries(value)) {
          paramIndex++;
          switch (operator) {
            case '$gte':
              conditions.push(`${key} >= $${paramIndex}`);
              break;
            case '$gt':
              conditions.push(`${key} > $${paramIndex}`);
              break;
            case '$lte':
              conditions.push(`${key} <= $${paramIndex}`);
              break;
            case '$lt':
              conditions.push(`${key} < $${paramIndex}`);
              break;
            case '$ne':
              conditions.push(`${key} != $${paramIndex}`);
              break;
            default:
              conditions.push(`${key} = $${paramIndex}`);
          }
          params.push(operatorValue);
        }
      } else {
        paramIndex++;
        conditions.push(`${key} = $${paramIndex}`);
        params.push(value);
      }
    }

    return {
      clause: conditions.join(' AND '),
      params,
    };
  }

  private prefixKey(key: string): string {
    const prefix = this.config?.redis.keyPrefix || '';
    return `${prefix}${key}`;
  }
}

/**
 * Factory function to create DatabaseService instance
 */
export async function createDatabaseService(config?: Partial<DatabaseConfig>): Promise<DatabaseService> {
  const defaultConfig: DatabaseConfig = {
    postgresql: {
      host: process.env.POSTGRES_HOST || 'localhost',
      port: parseInt(process.env.POSTGRES_PORT || '5432'),
      database: process.env.POSTGRES_DB || 'bomberman_dev',
      username: process.env.POSTGRES_USER || 'bomberman_user',
      password: process.env.POSTGRES_PASSWORD || '',
      ssl: false,
      maxConnections: 10,
    },
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      database: 0,
      keyPrefix: process.env.NODE_ENV === 'test' ? 'bomberman:test:' : 'bomberman:',
      cluster: false,
      ttl: 3600,
    },
    connectionTimeout: 5000,
    retryAttempts: 3,
    poolSize: 10,
  };

  const mergedConfig = { 
    ...defaultConfig, 
    ...config,
    postgresql: { ...defaultConfig.postgresql, ...config?.postgresql },
    redis: { ...defaultConfig.redis, ...config?.redis },
  };

  const service = new DatabaseServiceImpl();
  
  // Initialize only if config is provided or environment variables are set
  if (config || process.env.POSTGRES_HOST || process.env.REDIS_HOST) {
    await service.initialize(mergedConfig);
  }
  
  return service;
}