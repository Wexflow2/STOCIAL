const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function check() {
    try {
        console.log('Connecting to:', process.env.DATABASE_URL.replace(/:[^:@]*@/, ':***@'));
        const res = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
        console.log('Tables found:', res.rows.map(r => r.table_name));

        // Check if moddatetime extension exists
        const ext = await pool.query(`SELECT * FROM pg_extension WHERE extname = 'moddatetime'`);
        console.log('Extension moddatetime:', ext.rows.length > 0 ? 'Installed' : 'Not Installed');

    } catch (err) {
        console.error('Database Error:', err);
    } finally {
        await pool.end();
    }
}

check();
