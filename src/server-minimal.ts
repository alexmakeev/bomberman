/**
 * Minimal Bomberman Server for Testing with WebSocket Support
 */

import Koa from 'koa';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';

const app = new Koa();
const PORT = 8080;

// Simple health check endpoint
app.use(async (ctx, next) => {
  if (ctx.path === '/') {
    ctx.body = { status: 'OK', message: 'Bomberman Server Running with WebSocket' };
    ctx.status = 200;
  } else {
    await next();
  }
});

// Create HTTP server
const server = createServer(app.callback());

// Add WebSocket server
const wss = new WebSocketServer({ 
  server, 
  path: '/ws'
});

wss.on('connection', (ws, req) => {
  console.log(`🔌 WebSocket client connected from ${req.socket.remoteAddress}`);
  
  // Send welcome message
  ws.send(JSON.stringify({ 
    type: 'connection_established',
    message: 'Connected to Bomberman server' 
  }));
  
  // Handle messages
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());
      console.log('📨 Received message:', message.type || 'unknown');
      
      // Echo back for now (basic implementation)
      ws.send(JSON.stringify({
        type: 'echo',
        originalMessage: message,
        timestamp: Date.now()
      }));
    } catch (error) {
      console.error('❌ Invalid message format:', error);
    }
  });
  
  ws.on('close', () => {
    console.log('🔌 WebSocket client disconnected');
  });
  
  ws.on('error', (error) => {
    console.error('❌ WebSocket error:', error);
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`🎮 Bomberman server running on http://localhost:${PORT}`);
  console.log(`🔌 WebSocket server running on ws://localhost:${PORT}/ws`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});