/**
 * Auth Routes - Cloudflare Workers
 */

import { Hono } from 'hono';

const app = new Hono();

// Register/Login user
app.post('/register', async (c) => {
  try {
    const { firebase_uid, email, username, name } = await c.req.json();

    // Check if user exists
    const { results: existing } = await c.env.DB.prepare(`
      SELECT * FROM users WHERE firebase_uid = ? OR email = ?
    `).bind(firebase_uid, email).all();

    if (existing.length > 0) {
      return c.json(existing[0]);
    }

    // Create new user
    const { results } = await c.env.DB.prepare(`
      INSERT INTO users (firebase_uid, email, username, name)
      VALUES (?, ?, ?, ?)
      RETURNING *
    `).bind(firebase_uid, email, username, name).all();

    return c.json(results[0], 201);
  } catch (error) {
    console.error('Error registering user:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

export default app;
