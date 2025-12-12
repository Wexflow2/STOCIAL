/**
 * Onboarding Routes - Cloudflare Workers
 */

import { Hono } from 'hono';

const app = new Hono();

const getSupabaseConfig = (env) => {
  const url = env.SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error('Supabase config missing');
  }
  return { url, key };
};

const supabaseRequest = async (env, path, init = {}) => {
  const { url, key } = getSupabaseConfig(env);
  const target = `${url}/rest/v1${path}`;
  const headers = {
    apikey: key,
    Authorization: `Bearer ${key}`,
    Prefer: 'return=representation',
    ...init.headers,
  };
  const res = await fetch(target, { ...init, headers });
  return res;
};

// Generate username suggestions
app.post('/generate-usernames', async (c) => {
  try {
    const { firstName } = await c.req.json();

    if (!firstName || !firstName.trim()) {
      return c.json({ error: 'El nombre es requerido', usernames: [] }, 400);
    }

    const baseUsername = firstName.toLowerCase().replace(/\s+/g, '');
    const usernames = [];
    let attempts = 0;

    while (usernames.length < 5 && attempts < 30) {
      const suffix = attempts === 0 ? '' : Math.floor(Math.random() * 1000);
      const candidate = `${baseUsername}${suffix}`;

      const lookup = new URL('https://dummy.local'); // base not used
      lookup.searchParams.set('select', 'id');
      lookup.searchParams.set('username', `ilike.${candidate}`);
      lookup.searchParams.set('limit', '1');

      const res = await supabaseRequest(c.env, `/users${lookup.search}`, { method: 'GET' });
      const rows = await res.json();

      if (res.ok && Array.isArray(rows) && rows.length === 0 && !usernames.includes(candidate)) {
        usernames.push(candidate.toLowerCase());
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

    // Check username availability
    const lookup = new URL('https://dummy.local'); // base not used
    lookup.searchParams.set('select', 'id');
    lookup.searchParams.set('username', `ilike.${username}`);
    lookup.searchParams.set('limit', '1');

    const usernameRes = await supabaseRequest(c.env, `/users${lookup.search}`, { method: 'GET' });
    const usernameRows = await usernameRes.json();
    if (!usernameRes.ok) {
      return c.json({ error: usernameRows?.message || 'Error checking username' }, 500);
    }

    if (Array.isArray(usernameRows) && usernameRows.length > 0) {
      return c.json({ error: 'Username already taken' }, 400);
    }

    const fullName = `${firstName} ${lastName}`.trim();

    const insertRes = await supabaseRequest(c.env, '/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        firebase_uid: firebaseUid,
        email,
        username,
        name: fullName,
        bio: '',
        profile_picture_url: profilePictureUrl || null,
        birth_date: birthDate || null,
      }),
    });

    const created = await insertRes.json();
    if (!insertRes.ok) {
      return c.json({ error: created?.message || 'Error creating user' }, 500);
    }

    const newUser = Array.isArray(created) ? created[0] : created;
    return c.json(newUser, 201);
  } catch (error) {
    console.error('Error completing onboarding:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

export default app;
