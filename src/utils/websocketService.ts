/**
 * WebSocket Service for Real-time Communication
 * Manages connection, message handling, and reconnection logic
 * 
 * @see docs/technical/websocket-api.md - WebSocket protocol documentation
 * @see src/types/websocket.d.ts - Message type definitions
 */

import { MessageType } from '../types/websocket.d';
import type { WebSocketMessage } from '../types/websocket.d';
import type { GameAction } from '../types/game';
import { generateId } from './gameUtils';

export class WebSocketService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 5;
  private readonly reconnectDelay = 1000;
  private heartbeatInterval: number | null = null;
  private readonly messageQueue: WebSocketMessage[] = [];
  private readonly listeners = new Map<string, Function[]>();
  private isConnecting = false;

  constructor(private readonly url: string) {}

  // Helper method to create properly formatted WebSocket messages
  private createMessage(messageType: MessageType, type: string, data: any): any {
    return {
      messageType,
      type,
      data,
      timestamp: new Date(),
      protocolVersion: '1.0',
      eventId: generateId(),
      category: 'game_events', // Default category
      sourceId: 'client',
      targets: [{ type: 'broadcast', id: '*' }],
      metadata: {
        priority: 'normal',
        retryable: true,
        persistent: false
      }
    };
  }

  // Connection Management
  connect(): Promise<void> {
    if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN)) {
      return Promise.resolve();
    }

    this.isConnecting = true;
    
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.url);
        
        this.ws.onopen = () => {
          console.log('WebSocket connected');
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          this.startHeartbeat();
          this.flushMessageQueue();
          this.emit('connect', {});
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data) as WebSocketMessage;
            this.handleMessage(message);
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
          }
        };

        this.ws.onclose = (event) => {
          console.log('WebSocket disconnected:', event.code, event.reason);
          this.isConnecting = false;
          this.stopHeartbeat();
          this.emit('disconnect', { code: event.code, reason: event.reason });
          
          if (!event.wasClean && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.scheduleReconnect();
          }
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          this.isConnecting = false;
          this.emit('error', { error });
          reject(error);
        };

      } catch (error) {
        this.isConnecting = false;
        reject(error);
      }
    });
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
    this.stopHeartbeat();
    this.reconnectAttempts = this.maxReconnectAttempts; // Prevent reconnection
  }

  // Message Handling
  send(message: WebSocketMessage): boolean {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(message));
        return true;
      } catch (error) {
        console.error('Failed to send WebSocket message:', error);
        return false;
      }
    } else {
      // Queue message if not connected
      this.messageQueue.push(message);
      return false;
    }
  }

  // Convenience methods for common message types
  sendPlayerAction(action: GameAction): boolean {
    const message = this.createMessage(MessageType.PLAYER_ACTION, 'player_action', action);
    return this.send(message);
  }

  sendPlayerMove(playerId: string, direction: string, position: { x: number, y: number }): boolean {
    const message = this.createMessage(MessageType.PLAYER_MOVE, 'player_move', {
      playerId,
      direction,
      position,
      timestamp: new Date(),
    });
    return this.send(message);
  }

  sendPlayerBomb(playerId: string, position: { x: number, y: number }): boolean {
    const message = this.createMessage(MessageType.PLAYER_BOMB, 'player_bomb', {
      playerId,
      position,
      timestamp: new Date(),
    });
    return this.send(message);
  }

  sendSyncRequest(playerId: string): boolean {
    const message = this.createMessage('PLAYER_SYNC_REQUEST' as MessageType, 'player_sync_request', {
      playerId
    });
    return this.send(message);
  }

  // Event System
  on(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  off(event: string, callback: Function): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  private emit(event: string, data: any): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in WebSocket event callback for ${event}:`, error);
        }
      });
    }
  }

  // Private Methods
  private handleMessage(message: WebSocketMessage): void {
    // Emit specific message type event
    this.emit(message.type, message.data);
    
    // Emit generic message event
    this.emit('message', message);

    // Handle common message types
    switch (message.messageType) {
      case MessageType.PONG:
        this.emit('pong', message.data);
        break;
      case MessageType.ERROR:
        this.emit('error', message.data);
        break;
      case MessageType.GAME_STATE:
        this.emit('game_state', message.data);
        break;
      case MessageType.PLAYER_JOINED:
        this.emit('player_joined', message.data);
        break;
      case MessageType.PLAYER_LEFT:
        this.emit('player_left', message.data);
        break;
      case MessageType.ROOM_UPDATE:
        this.emit('room_update', message.data);
        break;
      default:
        // Handle unknown message types
        this.emit('unknown_message', message);
        break;
    }
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatInterval = window.setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        const message = this.createMessage(MessageType.PING, 'ping', {});
        this.send(message);
      }
    }, 30000); // Ping every 30 seconds
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private flushMessageQueue(): void {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift()!;
      this.send(message);
    }
  }

  private scheduleReconnect(): void {
    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1); // Exponential backoff
    
    console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    setTimeout(() => {
      this.connect().catch(error => {
        console.error('Reconnect failed:', error);
      });
    }, delay);
  }

  // Getters
  get isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  get connectionState(): string {
    if (!this.ws) {return 'disconnected';}
    
    switch (this.ws.readyState) {
      case WebSocket.CONNECTING: return 'connecting';
      case WebSocket.OPEN: return 'connected';
      case WebSocket.CLOSING: return 'closing';
      case WebSocket.CLOSED: return 'disconnected';
      default: return 'unknown';
    }
  }
}

// Global WebSocket service instance
let webSocketService: WebSocketService | null = null;

export function getWebSocketService(): WebSocketService {
  if (!webSocketService) {
    // Use environment-specific WebSocket URL
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const hostname = window.location.hostname;
    // WebSocket server runs on port 8080, not the frontend port
    const wsUrl = `${protocol}//${hostname}:8080/ws`;
    
    webSocketService = new WebSocketService(wsUrl);
  }
  
  return webSocketService;
}

export function initializeWebSocket(): Promise<void> {
  const ws = getWebSocketService();
  return ws.connect();
}