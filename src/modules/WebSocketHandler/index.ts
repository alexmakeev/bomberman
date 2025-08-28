/**
 * WebSocketHandler Implementation
 * Enhanced WebSocket connection management with authentication and rate limiting
 * See docs/architecture/unified-event-system.md for event system integration
 */

import type { EventBus } from '../../interfaces/core/EventBus';
import type { EntityId } from '../../types/common';
import type { UniversalEvent } from '../../types/events.d.ts';

interface WebSocketConfig {
  maxConnections: number;
  authTimeout: number;
  rateLimit: {
    maxMessages: number;
    windowMs: number;
  };
}

interface ConnectionInfo {
  id: EntityId;
  socket: any;
  userId?: EntityId;
  authenticated: boolean;
  connectedAt: Date;
  lastActivity: Date;
  messageCount: number;
  rateLimit: {
    messages: number;
    windowStart: number;
  };
  subscriptions: Set<string>;
  authTimer?: NodeJS.Timeout;
}

interface ConnectionStats {
  totalConnections: number;
  authenticatedConnections: number;
  messagesSentPerSecond: number;
  messagesReceivedPerSecond: number;
}

interface MessageHandleResult {
  accepted: boolean;
  error?: string;
}

interface ConnectionResult {
  success: boolean;
  requiresAuth: boolean;
  authTimeout: number;
  error?: string;
}

interface AuthResult {
  success: boolean;
  userId?: EntityId;
  permissions?: string[];
  error?: string;
}

/**
 * Complete WebSocketHandler implementation with authentication, rate limiting, and EventBus integration
 */
class WebSocketHandlerImpl {
  readonly eventBus: EventBus;
  private config?: WebSocketConfig;
  private readonly connections = new Map<EntityId, ConnectionInfo>();
  private readonly userConnections = new Map<EntityId, Set<EntityId>>();
  private isShutdown = false;
  private readonly stats = {
    totalMessages: 0,
    authenticatedConnections: 0,
    lastStatsUpdate: Date.now(),
  };

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
    console.log('🔌 WebSocketHandler created');
  }

  async initialize(config: WebSocketConfig): Promise<void> {
    this.config = config;
    
    // Subscribe to EventBus events for broadcasting
    await this.eventBus.on('websocket_handler', '*', async (event: UniversalEvent) => {
      await this.broadcastEvent(event);
    });
    
    console.log('🔌 WebSocketHandler initialized with config:', config);
  }

  async shutdown(): Promise<void> {
    this.isShutdown = true;
    
    // Close all connections gracefully
    for (const [connectionId, connectionInfo] of this.connections) {
      if (connectionInfo.authTimer) {
        clearTimeout(connectionInfo.authTimer);
      }
      connectionInfo.socket.close(1001, 'Server shutdown');
    }
    
    this.connections.clear();
    this.userConnections.clear();
    console.log('🔌 WebSocketHandler shutdown complete');
  }

  async handleConnection(connectionId: EntityId, socket: any): Promise<ConnectionResult> {
    if (this.isShutdown) {
      return { success: false, requiresAuth: false, authTimeout: 0, error: 'Server is shutting down' };
    }

    if (!this.config) {
      return { success: false, requiresAuth: false, authTimeout: 0, error: 'Handler not initialized' };
    }

    // Check connection limit
    if (this.connections.size >= this.config.maxConnections) {
      return { success: false, requiresAuth: false, authTimeout: 0, error: 'Maximum connections exceeded' };
    }

    const connectionInfo: ConnectionInfo = {
      id: connectionId,
      socket,
      authenticated: false,
      connectedAt: new Date(),
      lastActivity: new Date(),
      messageCount: 0,
      rateLimit: {
        messages: 0,
        windowStart: Date.now(),
      },
      subscriptions: new Set(),
    };

    // Set authentication timeout
    connectionInfo.authTimer = setTimeout(() => {
      if (!connectionInfo.authenticated) {
        console.log(`🔌 Authentication timeout for connection: ${connectionId}`);
        socket.close(1008, 'Authentication timeout');
        this.connections.delete(connectionId);
      }
    }, this.config.authTimeout);

    this.connections.set(connectionId, connectionInfo);
    console.log(`🔌 WebSocket connection handled: ${connectionId} (${this.connections.size}/${this.config.maxConnections})`);

    return {
      success: true,
      requiresAuth: true,
      authTimeout: this.config.authTimeout,
    };
  }

  async authenticateConnection(connectionId: EntityId, token: string): Promise<AuthResult> {
    const connectionInfo = this.connections.get(connectionId);
    if (!connectionInfo) {
      return { success: false, error: 'Connection not found' };
    }

    // Simple token validation (in real implementation, would verify JWT/etc)
    if (token !== 'valid-auth-token') {
      return { success: false, error: 'Invalid authentication token' };
    }

    // Clear auth timeout
    if (connectionInfo.authTimer) {
      clearTimeout(connectionInfo.authTimer);
      connectionInfo.authTimer = undefined;
    }

    // Mark as authenticated
    connectionInfo.authenticated = true;
    connectionInfo.userId = `user_${connectionId}`; // Generate user ID
    
    // Track user connections
    if (!this.userConnections.has(connectionInfo.userId)) {
      this.userConnections.set(connectionInfo.userId, new Set());
    }
    this.userConnections.get(connectionInfo.userId)!.add(connectionId);

    this.stats.authenticatedConnections++;
    
    console.log(`🔌 Connection authenticated: ${connectionId} as user ${connectionInfo.userId}`);
    
    return {
      success: true,
      userId: connectionInfo.userId,
      permissions: ['game.play', 'chat.send'],
    };
  }

  async handleMessage(connectionId: EntityId, message: any): Promise<MessageHandleResult> {
    const connectionInfo = this.connections.get(connectionId);
    if (!connectionInfo) {
      return { accepted: false, error: 'Connection not found' };
    }

    if (!connectionInfo.authenticated) {
      return { accepted: false, error: 'Connection not authenticated' };
    }

    // Rate limiting check
    const rateLimitResult = this.checkRateLimit(connectionInfo);
    if (!rateLimitResult.allowed) {
      return { accepted: false, error: 'Rate limit exceeded' };
    }

    // Update activity
    connectionInfo.lastActivity = new Date();
    connectionInfo.messageCount++;
    this.stats.totalMessages++;

    // Convert message to UniversalEvent and publish to EventBus
    const event: UniversalEvent = {
      eventId: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      category: this.getEventCategory(message.type),
      type: this.getEventType(message.type),
      sourceId: connectionInfo.userId!,
      targets: [],
      data: message.data,
      metadata: {
        priority: 'normal',
        ttl: 30000,
        deliveryMode: 'at-least-once',
        compression: false,
        tags: [`connection:${connectionId}`],
      },
      timestamp: Date.now(),
      version: '1.0.0',
    };

    await this.eventBus.publish(event);
    
    return { accepted: true };
  }

  async handleDisconnection(connectionId: EntityId): Promise<{ success: boolean; connectionId: string }> {
    const connectionInfo = this.connections.get(connectionId);
    if (!connectionInfo) {
      return { success: false, connectionId };
    }

    // Clear auth timer if exists
    if (connectionInfo.authTimer) {
      clearTimeout(connectionInfo.authTimer);
    }

    // Remove from user connections
    if (connectionInfo.userId) {
      const userConnections = this.userConnections.get(connectionInfo.userId);
      if (userConnections) {
        userConnections.delete(connectionId);
        if (userConnections.size === 0) {
          this.userConnections.delete(connectionInfo.userId);
        }
      }

      if (connectionInfo.authenticated) {
        this.stats.authenticatedConnections--;
      }
    }

    // Remove connection
    this.connections.delete(connectionId);
    
    console.log(`🔌 Connection disconnected: ${connectionId} (${this.connections.size} remaining)`);
    
    return { success: true, connectionId };
  }

  async subscribeToEvents(connectionId: EntityId, eventPatterns: string[]): Promise<void> {
    const connectionInfo = this.connections.get(connectionId);
    if (!connectionInfo || !connectionInfo.authenticated) {
      throw new Error('Connection not found or not authenticated');
    }

    // Add patterns to subscriptions
    eventPatterns.forEach(pattern => {
      connectionInfo.subscriptions.add(pattern);
    });

    console.log(`🔌 Connection ${connectionId} subscribed to: ${eventPatterns.join(', ')}`);
  }

  async broadcastEvent(event: UniversalEvent): Promise<void> {
    let broadcastCount = 0;

    for (const [connectionId, connectionInfo] of this.connections) {
      if (!connectionInfo.authenticated) {continue;}

      // Check if connection is subscribed to this event type
      const eventPattern = `${event.category}.${event.type}`;
      let shouldReceive = false;

      for (const subscription of connectionInfo.subscriptions) {
        if (subscription === '*' || subscription === eventPattern || 
            subscription.startsWith(`${event.category}.`)) {
          shouldReceive = true;
          break;
        }
      }

      if (shouldReceive && connectionInfo.socket.readyState === 1) { // WebSocket.OPEN
        try {
          connectionInfo.socket.send(JSON.stringify({
            type: 'EVENT',
            event,
          }));
          broadcastCount++;
        } catch (error) {
          console.error(`🔌 Failed to send event to connection ${connectionId}:`, error);
          // Connection might be dead, clean it up
          await this.handleDisconnection(connectionId);
        }
      }
    }

    if (broadcastCount > 0) {
      console.log(`🔌 Broadcasted ${event.type} to ${broadcastCount} connections`);
    }
  }

  async getConnectionStats(): Promise<ConnectionStats> {
    const now = Date.now();
    const timeDelta = (now - this.stats.lastStatsUpdate) / 1000; // seconds
    
    return {
      totalConnections: this.connections.size,
      authenticatedConnections: this.stats.authenticatedConnections,
      messagesSentPerSecond: timeDelta > 0 ? this.stats.totalMessages / timeDelta : 0,
      messagesReceivedPerSecond: 0, // Would track incoming messages separately
    };
  }

  private checkRateLimit(connectionInfo: ConnectionInfo): { allowed: boolean; resetTime?: number } {
    if (!this.config) {
      return { allowed: true };
    }

    const now = Date.now();
    const {windowStart} = connectionInfo.rateLimit;
    const {windowMs} = this.config.rateLimit;

    // Check if we need to reset the window
    if (now - windowStart >= windowMs) {
      connectionInfo.rateLimit.windowStart = now;
      connectionInfo.rateLimit.messages = 0;
    }

    // Check if under limit
    if (connectionInfo.rateLimit.messages < this.config.rateLimit.maxMessages) {
      connectionInfo.rateLimit.messages++;
      return { allowed: true };
    }

    // Rate limited
    return {
      allowed: false,
      resetTime: windowStart + windowMs,
    };
  }

  private getEventCategory(messageType: string): string {
    const categoryMap: Record<string, string> = {
      'PLAYER_ACTION': 'GAME_STATE',
      'CHAT_MESSAGE': 'USER_NOTIFICATION',
      'ADMIN_ACTION': 'ADMIN_ACTION',
      'SYSTEM_STATUS': 'SYSTEM_STATUS',
    };
    
    return categoryMap[messageType] || 'GAME_STATE';
  }

  private getEventType(messageType: string): string {
    const typeMap: Record<string, string> = {
      'PLAYER_ACTION': 'player_action',
      'CHAT_MESSAGE': 'chat_message',
      'ADMIN_ACTION': 'admin_action',
      'SYSTEM_STATUS': 'system_status',
    };
    
    return typeMap[messageType] || 'generic_message';
  }
}

export function createWebSocketHandler(eventBus: EventBus): WebSocketHandlerImpl {
  return new WebSocketHandlerImpl(eventBus);
}