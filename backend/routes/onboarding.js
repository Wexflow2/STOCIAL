/**
 * Onboarding Routes - Cloudflare Workers
 */

import { Hono } from 'hono';

const app = new Hono();

// Generate username suggestions
app.post('/generate-usernames', async (c) => {
  try {
    const { firstName } = await c.req.json();

    if (!firstName || !firstName.trim()) {
      return c.json({ error: 'El nombre es requerido', usernames: [] }, 400);
    }

    if (!c.env.DB) {
      return c.json({ error: 'Database binding not configured', usernames: [] }, 500);
    }

    const baseUsername = firstName.toLowerCase().replace(/\s+/g, '');
    const usernames = [];
    let attempts = 0;

    while (usernames.length < 5 && attempts < 30) {
      const suffix = attempts === 0 ? '' : Math.floor(Math.random() * 1000);
      const candidate = `${baseUsername}${suffix}`;

      const { results } = await c.env.DB.prepare(
        'SELECT id FROM users WHERE LOWER(username) = LOWER(?) LIMIT 1'
      ).bind(candidate).all();

      if (results.length === 0 && !usernames.includes(candidate)) {
        usernames.push(candidate);
      }

      attempts++;
    }

    return c.json({ usernames });
  } catch (error) {
    console.error('Error generating usernames:', error);
    return c.json({ error: 'Internal server error', usernames: [] }, 500);
  }
});

// Complete onboarding and create user
app.post('/complete-onboarding', async (c) => {
  try {
    const { uid, firebase_uid, email, firstName, lastName, birthDate, username, profilePictureUrl } = await c.req.json();
    const firebaseUid = firebase_uid || uid;

    if (!firebaseUid || !email || !username || !firstName || !lastName) {
      return c.json({ error: 'Faltan datos requeridos' }, 400);
    }

    if (!c.env.DB) {
      return c.json({ error: 'Database binding not configured' }, 500);
    }

    // Check username availability
    const { results: usernameCheck } = await c.env.DB.prepare(
      'SELECT id FROM users WHERE LOWER(username) = LOWER(?) LIMIT 1'
    ).bind(username).all();

    if (usernameCheck.length > 0) {
      return c.json({ error: 'Username already taken' }, 400);
    }

    const fullName = `${firstName} ${lastName}`.trim();

    const { results } = await c.env.DB.prepare(`
      INSERT INTO users (firebase_uid, email, username, name, bio, profile_picture_url, birth_date, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *
    `).bind(
      firebaseUid,
      email,
      username,
      fullName,
      '',
      profilePictureUrl || null,
      birthDate || null
    ).all();

    const newUser = results[0];
    return c.json(newUser, 201);
  } catch (error) {
    console.error('Error completing onboarding:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

export default app;
