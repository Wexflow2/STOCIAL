/**
 * Auth Routes - Cloudflare Workers
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

// Register/Login user
app.post('/register', async (c) => {
  try {
    const { firebase_uid, email, username, name } = await c.req.json();

    const { url, key } = getSupabaseConfig(c.env);
    const lookup = new URL(`${url}/rest/v1/users`);
    lookup.searchParams.set('select', '*');
    lookup.searchParams.append('or', `firebase_uid.eq.${firebase_uid},email.eq.${email}`);
    lookup.searchParams.set('limit', '1');

    const existingRes = await supabaseRequest(c.env, lookup.pathname + lookup.search, { method: 'GET' });
    if (!existingRes.ok) {
      const text = await existingRes.text();
      throw new Error(`Supabase lookup failed: ${text}`);
    }
    const existing = await existingRes.json();
    if (existing.length > 0) {
      return c.json(existing[0]);
    }

    const insertRes = await supabaseRequest(c.env, '/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ firebase_uid, email, username, name }),
    });

    const created = await insertRes.json();
    if (!insertRes.ok) {
      return c.json({ error: created?.message || 'Error creating user' }, 500);
    }

    return c.json(Array.isArray(created) ? created[0] : created, 201);
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

    if (!firebaseUid && !email) {
      return c.json({ error: 'Missing identifiers', isNewUser: true }, 400);
    }

    const { url } = getSupabaseConfig(c.env);
    const lookup = new URL(`${url}/rest/v1/users`);
    lookup.searchParams.set('select', '*');
    if (firebaseUid && email) {
      lookup.searchParams.append('or', `firebase_uid.eq.${firebaseUid},email.eq.${email}`);
    } else if (firebaseUid) {
      lookup.searchParams.set('firebase_uid', `eq.${firebaseUid}`);
    } else {
      lookup.searchParams.set('email', `eq.${email}`);
    }
    lookup.searchParams.set('limit', '1');

    const response = await supabaseRequest(c.env, lookup.pathname + lookup.search, { method: 'GET' });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data?.message || 'Supabase error');
    }

    if (Array.isArray(data) && data.length > 0) {
      const user = data[0];
      return c.json({ isNewUser: false, user, userId: user.id });
    }

    return c.json({ isNewUser: true });
  } catch (error) {
    console.error('Error checking user:', error);
    return c.json({ isNewUser: true, error: 'Supabase unavailable' }, 200);
  }
});

export default app;
