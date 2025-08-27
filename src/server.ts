/**
 * Bomberman Multiplayer Game Server
 * Entry point for the Node.js server with unified event system
 */

import Koa from 'koa';
import Router from 'koa-router';
import bodyParser from 'koa-bodyparser';
import cors from 'koa-cors';
import helmet from 'koa-helmet';
import logger from 'koa-logger';
import serve from 'koa-static';
import mount from 'koa-mount';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import path from 'path';

// Import our type definitions
import type { EventCategory, UniversalEvent } from './types/events';
import type { UnifiedGameServer } from './interfaces/core/UnifiedGameServer';
import { createConfiguredUnifiedGameServer } from './modules/UnifiedGameServerImpl';

const PORT = process.env.PORT || 8080;
const NODE_ENV = process.env.NODE_ENV || 'development';

/**
 * Initialize Koa application with middleware
 */
function createKoaApp(): Koa {
  const app = new Koa();

  // Security middleware
  app.use(helmet());
  
  // CORS configuration
  app.use(cors({
    origin: NODE_ENV === 'development' ? '*' : process.env.CORS_ORIGIN,
    credentials: true,
  }));

  // Logging middleware
  if (NODE_ENV === 'development') {
    app.use(logger());
  }

  // Body parser
  app.use(bodyParser({
    jsonLimit: '10mb',
    textLimit: '10mb',
  }));

  return app;
}

/**
 * Setup API routes with UnifiedGameServer integration
 */
function setupRoutes(app: Koa, unifiedGameServer?: UnifiedGameServer): void {
  const router = new Router();

  // Health check endpoint
  router.get('/health', async (ctx) => {
    ctx.body = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: NODE_ENV,
    };
  });

  // API routes with UnifiedGameServer integration
  router.get('/api/status', async (ctx) => {
    const serverStatus = unifiedGameServer?.getStatus();
    ctx.body = {
      server: 'Bomberman Multiplayer',
      unifiedGameServer: serverStatus || 'not initialized',
      timestamp: new Date().toISOString(),
    };
  });

  app.use(router.routes());
  app.use(router.allowedMethods());
}

/**
 * Setup static file serving
 */
function setupStaticFiles(app: Koa): void {
  // Serve static files from public directory
  const publicPath = path.join(__dirname, '../public');
  app.use(mount('/', serve(publicPath)));

  // Serve PWA files
  app.use(mount('/sw.js', serve(path.join(publicPath, 'sw.js'))));
  app.use(mount('/manifest.json', serve(path.join(publicPath, 'manifest.json'))));
  
  console.log(`📁 Static files served from: ${publicPath}`);
}

/**
 * Setup WebSocket server with UnifiedGameServer integration
 */
function setupWebSocketServer(server: any, unifiedGameServer: UnifiedGameServer): WebSocketServer {
  const wss = new WebSocketServer({
    server,
    path: '/ws',
  });

  wss.on('connection', async (ws, _request) => {
    const connectionId = `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    console.log(`🔌 WebSocket connection established: ${connectionId}`);
    
    // Integrate with UnifiedGameServer
    await unifiedGameServer.handleConnection({
      connectionId,
      socket: ws,
      ipAddress: '127.0.0.1', // TODO: Get real IP
      connectedAt: new Date(),
      playerId: undefined, // Will be set after authentication
    });
    
    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());
        console.log('📨 WebSocket message received:', message);
        
        // Create UniversalEvent from WebSocket message
        const event: UniversalEvent = {
          eventId: `evt_${Date.now()}`,
          category: message.category || EventCategory.PLAYER_ACTION,
          type: message.type || 'player_input',
          sourceId: connectionId,
          targets: [{ type: 'GAME' as any, id: message.gameId || 'unknown' }],
          data: message.data || message,
          metadata: {
            priority: 1 as any,
            deliveryMode: 'FIRE_AND_FORGET' as any,
            tags: ['websocket'],
          },
          timestamp: new Date(),
          version: '1.0.0',
        };
        
        await unifiedGameServer.publishEvent(event);
        
      } catch (error) {
        console.error('❌ WebSocket message parse error:', error);
      }
    });

    ws.on('close', async () => {
      console.log(`🔌 WebSocket connection closed: ${connectionId}`);
      await unifiedGameServer.handleDisconnection(connectionId);
    });

    ws.on('error', (error) => {
      console.error(`❌ WebSocket error for ${connectionId}:`, error);
    });
  });

  return wss;
}

/**
 * Start the server
 */
async function startServer(): Promise<void> {
  try {
    console.log('🚀 Starting Bomberman Multiplayer Server...');

    // Initialize UnifiedGameServer
    const unifiedGameServer = await createConfiguredUnifiedGameServer();
    await unifiedGameServer.start();

    // Create Koa application
    const app = createKoaApp();

    // Setup routes and middleware  
    setupRoutes(app, unifiedGameServer);
    setupStaticFiles(app);

    // Create HTTP server
    const server = createServer(app.callback());

    // Setup WebSocket server with UnifiedGameServer integration
    const wss = setupWebSocketServer(server, unifiedGameServer);

    // Start listening  
    const port = typeof PORT === 'string' ? parseInt(PORT, 10) : PORT;
    server.listen(port, '0.0.0.0', () => {
      console.log('🎮 Bomberman Server Started Successfully!');
      console.log(`📡 HTTP Server: http://localhost:${PORT}`);
      console.log(`🔌 WebSocket Server: ws://localhost:${PORT}/ws`);
      console.log(`🌍 Environment: ${NODE_ENV}`);
      console.log(`📊 Process ID: ${process.pid}`);
    });

    // Graceful shutdown handling
    const gracefulShutdown = (signal: string) => {
      console.log(`\n🛑 Received ${signal}, shutting down gracefully...`);
      
      wss.clients.forEach(client => {
        client.terminate();
      });
      
      server.close(() => {
        console.log('✅ Server closed successfully');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

/**
 * Health check function for Docker
 */
export async function healthCheck(): Promise<boolean> {
  // TODO: Check EventBus status, database connections, etc.
  // For now, always return healthy
  return true;
}

// Start server if this file is run directly
if (require.main === module) {
  startServer().catch(error => {
    console.error('❌ Server startup failed:', error);
    process.exit(1);
  });
}