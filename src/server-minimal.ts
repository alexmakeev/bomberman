/**
 * Minimal Bomberman Server for Testing
 */

import Koa from 'koa';

const app = new Koa();
const PORT = 8080;

// Simple health check endpoint
app.use(async (ctx, next) => {
  if (ctx.path === '/') {
    ctx.body = { status: 'OK', message: 'Bomberman Server Running' };
    ctx.status = 200;
  } else {
    await next();
  }
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`🎮 Bomberman server running on http://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});