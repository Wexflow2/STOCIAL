/**
 * Posts Routes - Cloudflare Workers
 */

import { Hono } from 'hono';

const app = new Hono();

// Get trending posts
app.get('/trending', async (c) => {
  try {
    const { currentUserId } = c.req.query();
    
    // Check cache first
    const cacheKey = `trending:${currentUserId || 'public'}`;
    const cached = await c.env.CACHE.get(cacheKey, 'json');
    
    if (cached) {
      return c.json(cached);
    }

    // Query D1 database
    const query = currentUserId ? `
      SELECT p.*, u.username, u.avatar_url, u.profile_picture_url,
             EXISTS(SELECT 1 FROM likes WHERE post_id = p.id AND user_id = ?) as isLiked,
             EXISTS(SELECT 1 FROM saved_posts WHERE post_id = p.id AND user_id = ?) as isSaved
      FROM posts p
      JOIN users u ON p.user_id = u.id
      WHERE u.is_private = FALSE OR u.id = ?
      ORDER BY p.likes_count DESC, p.created_at DESC
      LIMIT 30
    ` : `
      SELECT p.*, u.username, u.avatar_url, u.profile_picture_url
      FROM posts p
      JOIN users u ON p.user_id = u.id
      WHERE u.is_private = FALSE AND p.is_private = FALSE
      ORDER BY p.likes_count DESC, p.created_at DESC
      LIMIT 30
    `;

    const { results } = currentUserId 
      ? await c.env.DB.prepare(query).bind(currentUserId, currentUserId, currentUserId).all()
      : await c.env.DB.prepare(query).all();

    // Get hashtags for each post
    const postsWithMetadata = await Promise.all(results.map(async (post) => {
      const { results: hashtags } = await c.env.DB.prepare(`
        SELECT h.tag FROM hashtags h
        JOIN post_hashtags ph ON h.id = ph.hashtag_id
        WHERE ph.post_id = ?
      `).bind(post.id).all();

      return {
        ...post,
        hashtags: hashtags.map(h => h.tag),
      };
    }));

    // Cache for 5 minutes
    await c.env.CACHE.put(cacheKey, JSON.stringify(postsWithMetadata), { expirationTtl: 300 });

    return c.json(postsWithMetadata);
  } catch (error) {
    console.error('Error fetching trending posts:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Create post
app.post('/', async (c) => {
  try {
    const { user_id, image_url, media_url, caption, poll_question, poll_options } = await c.req.json();

    const mediaUrl = media_url || image_url;
    if (!mediaUrl && !poll_question) {
      return c.json({ error: 'Media or poll required' }, 400);
    }

    // Insert post
    const { results } = await c.env.DB.prepare(`
      INSERT INTO posts (user_id, image_url, caption, media_type, poll_question, poll_options)
      VALUES (?, ?, ?, 'image', ?, ?)
      RETURNING *
    `).bind(user_id, mediaUrl, caption, poll_question, JSON.stringify(poll_options || [])).all();

    const post = results[0];

    // Invalidate cache
    const cacheKeys = await c.env.CACHE.list({ prefix: 'trending:' });
    for (const key of cacheKeys.keys) {
      await c.env.CACHE.delete(key.name);
    }

    // Notify WebSocket clients
    const id = c.env.WEBSOCKET_SERVER.idFromName('global');
    const stub = c.env.WEBSOCKET_SERVER.get(id);
    // Note: We'd need to call a method on the stub to broadcast, but this is simplified

    return c.json(post, 201);
  } catch (error) {
    console.error('Error creating post:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Get post by ID
app.get('/:id', async (c) => {
  try {
    const { id } = c.req.param();
    const { currentUserId } = c.req.query();

    const query = `
      SELECT p.*, u.username, u.avatar_url, u.profile_picture_url
      FROM posts p
      JOIN users u ON p.user_id = u.id
      WHERE p.id = ?
    `;

    const { results } = await c.env.DB.prepare(query).bind(id).all();

    if (results.length === 0) {
      return c.json({ error: 'Post not found' }, 404);
    }

    return c.json(results[0]);
  } catch (error) {
    console.error('Error fetching post:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Like/unlike post
app.post('/like', async (c) => {
  try {
    const { post_id, user_id } = await c.req.json();

    // Check if already liked
    const { results: existing } = await c.env.DB.prepare(`
      SELECT * FROM likes WHERE post_id = ? AND user_id = ?
    `).bind(post_id, user_id).all();

    let liked = false;

    if (existing.length > 0) {
      // Unlike
      await c.env.DB.prepare(`DELETE FROM likes WHERE post_id = ? AND user_id = ?`)
        .bind(post_id, user_id).run();
    } else {
      // Like
      await c.env.DB.prepare(`INSERT INTO likes (post_id, user_id) VALUES (?, ?)`)
        .bind(post_id, user_id).run();
      liked = true;
    }

    // Get updated count
    const { results: countResult } = await c.env.DB.prepare(`
      SELECT likes_count FROM posts WHERE id = ?
    `).bind(post_id).all();

    const likesCount = countResult[0]?.likes_count || 0;

    // Invalidate cache
    await c.env.CACHE.delete(`trending:${user_id}`);
    await c.env.CACHE.delete(`trending:public`);

    return c.json({ liked, likesCount });
  } catch (error) {
    console.error('Error toggling like:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

export default app;
