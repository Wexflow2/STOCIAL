/**
 * Cloudflare Worker - Main Entry Point
 * Handles all HTTP requests and routes to appropriate handlers
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { compress } from 'hono/compress';
import { logger } from 'hono/logger';

// Initialize Hono app (Express-like framework for Workers)
const app = new Hono();

// Middleware
app.use('*', logger());
// app.use('*', compress());
app.use('*', cors({
  origin: (origin) => origin,
  credentials: true,
}));

// Rate limiting (using KV)
const rateLimit = async (c, next) => {
  const key = `ratelimit:${c.req.header('CF-Connecting-IP')}`;
  const count = await c.env.CACHE.get(key);

  if (count && parseInt(count) > 100) {
    return c.json({ error: 'Rate limit exceeded' }, 429);
  }

  await c.env.CACHE.put(key, (parseInt(count || 0) + 1).toString(), { expirationTtl: 900 });
  await next();
};

// app.use('/api/*', rateLimit);

// Health check
app.get('/', (c) => {
  return c.json({
    status: 'ok',
    service: 'STOCIAL API',
    environment: c.env.ENVIRONMENT,
    timestamp: new Date().toISOString()
  });
});

// Import route handlers
import postsRouter from './routes/posts';
import usersRouter from './routes/users';
import authRouter from './routes/auth';
import messagesRouter from './routes/messages';
import onboardingRouter from './routes/onboarding';

// Mount routes
app.route('/api/posts', postsRouter);

// Online users route (workaround for users.js issue)
app.get('/api/users/online', async (c) => {
  try {
    if (!c.env.WEBSOCKET_SERVER) {
      return c.json({ error: 'Binding missing', env: Object.keys(c.env) }, 200);
    }
    const id = c.env.WEBSOCKET_SERVER.idFromName('global');
    const stub = c.env.WEBSOCKET_SERVER.get(id);
    const response = await stub.fetch('http://do/online-users');
    const data = await response.json();
    return c.json({ onlineUsers: data.users });
  } catch (e) {
    return c.json({ error: String(e), stack: e.stack }, 200);
  }
});

// Routes
app.route('/api/users', usersRouter);
app.route('/api/auth', authRouter);
app.route('/api/messages', messagesRouter);
app.route('/api', onboardingRouter);

// WebSocket upgrade handler
app.get('/socket', async (c) => {
  const upgradeHeader = c.req.header('Upgrade');
  if (!upgradeHeader || upgradeHeader !== 'websocket') {
    return c.text('Expected Upgrade: websocket', 426);
  }

  // Get Durable Object stub
  const id = c.env.WEBSOCKET_SERVER.idFromName('global');
  const stub = c.env.WEBSOCKET_SERVER.get(id);

  return stub.fetch(c.req.raw);
});

// 404 handler
app.notFound((c) => {
  return c.json({ error: 'Not found' }, 404);
});

// Error handler
app.onError((err, c) => {
  console.error('Worker error:', err);
  const safeEnv = c && c.env ? Object.keys(c.env) : ['c.env is missing'];
  return c.json({
    error: 'Internal server error',
    raw_error: String(err),
    env_keys: safeEnv
  }, 200);
});

export default {
  fetch: app.fetch,
};

// Export Durable Object
export { WebSocketServer } from './durable-objects/websocket';
