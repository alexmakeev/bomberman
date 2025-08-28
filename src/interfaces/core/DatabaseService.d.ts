/**
 * DatabaseService Interface
 * Handles PostgreSQL and Redis database operations for the unified event system
 */

import type { EntityId, Result } from '../../types/common';

/**
 * Database connection configuration
 */
export interface DatabaseConfig {
  postgresql: PostgreSQLConfig;
  redis: RedisConfig;
  connectionTimeout: number;
  retryAttempts: number;
  poolSize: number;
}

export interface PostgreSQLConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl?: boolean;
  maxConnections: number;
}

export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  database: number;
  keyPrefix: string;
  cluster?: boolean;
  ttl: number;
}

/**
 * Database connection status
 */
export interface DatabaseStatus {
  postgresql: ConnectionStatus;
  redis: ConnectionStatus;
  uptime: number;
  totalQueries: number;
  errorCount: number;
}

export interface ConnectionStatus {
  connected: boolean;
  latency: number;
  lastError?: string;
  connectionCount: number;
}

/**
 * Query results
 */
export interface QueryResult<T = any> {
  success: boolean;
  data?: T;
  rowCount?: number;
  error?: string;
  executionTime: number;
}

export interface CacheResult<T = any> {
  success: boolean;
  data?: T;
  exists: boolean;
  ttl?: number;
  error?: string;
}

/**
 * Main DatabaseService interface
 */
export interface DatabaseService {
  
  // Lifecycle Management
  
  /**
   * Initialize database connections
   */
  initialize(config: DatabaseConfig): Promise<void>;
  
  /**
   * Shutdown and cleanup connections
   */
  shutdown(): Promise<void>;
  
  /**
   * Get database status and health metrics
   */
  getStatus(): Promise<DatabaseStatus>;
  
  /**
   * Test database connectivity
   */
  healthCheck(): Promise<{ postgresql: boolean; redis: boolean }>;
  
  // PostgreSQL Operations
  
  /**
   * Execute raw SQL query
   */
  query<T = any>(sql: string, params?: any[]): Promise<QueryResult<T>>;
  
  /**
   * Execute query within a transaction
   */
  transaction<T>(callback: (query: (sql: string, params?: any[]) => Promise<QueryResult>) => Promise<T>): Promise<T>;
  
  /**
   * Insert record and return generated ID
   */
  insert(table: string, data: Record<string, any>): Promise<QueryResult<{ id: EntityId }>>;
  
  /**
   * Update records by conditions
   */
  update(table: string, data: Record<string, any>, where: Record<string, any>): Promise<QueryResult>;
  
  /**
   * Delete records by conditions  
   */
  delete(table: string, where: Record<string, any>): Promise<QueryResult>;
  
  /**
   * Select records with optional conditions and pagination
   */
  select<T = any>(table: string, options?: {
    where?: Record<string, any>;
    orderBy?: string;
    limit?: number;
    offset?: number;
  }): Promise<QueryResult<T[]>>;
  
  // Redis Operations
  
  /**
   * Set key-value pair with optional TTL
   */
  setCache(key: string, value: any, ttlSeconds?: number): Promise<CacheResult>;
  
  /**
   * Get value by key
   */
  getCache<T = any>(key: string): Promise<CacheResult<T>>;
  
  /**
   * Delete key from cache
   */
  deleteCache(key: string): Promise<CacheResult>;
  
  /**
   * Check if key exists
   */
  existsCache(key: string): Promise<CacheResult<boolean>>;
  
  /**
   * Set multiple key-value pairs
   */
  setCacheBatch(pairs: Record<string, any>, ttlSeconds?: number): Promise<CacheResult>;
  
  /**
   * Get multiple values by keys
   */
  getCacheBatch<T = any>(keys: string[]): Promise<CacheResult<Record<string, T>>>;
  
  /**
   * Increment numeric value atomically
   */
  incrementCache(key: string, by?: number): Promise<CacheResult<number>>;
  
  /**
   * Set expiration for existing key
   */
  expireCache(key: string, ttlSeconds: number): Promise<CacheResult>;
  
  // Redis Pub/Sub Operations
  
  /**
   * Publish message to channel
   */
  publish(channel: string, message: any): Promise<CacheResult<number>>;
  
  /**
   * Subscribe to channel with callback
   */
  subscribe(channel: string, callback: (message: any) => void): Promise<CacheResult>;
  
  /**
   * Unsubscribe from channel
   */
  unsubscribe(channel: string): Promise<CacheResult>;
  
  /**
   * Subscribe to pattern with callback
   */
  subscribePattern(pattern: string, callback: (channel: string, message: any) => void): Promise<CacheResult>;
  
  // Advanced Operations
  
  /**
   * Execute lua script on Redis
   */
  executeScript(script: string, keys: string[], args: any[]): Promise<CacheResult>;
  
  /**
   * Get Redis connection for advanced operations
   */
  getRedisConnection(): any;
  
  /**
   * Get PostgreSQL connection pool for advanced operations
   */
  getPostgreSQLPool(): any;
  
  // Performance and Monitoring
  
  /**
   * Get query performance metrics
   */
  getPerformanceMetrics(): Promise<{
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
  }>;
  
  /**
   * Clear all caches (use with caution)
   */
  clearAllCaches(): Promise<CacheResult>;
  
  /**
   * Backup database (PostgreSQL)
   */
  backup(options?: { includeTables?: string[]; excludeTables?: string[] }): Promise<Result>;
}

/**
 * Factory function type for creating DatabaseService
 */
export type DatabaseServiceFactory = (config?: Partial<DatabaseConfig>) => Promise<DatabaseService>;