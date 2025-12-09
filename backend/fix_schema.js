const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function check() {
    try {
        console.log('Checking users table columns...');
        const res = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users'
    `);

        const columns = res.rows.map(r => r.column_name);
        console.log('Columns found:', columns);

        if (!columns.includes('username_changed')) {
            console.log('MISSING: username_changed');
            // Fix it automatically
            console.log('Adding missing column...');
            await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS username_changed BOOLEAN DEFAULT FALSE');
            console.log('Column added successfully.');
        } else {
            console.log('OK: username_changed exists');
        }

    } catch (err) {
        console.error('Database Error:', err);
    } finally {
        await pool.end();
    }
}

check();
