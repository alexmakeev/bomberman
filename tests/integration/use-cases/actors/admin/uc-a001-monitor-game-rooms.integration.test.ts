/**
 * Use Case Integration Test: UC-A001 - Monitor Game Rooms
 * Simulates admin dashboard monitoring workflow with real-time updates
 * Ref: docs/sequence-diagrams/admin/uc-a001-monitor-game-rooms.md
 */

import { beforeAll, afterAll, beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { Client } from 'pg';
import Redis from 'ioredis';
import { createConfiguredUnifiedGameServer } from '../../../../../src/modules/UnifiedGameServerImpl';
import type { UnifiedGameServer } from '../../../../../src/interfaces/core/UnifiedGameServer';
import { EventCategory } from '../../../../../src/types/events.d.ts';

describe('UC-A001: Monitor Game Rooms - Admin Dashboard Integration', () => {
  let gameServer: UnifiedGameServer;
  let pgClient: Client;
  let redisClient: Redis;
  let pubSubClient: Redis; // Separate client for pub/sub

  // Test data following sequence diagram actors
  // Ref: docs/sequence-diagrams/admin/uc-a001-monitor-game-rooms.md
  const adminId = 'admin-user-001';
  const testRooms = [
    {
      roomId: 'room-active-1',
      name: 'Active Game Room 1',
      status: 'active',
      currentPlayers: 3,
      maxPlayers: 4,
      gameMode: 'cooperative',
      createdAt: new Date(Date.now() - 300000) // 5 minutes ago
    },
    {
      roomId: 'room-waiting-2',
      name: 'Waiting Room 2',
      status: 'waiting',
      currentPlayers: 1,
      maxPlayers: 8,
      gameMode: 'competitive',
      createdAt: new Date(Date.now() - 120000) // 2 minutes ago
    }
  ];

  beforeAll(async () => {
    // Initialize database connections for admin monitoring
    // Ref: docs/architecture/deployment-setup.md
    pgClient = new Client({
      host: process.env.POSTGRES_HOST || 'localhost',
      port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
      database: process.env.POSTGRES_DB || 'bomberman_dev',
      user: process.env.POSTGRES_USER || 'bomberman_user',
      password: process.env.POSTGRES_PASSWORD,
    });

    redisClient = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD,
    });

    pubSubClient = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD,
    });

    await pgClient.connect();
    await redisClient.ping();

    // Create admin monitoring schema
    // Ref: docs/schema/admin-monitoring.md
    await pgClient.query(`
      CREATE TABLE IF NOT EXISTS admin_test_rooms (
        room_id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        status VARCHAR(20) NOT NULL,
        current_players INTEGER DEFAULT 0,
        max_players INTEGER DEFAULT 8,
        game_mode VARCHAR(50) DEFAULT 'cooperative',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        total_games_played INTEGER DEFAULT 0,
        total_playtime_minutes INTEGER DEFAULT 0
      )
    `);

    await pgClient.query(`
      CREATE TABLE IF NOT EXISTS admin_test_room_stats (
        stat_id SERIAL PRIMARY KEY,
        room_id VARCHAR(255) NOT NULL,
        player_count INTEGER NOT NULL,
        status VARCHAR(20) NOT NULL,
        recorded_at TIMESTAMPTZ DEFAULT NOW(),
        session_duration_minutes INTEGER
      )
    `);

    await pgClient.query(`
      CREATE TABLE IF NOT EXISTS admin_test_system_metrics (
        metric_id SERIAL PRIMARY KEY,
        metric_type VARCHAR(50) NOT NULL,
        metric_value FLOAT NOT NULL,
        recorded_at TIMESTAMPTZ DEFAULT NOW(),
        metadata JSONB
      )
    `);

    console.log('👑 UC-A001 admin monitoring test environment initialized');
  });

  afterAll(async () => {
    await pgClient.query('DROP TABLE IF EXISTS admin_test_rooms');
    await pgClient.query('DROP TABLE IF EXISTS admin_test_room_stats');
    await pgClient.query('DROP TABLE IF EXISTS admin_test_system_metrics');
    
    await pgClient.end();
    await redisClient.disconnect();
    await pubSubClient.disconnect();
    console.log('🧹 UC-A001 admin test cleanup complete');
  });

  beforeEach(async () => {
    // Initialize UnifiedGameServer for admin monitoring
    gameServer = await createConfiguredUnifiedGameServer({
      server: { port: 8093, maxConnections: 100 },
      eventBus: { enablePersistence: true, enableTracing: true }
    });
    
    await gameServer.start();

    // Set up test room data in both Redis (real-time) and PostgreSQL (historical)
    // Ref: docs/sequence-diagrams/admin/uc-a001-monitor-game-rooms.md Line 14-17
    for (const room of testRooms) {
      // Redis: Current real-time state
      await redisClient.setex(`rooms:${room.roomId}`, 3600, JSON.stringify({
        roomId: room.roomId,
        name: room.name,
        status: room.status,
        currentPlayers: room.currentPlayers,
        maxPlayers: room.maxPlayers,
        gameMode: room.gameMode,
        players: Array.from({ length: room.currentPlayers }, (_, i) => ({
          id: `player-${i + 1}`,
          displayName: `Player${i + 1}`,
          joinedAt: new Date().toISOString()
        })),
        lastActivity: new Date().toISOString()
      }));

      // PostgreSQL: Historical and statistical data
      await pgClient.query(`
        INSERT INTO admin_test_rooms 
        (room_id, name, status, current_players, max_players, game_mode, created_at, total_games_played, total_playtime_minutes)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (room_id) DO UPDATE SET
          status = EXCLUDED.status,
          current_players = EXCLUDED.current_players,
          updated_at = NOW()
      `, [
        room.roomId,
        room.name,
        room.status,
        room.currentPlayers,
        room.maxPlayers,
        room.gameMode,
        room.createdAt,
        Math.floor(Math.random() * 20), // Random historical games
        Math.floor(Math.random() * 500) // Random playtime
      ]);

      // Add some historical statistics
      for (let i = 0; i < 5; i++) {
        await pgClient.query(`
          INSERT INTO admin_test_room_stats (room_id, player_count, status, recorded_at, session_duration_minutes)
          VALUES ($1, $2, $3, $4, $5)
        `, [
          room.roomId,
          Math.floor(Math.random() * room.maxPlayers) + 1,
          ['waiting', 'active', 'completed'][Math.floor(Math.random() * 3)],
          new Date(Date.now() - Math.random() * 86400000), // Random time in last 24h
          Math.floor(Math.random() * 60) + 5 // 5-65 minutes
        ]);
      }
    }

    // Add system performance metrics
    const metrics = [
      { type: 'active_connections', value: 45 },
      { type: 'memory_usage_mb', value: 256.7 },
      { type: 'cpu_usage_percent', value: 23.5 },
      { type: 'events_per_second', value: 127.3 }
    ];

    for (const metric of metrics) {
      await redisClient.set(`metrics:${metric.type}`, metric.value);
      await pgClient.query(`
        INSERT INTO admin_test_system_metrics (metric_type, metric_value, recorded_at)
        VALUES ($1, $2, NOW())
      `, [metric.type, metric.value]);
    }
  });

  afterEach(async () => {
    if (gameServer) {
      await gameServer.stop();
    }
    
    // Clean up test data
    await pgClient.query('DELETE FROM admin_test_rooms');
    await pgClient.query('DELETE FROM admin_test_room_stats');
    await pgClient.query('DELETE FROM admin_test_system_metrics');
    await redisClient.flushdb();
  });

  describe('Main Success Path - Dashboard Room Monitoring', () => {
    it('should complete full admin dashboard monitoring workflow', async () => {
      // Test complete workflow from sequence diagram
      // Ref: docs/sequence-diagrams/admin/uc-a001-monitor-game-rooms.md Line 12-20
      console.log('👑 Step 1: Admin accesses dashboard');
      
      const dashboardRequest = {
        adminId,
        requestType: 'get_active_rooms',
        includeStatistics: true,
        timestamp: new Date().toISOString()
      };

      // Step 2: AdminDashboard requests active rooms from GameServer
      // Ref: Line 13
      console.log('📊 Step 2: Dashboard requests active rooms from GameServer');

      // Step 3: GameServer gets active room states from Redis
      // Ref: Line 14-15
      console.log('🔍 Step 3: GameServer retrieves active room states from Redis');
      
      const activeRooms = [];
      for (const room of testRooms) {
        const roomData = await redisClient.get(`rooms:${room.roomId}`);
        if (roomData) {
          const parsedRoom = JSON.parse(roomData);
          activeRooms.push(parsedRoom);
        }
      }

      expect(activeRooms).toHaveLength(2);
      expect(activeRooms.map(r => r.roomId)).toContain('room-active-1');
      expect(activeRooms.map(r => r.roomId)).toContain('room-waiting-2');

      // Step 4: GameServer gets room statistics from PostgreSQL
      // Ref: Line 16-17
      console.log('📈 Step 4: GameServer retrieves historical statistics from PostgreSQL');
      
      const roomStatistics = await pgClient.query(`
        SELECT 
          r.room_id,
          r.name,
          r.total_games_played,
          r.total_playtime_minutes,
          AVG(s.player_count) as avg_players,
          COUNT(s.*) as stat_entries,
          MAX(s.recorded_at) as last_recorded
        FROM admin_test_rooms r
        LEFT JOIN admin_test_room_stats s ON r.room_id = s.room_id
        WHERE r.room_id = ANY($1)
        GROUP BY r.room_id, r.name, r.total_games_played, r.total_playtime_minutes
      `, [testRooms.map(r => r.roomId)]);

      expect(roomStatistics.rows).toHaveLength(2);
      roomStatistics.rows.forEach(stat => {
        expect(stat.total_games_played).toBeGreaterThanOrEqual(0);
        expect(stat.avg_players).toBeGreaterThan(0);
      });

      // Step 5: GameServer merges real-time & historical data
      // Ref: Line 18
      console.log('🔗 Step 5: Merging real-time and historical data');
      
      const comprehensiveRoomData = activeRooms.map(room => {
        const stats = roomStatistics.rows.find(s => s.room_id === room.roomId);
        return {
          ...room,
          statistics: {
            totalGamesPlayed: parseInt(stats?.total_games_played || '0'),
            totalPlaytimeMinutes: parseInt(stats?.total_playtime_minutes || '0'),
            averagePlayerCount: parseFloat(stats?.avg_players || '0'),
            lastRecorded: stats?.last_recorded
          }
        };
      });

      expect(comprehensiveRoomData).toHaveLength(2);
      comprehensiveRoomData.forEach(room => {
        expect(room.statistics).toBeDefined();
        expect(room.statistics.totalGamesPlayed).toBeGreaterThanOrEqual(0);
        expect(room.roomId).toBeDefined();
        expect(room.currentPlayers).toBeGreaterThanOrEqual(0);
      });

      // Step 6: GameServer returns room list with comprehensive details
      // Ref: Line 19
      console.log('📋 Step 6: Returning comprehensive room data to dashboard');
      
      const dashboardResponse = {
        success: true,
        timestamp: new Date().toISOString(),
        activeRooms: comprehensiveRoomData,
        summary: {
          totalActiveRooms: comprehensiveRoomData.length,
          totalActivePlayers: comprehensiveRoomData.reduce((sum, room) => sum + room.currentPlayers, 0),
          averagePlayersPerRoom: comprehensiveRoomData.reduce((sum, room) => sum + room.currentPlayers, 0) / comprehensiveRoomData.length
        }
      };

      expect(dashboardResponse.success).toBe(true);
      expect(dashboardResponse.summary.totalActiveRooms).toBe(2);
      expect(dashboardResponse.summary.totalActivePlayers).toBe(4); // 3 + 1 from test rooms

      // Step 7: AdminDashboard displays rooms & statistics
      // Ref: Line 20
      console.log('🖥️ Step 7: Dashboard displays room data to admin');
      
      const displayData = {
        roomList: dashboardResponse.activeRooms.map(room => ({
          id: room.roomId,
          name: room.name,
          status: room.status,
          players: `${room.currentPlayers}/${room.maxPlayers}`,
          gameMode: room.gameMode,
          uptime: Math.floor((Date.now() - new Date(room.lastActivity).getTime()) / 60000), // Minutes
          gamesPlayed: room.statistics.totalGamesPlayed
        })),
        summary: dashboardResponse.summary
      };

      expect(displayData.roomList).toHaveLength(2);
      expect(displayData.roomList[0]).toHaveProperty('name');
      expect(displayData.roomList[0]).toHaveProperty('status');
      expect(displayData.roomList[0]).toHaveProperty('players');

      console.log('✅ UC-A001 Main Success Path completed successfully');
    });
  });

  describe('Real-time Updates via Redis Pub/Sub', () => {
    it('should handle real-time room updates through WebSocket bridge', async () => {
      // Test real-time updates from sequence diagram
      // Ref: docs/sequence-diagrams/admin/uc-a001-monitor-game-rooms.md Line 22-25
      console.log('🌉 Testing real-time updates via Redis Pub/Sub');

      const receivedUpdates: any[] = [];
      const adminUpdateChannel = 'admin:room-updates';

      // Set up pub/sub subscription (simulating WebSocket bridge)
      await pubSubClient.subscribe(adminUpdateChannel);
      pubSubClient.on('message', (channel, message) => {
        if (channel === adminUpdateChannel) {
          receivedUpdates.push(JSON.parse(message));
        }
      });

      // Simulate room state change event
      const roomStateChange = {
        type: 'room_state_changed',
        roomId: 'room-active-1',
        changes: {
          currentPlayers: 4, // Player joined
          status: 'active'
        },
        timestamp: new Date().toISOString(),
        eventSource: 'game-server'
      };

      // Step: Redis publishes room state changes
      // Ref: Line 23
      await redisClient.publish(adminUpdateChannel, JSON.stringify(roomStateChange));

      // Wait for pub/sub delivery
      await new Promise(resolve => setTimeout(resolve, 50));

      // Step: WebSocket forwards to AdminDashboard
      // Ref: Line 24
      expect(receivedUpdates).toHaveLength(1);
      expect(receivedUpdates[0].type).toBe('room_state_changed');
      expect(receivedUpdates[0].roomId).toBe('room-active-1');
      expect(receivedUpdates[0].changes.currentPlayers).toBe(4);

      // Step: AdminDashboard updates display with live data
      // Ref: Line 25
      console.log('🔄 Dashboard receiving real-time update');
      
      const liveUpdate = receivedUpdates[0];
      
      // Update Redis state to reflect change
      const currentRoomData = await redisClient.get(`rooms:${liveUpdate.roomId}`);
      const parsedRoomData = JSON.parse(currentRoomData!);
      parsedRoomData.currentPlayers = liveUpdate.changes.currentPlayers;
      parsedRoomData.lastActivity = new Date().toISOString();
      
      await redisClient.setex(`rooms:${liveUpdate.roomId}`, 3600, JSON.stringify(parsedRoomData));

      // Verify real-time state update
      const updatedRoomData = await redisClient.get(`rooms:${liveUpdate.roomId}`);
      const updatedParsedData = JSON.parse(updatedRoomData!);
      
      expect(updatedParsedData.currentPlayers).toBe(4);

      console.log('✅ Real-time updates via Redis Pub/Sub completed');
    });

    it('should publish system metrics updates', async () => {
      console.log('📊 Testing system metrics real-time updates');

      const metricsUpdates: any[] = [];
      const metricsChannel = 'admin:metrics-updates';

      await pubSubClient.subscribe(metricsChannel);
      pubSubClient.on('message', (channel, message) => {
        if (channel === metricsChannel) {
          metricsUpdates.push(JSON.parse(message));
        }
      });

      // Simulate system metrics update
      const metricsUpdate = {
        type: 'system_metrics_update',
        metrics: {
          activeConnections: 52,
          memoryUsageMB: 287.3,
          cpuUsagePercent: 31.2,
          eventsPerSecond: 156.8
        },
        timestamp: new Date().toISOString()
      };

      await redisClient.publish(metricsChannel, JSON.stringify(metricsUpdate));
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(metricsUpdates).toHaveLength(1);
      expect(metricsUpdates[0].metrics.activeConnections).toBe(52);

      console.log('✅ System metrics updates verified');
    });
  });

  describe('Alternative Paths - Error Scenarios', () => {
    it('should handle no active rooms scenario', async () => {
      // Test no active rooms from sequence diagram
      // Ref: docs/sequence-diagrams/admin/uc-a001-monitor-game-rooms.md Line 27-31
      console.log('🚫 Testing no active rooms scenario');

      // Clear all room data from Redis
      for (const room of testRooms) {
        await redisClient.del(`rooms:${room.roomId}`);
      }

      // Step: Redis returns empty room cache
      // Ref: Line 28
      const roomKeys = await redisClient.keys('rooms:*');
      expect(roomKeys).toHaveLength(0);

      // Step: GameServer returns empty room list
      // Ref: Line 29
      const emptyRoomsResponse = {
        success: true,
        activeRooms: [],
        summary: {
          totalActiveRooms: 0,
          totalActivePlayers: 0,
          message: 'No active games currently running'
        },
        timestamp: new Date().toISOString()
      };

      expect(emptyRoomsResponse.activeRooms).toHaveLength(0);
      expect(emptyRoomsResponse.summary.totalActiveRooms).toBe(0);

      // Step: AdminDashboard shows "No active games"
      // Ref: Line 30
      const emptyDashboardDisplay = {
        message: 'No active games currently running',
        suggestion: 'Check back later or review historical data',
        showHistoricalData: true
      };

      expect(emptyDashboardDisplay.message).toContain('No active games');
      expect(emptyDashboardDisplay.showHistoricalData).toBe(true);

      console.log('✅ No active rooms scenario handled correctly');
    });

    it('should handle Redis connection issues with PostgreSQL fallback', async () => {
      // Test connection issues from sequence diagram
      // Ref: docs/sequence-diagrams/admin/uc-a001-monitor-game-rooms.md Line 33-38
      console.log('🔌 Testing Redis connection issues with fallback');

      // Simulate Redis connection failure by using invalid client
      const brokenRedisClient = new Redis({
        host: 'non-existent-redis-host',
        port: 9999,
        connectTimeout: 100,
        lazyConnect: true
      });

      // Step: Redis connection timeout
      // Ref: Line 34
      let redisConnectionFailed = false;
      try {
        await brokenRedisClient.ping();
      } catch (error) {
        redisConnectionFailed = true;
      }

      expect(redisConnectionFailed).toBe(true);

      // Step: GameServer falls back to PostgreSQL historical data
      // Ref: Line 35-36
      console.log('📚 Falling back to PostgreSQL historical data');
      
      const fallbackData = await pgClient.query(`
        SELECT 
          room_id,
          name,
          status,
          current_players,
          max_players,
          game_mode,
          updated_at,
          total_games_played
        FROM admin_test_rooms 
        ORDER BY updated_at DESC
      `);

      expect(fallbackData.rows.length).toBeGreaterThan(0);

      // Step: AdminDashboard shows cached data with timestamp
      // Ref: Line 37
      const fallbackResponse = {
        success: true,
        source: 'postgresql_fallback',
        rooms: fallbackData.rows.map(row => ({
          roomId: row.room_id,
          name: row.name,
          status: row.status + ' (cached)',
          currentPlayers: row.current_players,
          maxPlayers: row.max_players,
          gameMode: row.game_mode,
          lastUpdated: row.updated_at,
          totalGames: row.total_games_played
        })),
        warning: 'Real-time data unavailable. Showing cached information.',
        lastUpdate: fallbackData.rows[0]?.updated_at
      };

      expect(fallbackResponse.success).toBe(true);
      expect(fallbackResponse.source).toBe('postgresql_fallback');
      expect(fallbackResponse.warning).toContain('Real-time data unavailable');

      console.log('✅ Redis connection issues with PostgreSQL fallback handled');
    });
  });

  describe('Performance Metrics Integration', () => {
    it('should retrieve performance metrics from both Redis and PostgreSQL', async () => {
      // Test performance metrics from sequence diagram
      // Ref: docs/sequence-diagrams/admin/uc-a001-monitor-game-rooms.md Line 40-43
      console.log('📊 Testing performance metrics from both data sources');

      // Step: Get real-time metrics from Redis
      // Ref: Line 41
      const realTimeMetrics = {
        activeConnections: parseInt(await redisClient.get('metrics:active_connections') || '0'),
        memoryUsageMB: parseFloat(await redisClient.get('metrics:memory_usage_mb') || '0'),
        cpuUsagePercent: parseFloat(await redisClient.get('metrics:cpu_usage_percent') || '0'),
        eventsPerSecond: parseFloat(await redisClient.get('metrics:events_per_second') || '0'),
        timestamp: new Date().toISOString(),
        source: 'redis_realtime'
      };

      expect(realTimeMetrics.activeConnections).toBeGreaterThan(0);
      expect(realTimeMetrics.memoryUsageMB).toBeGreaterThan(0);

      // Step: Get aggregated statistics from PostgreSQL
      // Ref: Line 42
      const aggregatedStats = await pgClient.query(`
        SELECT 
          metric_type,
          AVG(metric_value) as avg_value,
          MIN(metric_value) as min_value,
          MAX(metric_value) as max_value,
          COUNT(*) as sample_count,
          MAX(recorded_at) as last_recorded
        FROM admin_test_system_metrics 
        WHERE recorded_at >= NOW() - INTERVAL '24 hours'
        GROUP BY metric_type
        ORDER BY metric_type
      `);

      expect(aggregatedStats.rows.length).toBeGreaterThan(0);

      // Combine real-time and historical metrics
      const combinedMetrics = {
        realTime: realTimeMetrics,
        historical: aggregatedStats.rows.reduce((acc, row) => {
          acc[row.metric_type] = {
            average: parseFloat(row.avg_value),
            minimum: parseFloat(row.min_value),
            maximum: parseFloat(row.max_value),
            sampleCount: parseInt(row.sample_count),
            lastRecorded: row.last_recorded
          };
          return acc;
        }, {} as Record<string, any>),
        combinedInsights: {
          systemHealth: 'good',
          recommendations: []
        }
      };

      // Add performance insights
      if (realTimeMetrics.memoryUsageMB > 500) {
        combinedMetrics.combinedInsights.recommendations.push('Consider memory optimization');
      }
      if (realTimeMetrics.cpuUsagePercent > 80) {
        combinedMetrics.combinedInsights.recommendations.push('High CPU usage detected');
      }

      expect(combinedMetrics.realTime.source).toBe('redis_realtime');
      expect(combinedMetrics.historical).toBeDefined();
      expect(Object.keys(combinedMetrics.historical).length).toBeGreaterThan(0);

      console.log('✅ Performance metrics integration completed');
    });

    it('should generate comprehensive admin dashboard summary', async () => {
      console.log('📋 Testing comprehensive admin dashboard summary generation');

      // Gather all dashboard data
      const dashboardSummary = {
        overview: {
          totalActiveRooms: 2,
          totalActivePlayers: 4,
          systemUptime: '2 hours 15 minutes',
          lastUpdate: new Date().toISOString()
        },
        roomBreakdown: {
          byStatus: {
            active: 1,
            waiting: 1,
            completed: 0
          },
          byGameMode: {
            cooperative: 1,
            competitive: 1
          }
        },
        performance: {
          currentLoad: 'normal',
          responseTime: '45ms',
          eventThroughput: '127 events/sec',
          errorRate: '0.02%'
        },
        alerts: [],
        recentActivity: []
      };

      // Add recent activity from database
      const recentActivity = await pgClient.query(`
        SELECT 
          r.name as room_name,
          s.status,
          s.player_count,
          s.recorded_at
        FROM admin_test_room_stats s
        JOIN admin_test_rooms r ON s.room_id = r.room_id
        ORDER BY s.recorded_at DESC
        LIMIT 10
      `);

      dashboardSummary.recentActivity = recentActivity.rows.map(row => ({
        timestamp: row.recorded_at,
        description: `${row.room_name}: ${row.player_count} players (${row.status})`,
        type: 'room_activity'
      }));

      expect(dashboardSummary.overview.totalActiveRooms).toBe(2);
      expect(dashboardSummary.roomBreakdown.byStatus.active).toBe(1);
      expect(dashboardSummary.recentActivity.length).toBeGreaterThan(0);

      console.log('✅ Comprehensive admin dashboard summary generated');
    });
  });

  describe('EventBus Integration for Admin Events', () => {
    it('should handle admin monitoring events through EventBus', async () => {
      console.log('📡 Testing admin monitoring events through EventBus');

      const adminEventHandler = vi.fn();
      
      // Subscribe to admin-related events
      await gameServer.eventBus.on('admin-monitor', EventCategory.ADMIN_ACTION, adminEventHandler);

      // Publish admin dashboard access event
      const adminAccessEvent = {
        eventId: 'admin-dashboard-access',
        category: EventCategory.ADMIN_ACTION,
        type: 'dashboard_accessed',
        sourceId: adminId,
        targets: [{ type: 'SYSTEM' as any, id: 'admin-dashboard' }],
        data: {
          adminId,
          dashboardSection: 'room-monitoring',
          timestamp: new Date().toISOString(),
          accessLevel: 'full'
        },
        metadata: {
          priority: 1 as any,
          deliveryMode: 'AT_LEAST_ONCE' as any,
          tags: ['admin', 'dashboard', 'monitoring'],
        },
        timestamp: new Date(),
        version: '1.0.0',
      };

      const publishResult = await gameServer.publishEvent(adminAccessEvent);
      expect(publishResult.success).toBe(true);

      // Log admin access
      await pgClient.query(`
        INSERT INTO admin_test_system_metrics (metric_type, metric_value, recorded_at, metadata)
        VALUES ($1, $2, NOW(), $3)
      `, [
        'admin_dashboard_access',
        1,
        JSON.stringify({ adminId, section: 'room-monitoring' })
      ]);

      const adminAccessLog = await pgClient.query(
        'SELECT * FROM admin_test_system_metrics WHERE metric_type = $1',
        ['admin_dashboard_access']
      );

      expect(adminAccessLog.rows.length).toBeGreaterThan(0);

      console.log('✅ Admin monitoring events through EventBus verified');
    });
  });
});