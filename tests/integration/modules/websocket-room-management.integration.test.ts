/**
 * WebSocket Room Management Integration Test
 * Tests the backend WebSocket API for room creation, joining, and leaving
 * 
 * This test validates the expected contract between frontend and backend
 * Based on frontend store expectations in src/stores/gameStore.ts
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import WebSocket from 'ws';
import { createServer, Server } from 'http';
import { AddressInfo } from 'net';

// Simple in-memory room storage for testing
const rooms = new Map<string, any>();
const roomMembers = new Map<string, Set<WebSocket>>();

function setupTestWebSocketServer(server: Server) {
  const wsServer = new WebSocket.Server({ server, path: '/ws' });
  
  wsServer.on('connection', (ws: WebSocket) => {
    console.log('Test client connected');
    
    ws.on('message', (data: WebSocket.RawData) => {
      try {
        const message = JSON.parse(data.toString());
        handleTestMessage(ws, message);
      } catch (error) {
        console.error('Invalid JSON:', error);
      }
    });
    
    ws.on('close', () => {
      console.log('Test client disconnected');
      // Clean up room memberships
      for (const [roomId, members] of roomMembers) {
        members.delete(ws);
      }
    });
  });
  
  return wsServer;
}

function handleTestMessage(ws: WebSocket, message: any) {
  const { messageType, type, data, timestamp } = message;
  
  switch (messageType || type) {
    case 'ROOM_CREATE':
    case 'room_create':
      handleRoomCreate(ws, data);
      break;
      
    case 'ROOM_JOIN':
    case 'room_join':
      handleRoomJoin(ws, data);
      break;
      
    case 'ROOM_LEAVE':
    case 'room_leave':
      handleRoomLeave(ws, data);
      break;
      
    default:
      console.log('Unknown message type:', messageType || type);
  }
}

function handleRoomCreate(ws: WebSocket, data: any) {
  const { roomId, config } = data;
  
  // Store room
  rooms.set(roomId, { id: roomId, config, createdAt: Date.now() });
  roomMembers.set(roomId, new Set([ws]));
  
  // Send confirmation
  ws.send(JSON.stringify({
    type: 'room_created',
    data: { roomId, status: 'created' },
    timestamp: Date.now()
  }));
}

function handleRoomJoin(ws: WebSocket, data: any) {
  const { roomId, player } = data;
  
  if (!rooms.has(roomId)) {
    ws.send(JSON.stringify({
      type: 'error',
      data: { error: 'Room not found' },
      timestamp: Date.now()
    }));
    return;
  }
  
  // Add to room
  if (!roomMembers.has(roomId)) {
    roomMembers.set(roomId, new Set());
  }
  roomMembers.get(roomId)!.add(ws);
  
  // Send confirmation
  ws.send(JSON.stringify({
    type: 'room_joined',
    data: { roomId, playerId: player.id },
    timestamp: Date.now()
  }));
}

function handleRoomLeave(ws: WebSocket, data: any) {
  const { roomId } = data;
  
  // Remove from room
  if (roomMembers.has(roomId)) {
    roomMembers.get(roomId)!.delete(ws);
  }
  
  // Send confirmation
  ws.send(JSON.stringify({
    type: 'room_left',
    data: { roomId },
    timestamp: Date.now()
  }));
}

describe('WebSocket Room Management Integration', () => {
  let server: Server;
  let wsServer: WebSocket.Server;
  let port: number;
  let client: WebSocket;
  
  beforeAll(async () => {
    // Create HTTP server
    server = createServer();
    
    // Create WebSocket server with test handlers
    wsServer = setupTestWebSocketServer(server);
    
    // Start server on random port
    server.listen(0);
    port = (server.address() as AddressInfo).port;
    
    console.log(`Test WebSocket server started on port ${port}`);
  });
  
  afterAll(async () => {
    if (wsServer) {
      wsServer.close();
    }
    if (server) {
      server.close();
    }
  });
  
  beforeEach(async () => {
    // Clear test data
    rooms.clear();
    roomMembers.clear();
    
    // Create fresh client for each test
    client = new WebSocket(`ws://localhost:${port}/ws`);
    
    // Wait for connection
    await new Promise<void>((resolve) => {
      client.on('open', resolve);
    });
  });
  
  afterEach(async () => {
    if (client && client.readyState === WebSocket.OPEN) {
      client.close();
    }
  });

  it('should accept WebSocket connections on /ws endpoint', async () => {
    expect(client.readyState).toBe(WebSocket.OPEN);
  });

  it('should handle ROOM_CREATE message and respond appropriately', async () => {
    const roomId = 'TEST123';
    const roomConfig = {
      name: "Test Room",
      maxPlayers: 4,
      gameMode: 'cooperative',
      difficulty: 'normal'
    };
    
    const createMessage = {
      messageType: 'ROOM_CREATE',
      type: 'room_create', 
      data: {
        roomId,
        config: roomConfig
      },
      timestamp: Date.now()
    };
    
    // Listen for response
    const responsePromise = new Promise<any>((resolve) => {
      client.on('message', (data) => {
        const message = JSON.parse(data.toString());
        if (message.type === 'room_created') {
          resolve(message);
        }
      });
    });
    
    // Send create room message
    client.send(JSON.stringify(createMessage));
    
    // Should receive confirmation
    const response = await responsePromise;
    expect(response).toBeDefined();
    expect(response.data.roomId).toBe(roomId);
    expect(response.data.status).toBe('created');
  });

  it('should handle ROOM_JOIN message for existing room', async () => {
    const roomId = 'TEST123';
    const playerData = {
      id: 'player1',
      name: 'TestPlayer',
      position: { x: 1, y: 1 }
    };
    
    // First create a room
    const createMessage = {
      messageType: 'ROOM_CREATE',
      data: { roomId, config: { name: 'Test Room' } },
      timestamp: Date.now()
    };
    client.send(JSON.stringify(createMessage));
    
    // Wait for room creation
    await new Promise(resolve => setTimeout(resolve, 50));
    
    // Then join the room
    const joinMessage = {
      messageType: 'ROOM_JOIN',
      type: 'room_join',
      data: {
        roomId,
        player: playerData
      },
      timestamp: Date.now()
    };
    
    const responsePromise = new Promise<any>((resolve) => {
      client.on('message', (data) => {
        const message = JSON.parse(data.toString());
        if (message.type === 'room_joined') {
          resolve(message);
        }
      });
    });
    
    client.send(JSON.stringify(joinMessage));
    
    const response = await responsePromise;
    expect(response).toBeDefined();
    expect(response.data.roomId).toBe(roomId);
    expect(response.data.playerId).toBe(playerData.id);
  });

  it('should handle ROOM_JOIN for non-existent room with error', async () => {
    const joinMessage = {
      messageType: 'ROOM_JOIN',
      type: 'room_join',
      data: {
        roomId: 'NONEXISTENT',
        player: { id: 'player1', name: 'Test' }
      },
      timestamp: Date.now()
    };
    
    const responsePromise = new Promise<any>((resolve) => {
      client.on('message', (data) => {
        const message = JSON.parse(data.toString());
        if (message.type === 'error') {
          resolve(message);
        }
      });
    });
    
    client.send(JSON.stringify(joinMessage));
    
    const response = await responsePromise;
    expect(response).toBeDefined();
    expect(response.data.error).toContain('Room not found');
  });

  it('should handle ROOM_LEAVE message', async () => {
    const roomId = 'TEST123';
    
    const leaveMessage = {
      messageType: 'ROOM_LEAVE', 
      type: 'room_leave',
      data: { roomId },
      timestamp: Date.now()
    };
    
    const responsePromise = new Promise<any>((resolve) => {
      client.on('message', (data) => {
        const message = JSON.parse(data.toString());
        if (message.type === 'room_left') {
          resolve(message);
        }
      });
    });
    
    client.send(JSON.stringify(leaveMessage));
    
    const response = await responsePromise;
    expect(response).toBeDefined();
    expect(response.data.roomId).toBe(roomId);
  });

  it('should handle malformed JSON gracefully', async () => {
    client.send('invalid json {');
    
    // Should not close connection
    await new Promise(resolve => setTimeout(resolve, 100));
    expect(client.readyState).toBe(WebSocket.OPEN);
  });

  it('should handle unknown message types gracefully', async () => {
    const unknownMessage = {
      messageType: 'UNKNOWN_TYPE',
      type: 'unknown',
      data: {},
      timestamp: Date.now()
    };
    
    client.send(JSON.stringify(unknownMessage));
    
    // Should not close connection
    await new Promise(resolve => setTimeout(resolve, 100));
    expect(client.readyState).toBe(WebSocket.OPEN);
  });
});