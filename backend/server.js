const express = require('express');
const cors = require('cors');
const compression = require('compression');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();
const pool = require('./db');
const { cacheMiddleware, invalidateCache } = require('./redis-config');

const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : "*",
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ['websocket', 'polling'],
  allowUpgrades: true
});

const PORT = process.env.PORT || 5000;

app.use(helmet({ 
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false 
}));
app.use(compression());
app.use(cors({
  origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : "*",
  credentials: true
}));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Demasiadas solicitudes, intenta de nuevo más tarde.'
});
app.use('/api/', limiter);

app.use((req, res, next) => {
  req.io = io;
  next();
});

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Utility functions for hashtags and mentions
function extractHashtags(text) {
  if (!text) return [];
  const hashtagRegex = /#[\w\u00C0-\u017F]+/g;
  const matches = text.match(hashtagRegex);
  return matches ? [...new Set(matches.map(tag => tag.slice(1).toLowerCase()))] : [];
}

function extractMentions(text) {
  if (!text) return [];
  const mentionRegex = /@([\w\.]+)/g;
  const matches = [];
  let match;
  while ((match = mentionRegex.exec(text)) !== null) {
    matches.push(match[1].toLowerCase());
  }
  return [...new Set(matches)]; // Remove duplicates
}

const detectMediaType = (url) => {
  if (!url) return 'image';
  const lower = url.toLowerCase();
  if (lower.startsWith('data:video') || lower.endsWith('.mp4') || lower.endsWith('.webm') || lower.endsWith('.mov')) {
    return 'video';
  }
  if (lower.startsWith('data:audio') || lower.endsWith('.mp3') || lower.endsWith('.wav') || lower.endsWith('.ogg')) {
    return 'audio';
  }
  return 'image';
};

const computePollCounts = (options = [], votes = {}) => {
  const counts = Array(options.length).fill(0);
  Object.values(votes || {}).forEach((idx) => {
    const num = parseInt(idx);
    if (!Number.isNaN(num) && counts[num] !== undefined) counts[num] += 1;
  });
  return counts;
};

// Ensure optional columns exist for extended posts
(async () => {
  try {
    await pool.query(`ALTER TABLE posts ADD COLUMN IF NOT EXISTS media_type TEXT DEFAULT 'image'`);
    await pool.query(`ALTER TABLE posts ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT FALSE`);
    await pool.query(`ALTER TABLE posts ADD COLUMN IF NOT EXISTS poll_question TEXT`);
    await pool.query(`ALTER TABLE posts ADD COLUMN IF NOT EXISTS poll_options JSONB DEFAULT '[]'::jsonb`);
    await pool.query(`ALTER TABLE posts ADD COLUMN IF NOT EXISTS poll_votes JSONB DEFAULT '{}'::jsonb`);
  } catch (err) {
    console.error('Error ensuring schema for posts:', err);
  }
})();

// Get online users status (must be before /api/users/:id)
app.get('/api/users/online', async (req, res) => {
  try {
    const onlineUserIds = Array.from(onlineUsers.keys());
    res.json({ onlineUsers: onlineUserIds });
  } catch (error) {
    console.error('Error fetching online users:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get suggested users (top followers)
app.get('/api/users/suggested', async (req, res) => {
  try {
    const { currentUserId } = req.query;
    const limit = 5;

    let query = `
      SELECT id, username, name, avatar_url, profile_picture_url, followers_count
      FROM users
      WHERE is_private = FALSE
    `;

    const params = [];

    if (currentUserId) {
      query += ` AND id != $1 AND id NOT IN (
        SELECT following_id FROM follows WHERE follower_id = $1 AND status = 'accepted'
      )`;
      params.push(currentUserId);
    }

    query += ` ORDER BY followers_count DESC LIMIT ${limit}`;

    const result = await pool.query(query, params);

    // Map avatar_url to avatar for frontend consistency if needed, 
    // but frontend seems to handle both or use a specific one.
    // Let's ensure we return what the frontend expects.
    const suggestedUsers = result.rows.map(user => ({
      ...user,
      avatar: user.profile_picture_url || user.avatar_url // normalized field
    }));

    res.json(suggestedUsers);
  } catch (error) {
    console.error('Error fetching suggested users:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { username, name, bio, website, location, profile_picture_url, cover_image_url } = req.body;

    const currentUserResult = await pool.query('SELECT username, username_changed FROM users WHERE id = $1', [id]);

    if (currentUserResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const currentUser = currentUserResult.rows[0];

    if (username && username !== currentUser.username) {
      if (currentUser.username_changed) {
        return res.status(400).json({ error: 'Ya has cambiado tu nombre de usuario. No puedes cambiarlo nuevamente.' });
      }
    }

    const updates = [];
    const values = [];
    let paramCount = 1;
    let usernameWillChange = false;

    if (username && username !== currentUser.username) {
      updates.push(`username = $${paramCount}`);
      values.push(username);
      paramCount++;
      usernameWillChange = true;
    }
    if (name !== undefined) {
      updates.push(`name = $${paramCount}`);
      values.push(name);
      paramCount++;
    }
    if (bio !== undefined) {
      updates.push(`bio = $${paramCount}`);
      values.push(bio);
      paramCount++;
    }
    if (website !== undefined) {
      updates.push(`website = $${paramCount}`);
      values.push(website);
      paramCount++;
    }
    if (location !== undefined) {
      updates.push(`location = $${paramCount}`);
      values.push(location);
      paramCount++;
    }
    if (profile_picture_url !== undefined) {
      updates.push(`profile_picture_url = $${paramCount}`);
      values.push(profile_picture_url);
      paramCount++;
    }
    if (cover_image_url !== undefined) {
      updates.push(`cover_image_url = $${paramCount}`);
      values.push(cover_image_url);
      paramCount++;
    }

    if (updates.length === 0) {
      return res.json(currentUser);
    }

    if (usernameWillChange) {
      updates.push('username_changed = true');
    }
    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    const query = `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`;
    const result = await pool.query(query, values);

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating user:', error);
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Ese nombre de usuario ya está en uso.' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Trending posts ordered by likes
app.get('/api/posts/trending', cacheMiddleware('trending', 300), async (req, res) => {
  try {
    const { currentUserId } = req.query;

    let query;
    if (currentUserId) {
      query = `
        SELECT p.*, u.username, u.avatar_url, u.profile_picture_url, u.is_private,
               EXISTS(SELECT 1 FROM likes WHERE post_id = p.id AND user_id = $1) as "isLiked",
               EXISTS(SELECT 1 FROM saved_posts WHERE post_id = p.id AND user_id = $1) as "isSaved"
        FROM posts p
        JOIN users u ON p.user_id = u.id
        WHERE u.is_private = FALSE
           OR u.id = $1
           OR EXISTS (
             SELECT 1 FROM follows
             WHERE follower_id = $1 AND following_id = u.id AND status = 'accepted'
           )
           AND (p.is_private = FALSE OR p.user_id = $1)
        ORDER BY p.likes_count DESC, p.created_at DESC
        LIMIT 30
      `;
    } else {
      query = `
        SELECT p.*, u.username, u.avatar_url, u.profile_picture_url
        FROM posts p
        JOIN users u ON p.user_id = u.id
        WHERE u.is_private = FALSE AND p.is_private = FALSE
        ORDER BY p.likes_count DESC, p.created_at DESC
        LIMIT 30
      `;
    }

    const result = await pool.query(query, currentUserId ? [currentUserId] : []);

    const postsWithMetadata = await Promise.all(result.rows.map(async (post) => {
      const hashtagsResult = await pool.query(
        `SELECT h.tag FROM hashtags h
         JOIN post_hashtags ph ON h.id = ph.hashtag_id
         WHERE ph.post_id = $1`,
        [post.id]
      );

      const mentionsResult = await pool.query(
        `SELECT u.id, u.username FROM users u
         JOIN mentions m ON u.id = m.mentioned_user_id
         WHERE m.post_id = $1`,
        [post.id]
      );

      return {
        ...post,
        media_type: detectMediaType(post.image_url || post.media_url),
        poll_options: post.poll_options || [],
        poll_votes: post.poll_votes || {},
        poll_question: post.poll_question || null,
        hashtags: hashtagsResult.rows.map(h => h.tag),
        mentioned_users: mentionsResult.rows
      };
    }));

    res.json(postsWithMetadata);
  } catch (error) {
    console.error('Error fetching trending posts:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/posts/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { currentUserId } = req.query;

    // Check if user has private account
    const userResult = await pool.query('SELECT is_private FROM users WHERE id = $1', [userId]);
    const isPrivate = userResult.rows[0]?.is_private || false;

    // If account is private and viewing user is not the owner
    if (isPrivate && currentUserId && parseInt(currentUserId) !== parseInt(userId)) {
      // Check if viewing user is an accepted follower
      const followResult = await pool.query(
        `SELECT status FROM follows 
         WHERE follower_id = $1 AND following_id = $2 AND status = 'accepted'`,
        [currentUserId, userId]
      );

      if (followResult.rows.length === 0) {
        // Not following or not accepted - return empty array
        return res.json([]);
      }
    }

    let query;

    if (currentUserId) {
      query = `
        SELECT p.*, 
               EXISTS(SELECT 1 FROM likes WHERE post_id = p.id AND user_id = $2) as "isLiked",
               EXISTS(SELECT 1 FROM saved_posts WHERE post_id = p.id AND user_id = $2) as "isSaved"
        FROM posts p 
        WHERE p.user_id = $1 
          AND ($2::int = p.user_id OR p.is_private = FALSE)
        ORDER BY p.created_at DESC
      `;
    } else {
      query = `
        SELECT * FROM posts 
        WHERE user_id = $1 
          AND is_private = FALSE
        ORDER BY created_at DESC
      `;
    }

    const result = await pool.query(query, currentUserId ? [userId, currentUserId] : [userId]);

    // Add hashtags and mentions for each post
    const postsWithMetadata = await Promise.all(result.rows.map(async (post) => {
      const hashtagsResult = await pool.query(
        `SELECT h.tag FROM hashtags h
         JOIN post_hashtags ph ON h.id = ph.hashtag_id
         WHERE ph.post_id = $1`,
        [post.id]
      );

      const mentionsResult = await pool.query(
        `SELECT u.id, u.username FROM users u
         JOIN mentions m ON u.id = m.mentioned_user_id
         WHERE m.post_id = $1`,
        [post.id]
      );

      return {
        ...post,
        media_type: detectMediaType(post.image_url || post.media_url),
        poll_options: post.poll_options || [],
        poll_votes: post.poll_votes || {},
        poll_question: post.poll_question || null,
        hashtags: hashtagsResult.rows.map(h => h.tag),
        mentioned_users: mentionsResult.rows
      };
    }));

    res.json(postsWithMetadata);
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/posts', async (req, res) => {
  try {
    const { user_id, image_url, media_url, caption, poll_question, poll_options } = req.body;

    const cleanMedia = (val) => {
      if (!val || typeof val !== 'string') return null;
      const trimmed = val.trim();
      return trimmed && trimmed.toLowerCase() !== 'null' ? trimmed : null;
    };

    const mediaUrl = cleanMedia(media_url) || cleanMedia(image_url);
    const parsedPollOptions = Array.isArray(poll_options)
      ? poll_options.filter(o => typeof o === 'string' && o.trim()).slice(0, 6)
      : [];

    const hasPoll = !!(poll_question && parsedPollOptions.length >= 2);
    if (!mediaUrl && !hasPoll) {
      return res.status(400).json({ error: 'Se requiere una imagen o video para publicar' });
    }

    const mediaType = detectMediaType(mediaUrl);
    const isPrivate = req.body?.is_private === true || req.body?.is_private === 'true';

    // Insert post
    const result = await pool.query(
      `INSERT INTO posts (user_id, image_url, caption, media_type, is_private, poll_question, poll_options) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) 
       RETURNING *`,
      [user_id, mediaUrl, caption, mediaType, isPrivate, poll_question || null, JSON.stringify(parsedPollOptions)]
    );

    const newPost = result.rows[0];

    // Extract and save hashtags
    const hashtags = extractHashtags(caption);
    console.log(`Extracted hashtags for post ${newPost.id}:`, hashtags);
    const hashtagIds = [];

    for (const tag of hashtags) {
      // Insert or get existing hashtag
      const hashtagResult = await pool.query(
        'INSERT INTO hashtags (tag) VALUES ($1) ON CONFLICT (tag) DO UPDATE SET tag = EXCLUDED.tag RETURNING id',
        [tag]
      );
      const hashtagId = hashtagResult.rows[0].id;
      hashtagIds.push(hashtagId);

      // Link hashtag to post
      await pool.query(
        'INSERT INTO post_hashtags (post_id, hashtag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [newPost.id, hashtagId]
      );
    }

    // Extract and save mentions
    const mentionUsernames = extractMentions(caption);
    const mentionedUsers = [];

    for (const username of mentionUsernames) {
      // Find user by username
      const userResult = await pool.query(
        'SELECT id, username FROM users WHERE LOWER(username) = $1',
        [username]
      );

      if (userResult.rows.length > 0) {
        const mentionedUser = userResult.rows[0];
        mentionedUsers.push(mentionedUser);

        // Save mention
        await pool.query(
          'INSERT INTO mentions (post_id, user_id, mentioned_user_id) VALUES ($1, $2, $3)',
          [newPost.id, user_id, mentionedUser.id]
        );

        // Create notification for mentioned user (if not mentioning self)
        if (mentionedUser.id !== user_id) {
          const notifResult = await pool.query(
            `INSERT INTO notifications (recipient_id, sender_id, type, post_id, created_at)
             VALUES ($1, $2, 'mention', $3, CURRENT_TIMESTAMP) RETURNING *`,
            [mentionedUser.id, user_id, newPost.id]
          );

          // Get sender info for notification
          const senderResult = await pool.query(
            'SELECT username, profile_picture_url FROM users WHERE id = $1',
            [user_id]
          );

          const notification = {
            ...notifResult.rows[0],
            sender_username: senderResult.rows[0].username,
            sender_avatar: senderResult.rows[0].profile_picture_url
          };

          // Emit real-time notification
          req.io.emit(`notification_${parseInt(mentionedUser.id)}`, notification);
        }
      }
    }

    // Get user info for post
    const userResult = await pool.query(
      'SELECT username, avatar_url, profile_picture_url FROM users WHERE id = $1',
      [user_id]
    );
    const user = userResult.rows[0];

    const postWithUser = {
      ...newPost,
      username: user.username,
      avatar_url: user.profile_picture_url || user.avatar_url,
      media_type: mediaType,
      poll_question: poll_question || null,
      poll_options: parsedPollOptions,
      poll_votes: {},
      hashtags: hashtags,
      mentioned_users: mentionedUsers.map(u => ({ id: u.id, username: u.username }))
    };

    // Emit new post event
    req.io.emit('new_post', postWithUser);

    await invalidateCache('trending:*');
    await invalidateCache('posts:*');

    res.json(postWithUser);
  } catch (error) {
    console.error('Error creating post:', error);
    console.error('Request body size:', JSON.stringify(req.body).length);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

app.post('/api/likes', async (req, res) => {
  try {
    const { post_id, user_id } = req.body;

    const checkResult = await pool.query(
      'SELECT * FROM likes WHERE post_id = $1 AND user_id = $2',
      [post_id, user_id]
    );

    let liked = false;

    if (checkResult.rows.length > 0) {
      await pool.query(
        'DELETE FROM likes WHERE post_id = $1 AND user_id = $2',
        [post_id, user_id]
      );
      await pool.query(
        'UPDATE posts SET likes_count = likes_count - 1 WHERE id = $1',
        [post_id]
      );
    } else {
      await pool.query(
        'INSERT INTO likes (post_id, user_id) VALUES ($1, $2) ON CONFLICT (post_id, user_id) DO NOTHING',
        [post_id, user_id]
      );
      await pool.query(
        'UPDATE posts SET likes_count = likes_count + 1 WHERE id = $1',
        [post_id]
      );
      liked = true;

      // Crear notificación si no es el propio usuario
      const postResult = await pool.query('SELECT user_id FROM posts WHERE id = $1', [post_id]);
      const postOwnerId = postResult.rows[0].user_id;

      if (postOwnerId !== user_id) {
        const notifResult = await pool.query(
          `INSERT INTO notifications (recipient_id, sender_id, type, post_id, created_at)
           VALUES ($1, $2, 'like', $3, CURRENT_TIMESTAMP) RETURNING *`,
          [postOwnerId, user_id, post_id]
        );

        // Obtener datos del remitente para la notificación en tiempo real
        const senderResult = await pool.query('SELECT username, profile_picture_url FROM users WHERE id = $1', [user_id]);
        const notification = {
          ...notifResult.rows[0],
          sender_username: senderResult.rows[0].username,
          sender_avatar: senderResult.rows[0].profile_picture_url
        };

        req.io.emit(`notification_${parseInt(postOwnerId)}`, notification);
      }
    }

    // Obtener contador actualizado
    const countResult = await pool.query('SELECT likes_count FROM posts WHERE id = $1', [post_id]);
    const likesCount = countResult.rows[0].likes_count;

    // Emitir actualización de likes
    req.io.emit('update_likes', { postId: post_id, likesCount });

    await invalidateCache('trending:*');
    await invalidateCache('posts:*');

    res.json({ liked, likesCount });
  } catch (error) {
    console.error('Error toggling like:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/comments', async (req, res) => {
  try {
    const { post_id, user_id, content } = req.body;

    const result = await pool.query(
      'INSERT INTO comments (post_id, user_id, content) VALUES ($1, $2, $3) RETURNING *',
      [post_id, user_id, content]
    );

    const comment = result.rows[0];

    // Obtener datos del usuario
    const userResult = await pool.query('SELECT username, profile_picture_url FROM users WHERE id = $1', [user_id]);
    const user = userResult.rows[0];

    const fullComment = {
      ...comment,
      username: user.username,
      avatar_url: user.profile_picture_url
    };

    // Emitir nuevo comentario
    req.io.emit(`new_comment_${post_id}`, fullComment);

    // Notificación
    const postResult = await pool.query('SELECT user_id FROM posts WHERE id = $1', [post_id]);
    const postOwnerId = postResult.rows[0].user_id;

    if (postOwnerId !== user_id) {
      const notifResult = await pool.query(
        `INSERT INTO notifications (recipient_id, sender_id, type, post_id, created_at)
         VALUES ($1, $2, 'comment', $3, CURRENT_TIMESTAMP) RETURNING *`,
        [postOwnerId, user_id, post_id]
      );

      const notification = {
        ...notifResult.rows[0],
        sender_username: user.username,
        sender_avatar: user.profile_picture_url
      };

      req.io.emit(`notification_${parseInt(postOwnerId)}`, notification);
    }

    res.json(fullComment);
  } catch (error) {
    console.error('Error creating comment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/comments/:postId', async (req, res) => {
  try {
    const { postId } = req.params;
    const { currentUserId } = req.query;
    
    let query;
    let params;
    
    if (currentUserId) {
      query = `
        SELECT c.*, u.username, u.profile_picture_url as avatar_url, u.id as user_id,
               EXISTS(SELECT 1 FROM comment_likes WHERE comment_id = c.id AND user_id = $2) as "isLiked"
        FROM comments c
        JOIN users u ON c.user_id = u.id
        WHERE c.post_id = $1
        ORDER BY c.created_at ASC`;
      params = [postId, currentUserId];
    } else {
      query = `
        SELECT c.*, u.username, u.profile_picture_url as avatar_url, u.id as user_id
        FROM comments c
        JOIN users u ON c.user_id = u.id
        WHERE c.post_id = $1
        ORDER BY c.created_at ASC`;
      params = [postId];
    }
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching comments:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Like/unlike comment
app.post('/api/comments/like', async (req, res) => {
  try {
    const { comment_id, user_id } = req.body;

    const existingLike = await pool.query(
      'SELECT * FROM comment_likes WHERE comment_id = $1 AND user_id = $2',
      [comment_id, user_id]
    );

    if (existingLike.rows.length > 0) {
      await pool.query(
        'DELETE FROM comment_likes WHERE comment_id = $1 AND user_id = $2',
        [comment_id, user_id]
      );
      const likesCount = await pool.query('SELECT likes_count FROM comments WHERE id = $1', [comment_id]);
      res.json({ liked: false, likesCount: likesCount.rows[0].likes_count });
    } else {
      await pool.query(
        'INSERT INTO comment_likes (comment_id, user_id) VALUES ($1, $2)',
        [comment_id, user_id]
      );
      const likesCount = await pool.query('SELECT likes_count FROM comments WHERE id = $1', [comment_id]);
      res.json({ liked: true, likesCount: likesCount.rows[0].likes_count });
    }
  } catch (error) {
    console.error('Error liking comment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/notifications/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await pool.query(
      `SELECT n.*, u.username as sender_username, u.profile_picture_url as sender_avatar
       FROM notifications n
       JOIN users u ON n.sender_id = u.id
       WHERE n.recipient_id = $1
       ORDER BY n.created_at DESC LIMIT 50`,
      [userId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/feed', async (req, res) => {
  try {
    const { currentUserId } = req.query;

    let query;
    if (currentUserId) {
      query = `
        SELECT p.*, u.username, u.avatar_url, u.profile_picture_url, u.is_private,
               EXISTS(SELECT 1 FROM likes WHERE post_id = p.id AND user_id = $1) as "isLiked",
               EXISTS(SELECT 1 FROM saved_posts WHERE post_id = p.id AND user_id = $1) as "isSaved"
        FROM posts p 
        JOIN users u ON p.user_id = u.id 
        WHERE u.is_private = FALSE 
           OR u.id = $1 
           OR EXISTS (
             SELECT 1 FROM follows 
             WHERE follower_id = $1 AND following_id = u.id AND status = 'accepted'
           )
           AND (p.is_private = FALSE OR p.user_id = $1)
        ORDER BY p.created_at DESC LIMIT 20
      `;
    } else {
      // Public feed - only public accounts
      query = `
        SELECT p.*, u.username, u.avatar_url, u.profile_picture_url 
        FROM posts p 
        JOIN users u ON p.user_id = u.id 
        WHERE u.is_private = FALSE AND p.is_private = FALSE
        ORDER BY p.created_at DESC LIMIT 20
      `;
    }

    const result = await pool.query(query, currentUserId ? [currentUserId] : []);

    // Add hashtags and mentions for each post
    const postsWithMetadata = await Promise.all(result.rows.map(async (post) => {
      // Get hashtags
      const hashtagsResult = await pool.query(
        `SELECT h.tag FROM hashtags h
         JOIN post_hashtags ph ON h.id = ph.hashtag_id
         WHERE ph.post_id = $1`,
        [post.id]
      );

      // Get mentions
      const mentionsResult = await pool.query(
        `SELECT u.id, u.username FROM users u
         JOIN mentions m ON u.id = m.mentioned_user_id
         WHERE m.post_id = $1`,
        [post.id]
      );

      return {
        ...post,
        media_type: detectMediaType(post.image_url || post.media_url),
        poll_options: post.poll_options || [],
        poll_votes: post.poll_votes || {},
        poll_question: post.poll_question || null,
        hashtags: hashtagsResult.rows.map(h => h.tag),
        mentioned_users: mentionsResult.rows
      };
    }));

    res.json(postsWithMetadata);
  } catch (error) {
    console.error('Error fetching feed:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Trending posts ordered by likes


// Get posts by hashtag
app.get('/api/posts/hashtag/:tag', async (req, res) => {
  try {
    const { tag } = req.params;
    const { currentUserId } = req.query;

    const query = `
      SELECT p.*, u.username, u.avatar_url, u.profile_picture_url,
             EXISTS(SELECT 1 FROM likes WHERE post_id = p.id AND user_id = $2) as "isLiked",
             EXISTS(SELECT 1 FROM saved_posts WHERE post_id = p.id AND user_id = $2) as "isSaved"
      FROM posts p
      JOIN users u ON p.user_id = u.id
      JOIN post_hashtags ph ON p.id = ph.post_id
      JOIN hashtags h ON ph.hashtag_id = h.id
      WHERE h.tag = $1
        AND (u.is_private = FALSE 
             OR u.id = $2
             OR EXISTS (
               SELECT 1 FROM follows 
               WHERE follower_id = $2 AND following_id = u.id AND status = 'accepted'
             ))
        AND (p.is_private = FALSE OR p.user_id = $2)
      ORDER BY p.created_at DESC
    `;

    console.log(`Searching for hashtag: ${tag.toLowerCase()}`);
    const result = await pool.query(query, [tag.toLowerCase(), currentUserId || null]);
    console.log(`Found ${result.rows.length} posts for hashtag ${tag}`);

    // Add hashtags and mentions
    const postsWithMetadata = await Promise.all(result.rows.map(async (post) => {
      const hashtagsResult = await pool.query(
        `SELECT h.tag FROM hashtags h
         JOIN post_hashtags ph ON h.id = ph.hashtag_id
         WHERE ph.post_id = $1`,
        [post.id]
      );

      const mentionsResult = await pool.query(
        `SELECT u.id, u.username FROM users u
         JOIN mentions m ON u.id = m.mentioned_user_id
         WHERE m.post_id = $1`,
        [post.id]
      );

      return {
        ...post,
        media_type: detectMediaType(post.image_url || post.media_url),
        poll_options: post.poll_options || [],
        poll_votes: post.poll_votes || {},
        poll_question: post.poll_question || null,
        hashtags: hashtagsResult.rows.map(h => h.tag),
        mentioned_users: mentionsResult.rows
      };
    }));

    res.json(postsWithMetadata);
  } catch (error) {
    console.error('Error fetching posts by hashtag:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get trending hashtags
app.get('/api/hashtags/trending', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT h.tag, COUNT(ph.post_id) as post_count
       FROM hashtags h
       JOIN post_hashtags ph ON h.id = ph.hashtag_id
       GROUP BY h.id, h.tag
       ORDER BY post_count DESC
       LIMIT 10`
    );

    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get suggested users (top followers)
app.get('/api/users/suggested', async (req, res) => {
  try {
    const { currentUserId } = req.query;
    const limit = 5;

    let query = `
      SELECT id, username, name, avatar_url, profile_picture_url, followers_count
      FROM users
      WHERE is_private = FALSE
    `;

    const params = [];

    if (currentUserId) {
      query += ` AND id != $1 AND id NOT IN (
        SELECT following_id FROM follows WHERE follower_id = $1 AND status = 'accepted'
      )`;
      params.push(currentUserId);
    }

    query += ` ORDER BY followers_count DESC LIMIT ${limit}`;

    const result = await pool.query(query, params);

    // Map avatar_url to avatar for frontend consistency if needed, 
    // but frontend seems to handle both or use a specific one.
    // Let's ensure we return what the frontend expects.
    const suggestedUsers = result.rows.map(user => ({
      ...user,
      avatar: user.profile_picture_url || user.avatar_url // normalized field
    }));

    res.json(suggestedUsers);
  } catch (error) {
    console.error('Error fetching suggested users:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


app.get('/api/social-links/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await pool.query(
      'SELECT * FROM social_links WHERE user_id = $1',
      [userId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching social links:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/social-links', async (req, res) => {
  try {
    const { user_id, platform, url } = req.body;
    const result = await pool.query(
      'INSERT INTO social_links (user_id, platform, url) VALUES ($1, $2, $3) RETURNING *',
      [user_id, platform, url]
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error creating social link:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/social-links/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body || {};

    const existing = await pool.query(
      'SELECT id, user_id FROM social_links WHERE id = $1',
      [id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Social link not found' });
    }

    if (userId && parseInt(userId, 10) !== existing.rows[0].user_id) {
      return res.status(403).json({ error: 'Not authorized to delete this link' });
    }

    await pool.query('DELETE FROM social_links WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting social link:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/mentions', async (req, res) => {
  try {
    const { post_id, user_id, mentioned_user_id } = req.body;
    const result = await pool.query(
      'INSERT INTO mentions (post_id, user_id, mentioned_user_id) VALUES ($1, $2, $3) RETURNING *',
      [post_id, user_id, mentioned_user_id]
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error creating mention:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/messages', async (req, res) => {
  try {
    const { sender_id, recipient_id, content, type = 'text', media_url } = req.body;

    // Verificar estado de la conversación
    const statusResult = await pool.query(
      `SELECT status FROM conversation_status 
       WHERE (user1_id = $1 AND user2_id = $2) OR (user1_id = $2 AND user2_id = $1)`,
      [sender_id, recipient_id]
    );

    let status = 'pending';
    if (statusResult.rows.length > 0) {
      status = statusResult.rows[0].status;
    } else {
      // Crear nueva conversación
      await pool.query(
        `INSERT INTO conversation_status (user1_id, user2_id, status) VALUES ($1, $2, 'pending')`,
        [sender_id, recipient_id]
      );
    }

    // Insertar mensaje
    const result = await pool.query(
      `INSERT INTO messages (sender_id, recipient_id, content, type, media_url, created_at)
       VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP) RETURNING *`,
      [sender_id, recipient_id, content, type, media_url]
    );

    const newMessage = result.rows[0];

    // Emitir evento de nuevo mensaje
    req.io.emit(`new_message_${parseInt(recipient_id)}`, newMessage);
    req.io.emit(`new_message_${parseInt(sender_id)}`, newMessage); // Para actualizar el chat del remitente también

    res.json({ message: newMessage, status });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/messages/:userId/:otherUserId', async (req, res) => {
  try {
    const { userId, otherUserId } = req.params;
    const result = await pool.query(
      `SELECT * FROM messages 
       WHERE (sender_id = $1 AND recipient_id = $2) OR (sender_id = $2 AND recipient_id = $1)
       ORDER BY created_at ASC`,
      [userId, otherUserId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/conversations/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    // Obtener usuarios con los que se ha hablado
    const result = await pool.query(
      `SELECT DISTINCT 
         CASE WHEN sender_id = $1 THEN recipient_id ELSE sender_id END as other_user_id
       FROM messages 
       WHERE sender_id = $1 OR recipient_id = $1`,
      [userId]
    );

    const conversations = [];
    for (const row of result.rows) {
      const otherUserId = row.other_user_id;

      // Obtener detalles del usuario
      const userResult = await pool.query(
        'SELECT id, username, name, profile_picture_url, avatar_url FROM users WHERE id = $1',
        [otherUserId]
      );
      const user = userResult.rows[0];

      // Obtener último mensaje
      const msgResult = await pool.query(
        `SELECT content, type, created_at, read FROM messages 
         WHERE (sender_id = $1 AND recipient_id = $2) OR (sender_id = $2 AND recipient_id = $1)
         ORDER BY created_at DESC LIMIT 1`,
        [userId, otherUserId]
      );
      const lastMessage = msgResult.rows[0];

      // Obtener estado
      const statusResult = await pool.query(
        `SELECT status FROM conversation_status 
         WHERE (user1_id = $1 AND user2_id = $2) OR (user1_id = $2 AND user2_id = $1)`,
        [userId, otherUserId]
      );
      const status = statusResult.rows[0]?.status || 'pending';

      conversations.push({
        ...user,
        lastMessage: lastMessage?.content || (lastMessage?.type === 'image' ? 'Imagen' : 'Audio'),
        timeAgo: lastMessage?.created_at,
        unreadCount: 0, // Implementar lógica real si es necesario
        status
      });
    }

    res.json(conversations);
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/conversations/accept', async (req, res) => {
  try {
    const { user1_id, user2_id } = req.body;
    await pool.query(
      `UPDATE conversation_status SET status = 'accepted' 
       WHERE (user1_id = $1 AND user2_id = $2) OR (user1_id = $2 AND user2_id = $1)`,
      [user1_id, user2_id]
    );
    res.json({ success: true });
  } catch (error) {
    console.error('Error accepting conversation:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/follow', async (req, res) => {
  try {
    const { follower_id, following_id } = req.body;

    if (!follower_id || !following_id) {
      return res.status(400).json({ error: 'Missing ids' });
    }

    if (parseInt(follower_id) === parseInt(following_id)) {
      return res.status(400).json({ error: 'No puedes seguirte a ti mismo.' });
    }

    const checkResult = await pool.query(
      'SELECT * FROM follows WHERE follower_id = $1 AND following_id = $2',
      [follower_id, following_id]
    );

    if (checkResult.rows.length > 0) {
      // Unfollow / cancel request
      await pool.query(
        'DELETE FROM follows WHERE follower_id = $1 AND following_id = $2',
        [follower_id, following_id]
      );

      // Only decrement if it was accepted
      if (checkResult.rows[0].status === 'accepted') {
        await pool.query(
          'UPDATE users SET followers_count = followers_count - 1 WHERE id = $1',
          [following_id]
        );
      }

      return res.json({ following: false, status: null });
    }

    // Create new follow request (pending)
    await pool.query(
      'INSERT INTO follows (follower_id, following_id, status) VALUES ($1, $2, \'pending\') ON CONFLICT (follower_id, following_id) DO NOTHING',
      [follower_id, following_id]
    );

    // Create follow request notification
    const notifResult = await pool.query(
      `INSERT INTO notifications (recipient_id, sender_id, type, created_at)
       VALUES ($1, $2, 'follow_request', CURRENT_TIMESTAMP) RETURNING *`,
      [following_id, follower_id]
    );

    const senderResult = await pool.query('SELECT username, profile_picture_url FROM users WHERE id = $1', [follower_id]);
    const notification = {
      ...notifResult.rows[0],
      sender_username: senderResult.rows[0].username,
      sender_avatar: senderResult.rows[0].profile_picture_url
    };

    req.io.emit(`notification_${parseInt(following_id)}`, notification);

    res.json({ following: true, status: 'pending' });
  } catch (error) {
    console.error('Error toggling follow:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Accept follow request
app.post('/api/follow/accept', async (req, res) => {
  try {
    const { follower_id, following_id } = req.body;

    await pool.query(
      'UPDATE follows SET status = \'accepted\' WHERE follower_id = $1 AND following_id = $2',
      [follower_id, following_id]
    );

    await pool.query(
      'UPDATE users SET followers_count = followers_count + 1 WHERE id = $1',
      [following_id]
    );

    // Actualizar o crear conversation_status para permitir mensajes
    await pool.query(
      `INSERT INTO conversation_status (user1_id, user2_id, status, created_at, updated_at)
       VALUES ($1, $2, 'accepted', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       ON CONFLICT (user1_id, user2_id) 
       DO UPDATE SET status = 'accepted', updated_at = CURRENT_TIMESTAMP`,
      [follower_id, following_id]
    );

    // Send accepted notification
    const notifResult = await pool.query(
      `INSERT INTO notifications (recipient_id, sender_id, type, created_at)
       VALUES ($1, $2, 'follow_accepted', CURRENT_TIMESTAMP) RETURNING *`,
      [follower_id, following_id]
    );

    const senderResult = await pool.query('SELECT username, profile_picture_url FROM users WHERE id = $1', [following_id]);
    const notification = {
      ...notifResult.rows[0],
      sender_username: senderResult.rows[0].username,
      sender_avatar: senderResult.rows[0].profile_picture_url
    };

    req.io.emit(`notification_${parseInt(follower_id)}`, notification);

    res.json({ success: true });
  } catch (error) {
    console.error('Error accepting follow:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Vote on poll
app.post('/api/posts/:postId/poll-vote', async (req, res) => {
  try {
    const { postId } = req.params;
    const { user_id, option_index } = req.body;

    if (!user_id && user_id !== 0) {
      return res.status(400).json({ error: 'Missing user_id' });
    }

    const postResult = await pool.query(
      'SELECT poll_question, poll_options, poll_votes FROM posts WHERE id = $1',
      [postId]
    );

    if (postResult.rows.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const post = postResult.rows[0];
    const options = post.poll_options || [];
    if (!post.poll_question || !Array.isArray(options) || options.length === 0) {
      return res.status(400).json({ error: 'This post has no poll' });
    }

    const idx = parseInt(option_index);
    if (Number.isNaN(idx) || idx < 0 || idx >= options.length) {
      return res.status(400).json({ error: 'Invalid option' });
    }

    const votes = post.poll_votes || {};
    votes[user_id] = idx;

    await pool.query(
      'UPDATE posts SET poll_votes = $1 WHERE id = $2',
      [JSON.stringify(votes), postId]
    );

    const counts = computePollCounts(options, votes);
    res.json({ poll_votes: votes, counts });
  } catch (error) {
    console.error('Error voting poll:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single post with metadata
app.get('/api/posts/view/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { currentUserId } = req.query;

    const query = `
        SELECT p.*, u.username, u.avatar_url, u.profile_picture_url,
               ${currentUserId ? `EXISTS(SELECT 1 FROM likes WHERE post_id = p.id AND user_id = $2) as "isLiked",
               EXISTS(SELECT 1 FROM saved_posts WHERE post_id = p.id AND user_id = $2) as "isSaved"` : `false as "isLiked", false as "isSaved"`}
        FROM posts p
        JOIN users u ON p.user_id = u.id
        WHERE p.id = $1
        LIMIT 1
      `;

    const params = currentUserId ? [id, currentUserId] : [id];
    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const post = result.rows[0];

    if (post.is_private && (!currentUserId || parseInt(currentUserId, 10) !== post.user_id)) {
      return res.status(403).json({ error: 'Esta publicación es privada' });
    }

    const hashtagsResult = await pool.query(
      `SELECT h.tag FROM hashtags h
         JOIN post_hashtags ph ON h.id = ph.hashtag_id
         WHERE ph.post_id = $1`,
      [post.id]
    );

    const mentionsResult = await pool.query(
      `SELECT u.id, u.username FROM users u
         JOIN mentions m ON u.id = m.mentioned_user_id
         WHERE m.post_id = $1`,
      [post.id]
    );

    res.json({
      ...post,
      media_type: detectMediaType(post.image_url || post.media_url),
      poll_options: post.poll_options || [],
      poll_votes: post.poll_votes || {},
      poll_question: post.poll_question || null,
      hashtags: hashtagsResult.rows.map(h => h.tag),
      mentioned_users: mentionsResult.rows,
    });
  } catch (error) {
    console.error('Error fetching single post:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete post
app.delete('/api/posts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id } = req.body || {};

    if (!user_id) {
      return res.status(400).json({ error: 'user_id requerido' });
    }

    const ownerCheck = await pool.query('SELECT user_id FROM posts WHERE id = $1', [id]);
    if (ownerCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Publicación no encontrada' });
    }
    if (parseInt(ownerCheck.rows[0].user_id, 10) !== parseInt(user_id, 10)) {
      return res.status(403).json({ error: 'No autorizado' });
    }

    await pool.query('DELETE FROM posts WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting post:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Toggle post privacy
app.post('/api/posts/:id/privacy', async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id, is_private } = req.body || {};

    if (typeof user_id === 'undefined' || typeof is_private === 'undefined') {
      return res.status(400).json({ error: 'user_id e is_private son requeridos' });
    }

    const ownerCheck = await pool.query('SELECT * FROM posts WHERE id = $1', [id]);
    if (ownerCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Publicación no encontrada' });
    }
    const post = ownerCheck.rows[0];
    if (parseInt(post.user_id, 10) !== parseInt(user_id, 10)) {
      return res.status(403).json({ error: 'No autorizado' });
    }

    const result = await pool.query(
      'UPDATE posts SET is_private = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [is_private === true || is_private === 'true', id]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating post privacy:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Reject follow request
app.post('/api/follow/reject', async (req, res) => {
  try {
    const { follower_id, following_id } = req.body;

    await pool.query(
      'DELETE FROM follows WHERE follower_id = $1 AND following_id = $2',
      [follower_id, following_id]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Error rejecting follow:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user followers
app.get('/api/users/:userId/followers', async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await pool.query(
      `SELECT u.id, u.username, u.name, u.profile_picture_url, u.avatar_url
       FROM follows f
       JOIN users u ON f.follower_id = u.id
       WHERE f.following_id = $1 AND f.status = 'accepted'
       ORDER BY f.created_at DESC`,
      [userId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching followers:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user following
app.get('/api/users/:userId/following', async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await pool.query(
      `SELECT u.id, u.username, u.name, u.profile_picture_url, u.avatar_url
       FROM follows f
       JOIN users u ON f.following_id = u.id
       WHERE f.follower_id = $1 AND f.status = 'accepted'
       ORDER BY f.created_at DESC`,
      [userId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching following:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user privacy settings
app.post('/api/users/:userId/privacy', async (req, res) => {
  try {
    const { userId } = req.params;
    const { is_private } = req.body;

    const result = await pool.query(
      'UPDATE users SET is_private = $1 WHERE id = $2 RETURNING *',
      [is_private, userId]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating privacy:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/messages/:userId/:otherUserId', async (req, res) => {
  try {
    const { userId, otherUserId } = req.params;
    const result = await pool.query(
      `SELECT m.*, 
        json_agg(
          json_build_object('user_id', mr.user_id, 'emoji', mr.emoji)
        ) FILTER (WHERE mr.id IS NOT NULL) as reactions
       FROM messages m
       LEFT JOIN message_reactions mr ON m.id = mr.message_id
       WHERE (m.sender_id = $1 AND m.recipient_id = $2) OR (m.sender_id = $2 AND m.recipient_id = $1)
       GROUP BY m.id
       ORDER BY m.created_at ASC`,
      [userId, otherUserId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add reaction to message
app.post('/api/messages/:messageId/reaction', async (req, res) => {
  try {
    const { messageId } = req.params;
    const { user_id, emoji } = req.body;

    const result = await pool.query(
      `INSERT INTO message_reactions (message_id, user_id, emoji)
       VALUES ($1, $2, $3)
       ON CONFLICT (message_id, user_id) 
       DO UPDATE SET emoji = $3
       RETURNING *`,
      [messageId, user_id, emoji]
    );

    // Get message details
    const msgResult = await pool.query('SELECT sender_id, recipient_id FROM messages WHERE id = $1', [messageId]);
    const msg = msgResult.rows[0];

    if (msg) {
      // Emit reaction event
      req.io.emit(`message_reaction_${msg.sender_id}`, { messageId, userId: user_id, emoji });
      req.io.emit(`message_reaction_${msg.recipient_id}`, { messageId, userId: user_id, emoji });

      // Create notification for message owner (only if reactor is not the owner)
      const messageOwnerId = msg.sender_id === user_id ? msg.recipient_id : msg.sender_id;
      if (messageOwnerId !== user_id) {
        const notification = await pool.query(
          `INSERT INTO notifications (recipient_id, sender_id, type, read, created_at)
           VALUES ($1, $2, $3, false, NOW())
           RETURNING *`,
          [messageOwnerId, user_id, 'message_reaction']
        );

        // Emit notification event
        req.io.emit(`notification_${messageOwnerId}`, notification.rows[0]);
      }
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error adding reaction:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Remove reaction from message
app.delete('/api/messages/:messageId/reaction/:userId', async (req, res) => {
  try {
    const { messageId, userId } = req.params;

    await pool.query(
      'DELETE FROM message_reactions WHERE message_id = $1 AND user_id = $2',
      [messageId, userId]
    );

    // Emit reaction removed event
    const msgResult = await pool.query('SELECT sender_id, recipient_id FROM messages WHERE id = $1', [messageId]);
    const msg = msgResult.rows[0];
    if (msg) {
      req.io.emit(`message_reaction_removed_${msg.sender_id}`, { messageId, userId });
      req.io.emit(`message_reaction_removed_${msg.recipient_id}`, { messageId, userId });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error removing reaction:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/post-hashtag', async (req, res) => {
  try {
    const { post_id, tag } = req.body;

    let tagResult = await pool.query(
      'SELECT id FROM hashtags WHERE tag = $1',
      [tag]
    );

    let hashtag_id;
    if (tagResult.rows.length === 0) {
      const newTag = await pool.query(
        'INSERT INTO hashtags (tag) VALUES ($1) RETURNING id',
        [tag]
      );
      hashtag_id = newTag.rows[0].id;
    } else {
      hashtag_id = tagResult.rows[0].id;
    }

    const result = await pool.query(
      'INSERT INTO post_hashtags (post_id, hashtag_id) VALUES ($1, $2) RETURNING *',
      [post_id, hashtag_id]
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error adding hashtag:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/check-user', async (req, res) => {
  try {
    const { email, uid } = req.body;
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);

    if (result.rows.length === 0) {
      res.json({ isNewUser: true });
    } else {
      res.json({ isNewUser: false, user: result.rows[0], userId: result.rows[0].id });
    }
  } catch (error) {
    console.error('Error checking user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/generate-usernames', async (req, res) => {
  try {
    const { firstName } = req.body;
    const baseUsername = firstName.toLowerCase().replace(/\s+/g, '');
    const usernames = [];

    for (let i = 0; i < 5; i++) {
      let username = baseUsername;
      if (i > 0) {
        username += Math.floor(Math.random() * 1000);
      }

      const checkResult = await pool.query(
        'SELECT id FROM users WHERE username = $1',
        [username]
      );

      if (checkResult.rows.length === 0) {
        usernames.push(username);
      } else {
        i--;
      }

      if (usernames.length === 5) break;
    }

    res.json({ usernames });
  } catch (error) {
    console.error('Error generating usernames:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/complete-onboarding', async (req, res) => {
  try {
    const { uid, email, firstName, lastName, birthDate, username, profilePictureUrl } = req.body;

    const checkUsername = await pool.query(
      'SELECT id FROM users WHERE username = $1',
      [username]
    );

    if (checkUsername.rows.length > 0) {
      return res.status(400).json({ error: 'Username already taken' });
    }

    const result = await pool.query(
      `INSERT INTO users (firebase_uid, email, username, name, bio, profile_picture_url, birth_date, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING *`,
      [uid, email, username, `${firstName} ${lastName}`, '', profilePictureUrl, birthDate]
    );

    const newUser = result.rows[0];

    // Auto-follow Sotiale Official if it exists
    try {
      const officialResult = await pool.query(
        'SELECT id FROM users WHERE LOWER(username) = LOWER($1) LIMIT 1',
        ['Sotiale Official']
      );

      if (officialResult.rows.length > 0) {
        const officialId = officialResult.rows[0].id;
        if (officialId !== newUser.id) {
          await pool.query(
            `INSERT INTO follows (follower_id, following_id, status)
               VALUES ($1, $2, 'accepted')
               ON CONFLICT (follower_id, following_id) DO NOTHING`,
            [newUser.id, officialId]
          );

          await pool.query(
            'UPDATE users SET followers_count = followers_count + 1 WHERE id = $1',
            [officialId]
          );
        }
      }
    } catch (err) {
      console.error('Error auto-following Sotiale Official:', err);
    }

    res.json(newUser);
  } catch (error) {
    console.error('Error completing onboarding:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/search-users', cacheMiddleware('users', 180), async (req, res) => {
  try {
    const { q, currentUserId } = req.query;
    const searchQuery = `%${q}%`;

    const result = await pool.query(
      `SELECT id, username, name, bio, profile_picture_url, followers_count, is_private
       FROM users
       WHERE (username ILIKE $1 OR name ILIKE $1)
         AND ($2::int IS NULL OR id != $2::int)
       LIMIT 20`,
      [searchQuery, currentUserId || null]
    );

    const users = await Promise.all(result.rows.map(async (user) => {
      let isFollowing = false;
      let followStatus = null; // null, 'pending', 'accepted'

      if (currentUserId) {
        const followCheck = await pool.query(
          'SELECT status FROM follows WHERE follower_id = $1 AND following_id = $2',
          [currentUserId, user.id]
        );
        if (followCheck.rows.length > 0) {
          followStatus = followCheck.rows[0].status;
          isFollowing = followStatus === 'accepted';
        }
      }

      return {
        id: user.id,
        username: user.username,
        name: user.name,
        bio: user.bio || '',
        avatar: user.profile_picture_url || 'https://via.placeholder.com/50',
        avatar_url: user.profile_picture_url,
        profile_picture_url: user.profile_picture_url,
        isFollowing,
        followStatus,
        followers: user.followers_count || 0,
        is_private: user.is_private || false,
      };
    }));

    res.json({ users });
  } catch (error) {
    console.error('Error searching users:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/upload-story', async (req, res) => {
  try {
    const { userId, caption } = req.body;

    const result = await pool.query(
      `INSERT INTO stories (user_id, image_url, caption, created_at, expires_at)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '24 hours')
       RETURNING *`,
      [userId, 'https://via.placeholder.com/400x600', caption || '']
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error uploading story:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Endpoint para buscar publicaciones por hashtag
// Endpoint para guardar/quitar guardado
app.post('/api/saved', async (req, res) => {
  try {
    const { post_id, user_id } = req.body;

    const checkResult = await pool.query(
      'SELECT * FROM saved_posts WHERE post_id = $1 AND user_id = $2',
      [post_id, user_id]
    );

    let saved = false;

    if (checkResult.rows.length > 0) {
      await pool.query(
        'DELETE FROM saved_posts WHERE post_id = $1 AND user_id = $2',
        [post_id, user_id]
      );
    } else {
      await pool.query(
        'INSERT INTO saved_posts (post_id, user_id) VALUES ($1, $2)',
        [post_id, user_id]
      );
      saved = true;
    }

    res.json({ saved });
  } catch (error) {
    console.error('Error toggling save:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a story
app.post('/api/stories', async (req, res) => {
  try {
    const { user_id, image_url, caption, type = 'image', duration = 5 } = req.body;

    // Calculate expiration (24 hours from now)
    const result = await pool.query(
      `INSERT INTO stories (user_id, image_url, caption, type, duration, expires_at) 
       VALUES ($1, $2, $3, $4, $5, NOW() + INTERVAL '24 hours') 
       RETURNING *`,
      [user_id, image_url, caption, type, duration]
    );

    const newStory = result.rows[0];

    // Get user info
    const userResult = await pool.query(
      'SELECT username, avatar_url, profile_picture_url FROM users WHERE id = $1',
      [user_id]
    );
    const user = userResult.rows[0];

    const fullStory = {
      ...newStory,
      username: user.username,
      avatar_url: user.profile_picture_url || user.avatar_url
    };

    // Emit new story event
    req.io.emit('new_story', fullStory);

    res.json(fullStory);
  } catch (error) {
    console.error('Error creating story:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get stories feed
app.get('/api/stories/feed', async (req, res) => {
  try {
    const { currentUserId } = req.query;

    if (!currentUserId) {
      return res.status(400).json({ error: 'currentUserId is required' });
    }

    // Get stories from followed users + self, not expired
    const result = await pool.query(
      `SELECT s.*, u.username, u.avatar_url, u.profile_picture_url
       FROM stories s
       JOIN users u ON s.user_id = u.id
       WHERE s.expires_at > NOW()
         AND (
           s.user_id = $1
           OR s.user_id IN (
             SELECT following_id FROM follows 
             WHERE follower_id = $1 AND status = 'accepted'
           )
         )
       ORDER BY s.created_at ASC`,
      [currentUserId]
    );

    // Group by user
    const storiesByUser = {};
    result.rows.forEach(story => {
      if (!storiesByUser[story.user_id]) {
        storiesByUser[story.user_id] = {
          user_id: story.user_id,
          username: story.username,
          avatar_url: story.profile_picture_url || story.avatar_url,
          stories: []
        };
      }
      storiesByUser[story.user_id].stories.push(story);
    });

    res.json(Object.values(storiesByUser));
  } catch (error) {
    console.error('Error fetching stories feed:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Endpoint para obtener posts guardados
app.get('/api/users/:userId/saved-posts', async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await pool.query(
      `SELECT p.*, 
              EXISTS(SELECT 1 FROM likes WHERE post_id = p.id AND user_id = $1) as "isLiked",
              true as "isSaved"
       FROM posts p
       JOIN saved_posts sp ON p.id = sp.post_id
       WHERE sp.user_id = $1
       ORDER BY sp.created_at DESC`,
      [userId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching saved posts:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Endpoint para obtener posts que le gustan al usuario
app.get('/api/users/:userId/liked-posts', async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await pool.query(
      `SELECT p.*, 
              true as "isLiked",
              EXISTS(SELECT 1 FROM saved_posts WHERE post_id = p.id AND user_id = $1) as "isSaved"
       FROM posts p
       JOIN likes l ON p.id = l.post_id
       WHERE l.user_id = $1
       ORDER BY l.created_at DESC`,
      [userId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching liked posts:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/hashtag/:tag', async (req, res) => {
  try {
    const { tag } = req.params;

    const result = await pool.query(
      `SELECT p.*, u.username, u.profile_picture_url, u.avatar_url
       FROM posts p
       JOIN users u ON p.user_id = u.id
       JOIN post_hashtags ph ON p.id = ph.post_id
       JOIN hashtags h ON ph.hashtag_id = h.id
       WHERE h.tag = $1
       ORDER BY p.created_at DESC`,
      [tag]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching posts by hashtag:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Track online users
const onlineUsers = new Map(); // userId -> socketId

io.on('connection', (socket) => {
  console.log('Un cliente se ha conectado');

  socket.on('user_online', (userId) => {
    onlineUsers.set(parseInt(userId), socket.id);
    io.emit('user_status_change', { userId: parseInt(userId), isOnline: true });
    console.log(`Usuario ${userId} en línea`);
  });

  socket.on('disconnect', () => {
    // Find and remove user from online list
    for (const [userId, socketId] of onlineUsers.entries()) {
      if (socketId === socket.id) {
        onlineUsers.delete(userId);
        io.emit('user_status_change', { userId, isOnline: false });
        console.log(`Usuario ${userId} desconectado`);
        break;
      }
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
