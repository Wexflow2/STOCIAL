/**
 * Users Routes - Cloudflare Workers
 */

import { Hono } from 'hono';

const app = new Hono();

// Search users
app.get('/search', async (c) => {
  try {
    const { q, currentUserId } = c.req.query();
    const searchQuery = `%${q}%`;

    const query = `
      SELECT u.id, u.username, u.name, u.avatar_url, u.profile_picture_url,
             u.followers_count, u.is_private
      FROM users u
      WHERE (u.username LIKE ? OR u.name LIKE ?)
      AND u.id != ?
      LIMIT 20
    `;

    const { results } = await c.env.DB.prepare(query)
      .bind(searchQuery, searchQuery, currentUserId || 0)
      .all();

    return c.json({ users: results });
  } catch (error) {
    console.error('Error searching users:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Get user by ID
app.get('/:id', async (c) => {
  try {
    const { id } = c.req.param();

    const { results } = await c.env.DB.prepare(`
      SELECT * FROM users WHERE id = ?
    `).bind(id).all();

    if (results.length === 0) {
      return c.json({ error: 'User not found' }, 404);
    }

    return c.json(results[0]);
  } catch (error) {
    console.error('Error fetching user:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Update user
app.post('/:id', async (c) => {
  try {
    const { id } = c.req.param();
    const data = await c.req.json();

    const updates = [];
    const values = [];

    if (data.username) {
      updates.push('username = ?');
      values.push(data.username);
    }
    if (data.name !== undefined) {
      updates.push('name = ?');
      values.push(data.name);
    }
    if (data.bio !== undefined) {
      updates.push('bio = ?');
      values.push(data.bio);
    }
    if (data.website !== undefined) {
      updates.push('website = ?');
      values.push(data.website);
    }
    if (data.location !== undefined) {
      updates.push('location = ?');
      values.push(data.location);
    }

    if (updates.length === 0) {
      return c.json({ error: 'No fields to update' }, 400);
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    const query = `UPDATE users SET ${updates.join(', ')} WHERE id = ? RETURNING *`;
    const { results } = await c.env.DB.prepare(query).bind(...values).all();

    return c.json(results[0]);
  } catch (error) {
    console.error('Error updating user:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Get online users
app.get('/online', async (c) => {
  try {
    // Get from Durable Object
    const id = c.env.WEBSOCKET_SERVER.idFromName('global');
    const stub = c.env.WEBSOCKET_SERVER.get(id);
    
    // This is simplified - you'd need to implement a method in the DO
    const onlineUsers = [];
    
    return c.json({ onlineUsers });
  } catch (error) {
    console.error('Error fetching online users:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

export default app;
