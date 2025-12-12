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

// Check user existence
app.post('/check-user', async (c) => {
  try {
    const { firebase_uid, uid, email } = await c.req.json();
    const firebaseUid = firebase_uid || uid;

    if (!c.env.DB) {
      return c.json({ error: 'Database binding not configured', isNewUser: true }, 500);
    }

    const { results } = await c.env.DB.prepare(`
      SELECT * FROM users WHERE firebase_uid = ? OR email = ?
    `).bind(firebaseUid, email).all();

    if (results.length > 0) {
      const user = results[0];
      return c.json({ isNewUser: false, user, userId: user.id });
    }

    return c.json({ isNewUser: true });
  } catch (error) {
    console.error('Error checking user:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

export default app;
