/**
 * Messages Routes - Cloudflare Workers
 */

import { Hono } from 'hono';

const app = new Hono();

// Get messages between two users
app.get('/:userId/:otherUserId', async (c) => {
  try {
    const { userId, otherUserId } = c.req.param();

    const { results } = await c.env.DB.prepare(`
      SELECT m.*, u.username, u.profile_picture_url
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE (m.sender_id = ? AND m.recipient_id = ?)
         OR (m.sender_id = ? AND m.recipient_id = ?)
      ORDER BY m.created_at ASC
    `).bind(userId, otherUserId, otherUserId, userId).all();

    return c.json(results);
  } catch (error) {
    console.error('Error fetching messages:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Send message
app.post('/', async (c) => {
  try {
    const { sender_id, recipient_id, content, type, media_url } = await c.req.json();

    const { results } = await c.env.DB.prepare(`
      INSERT INTO messages (sender_id, recipient_id, content, type, media_url)
      VALUES (?, ?, ?, ?, ?)
      RETURNING *
    `).bind(sender_id, recipient_id, content, type || 'text', media_url || null).all();

    return c.json(results[0], 201);
  } catch (error) {
    console.error('Error sending message:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

export default app;
