const pool = require('./db');

async function checkSchema() {
    try {
        console.log('Checking posts table schema...');
        const res = await pool.query(`
      SELECT column_name, data_type, character_maximum_length
      FROM information_schema.columns
      WHERE table_name = 'posts';
    `);
        console.table(res.rows);

        console.log('Checking users table schema...');
        const resUsers = await pool.query(`
      SELECT column_name, data_type, character_maximum_length
      FROM information_schema.columns
      WHERE table_name = 'users';
    `);
        console.table(resUsers.rows);

        console.log('Checking recent users...');
        const users = await pool.query('SELECT id, username, email FROM users ORDER BY created_at DESC LIMIT 5');
        console.table(users.rows);

    } catch (err) {
        console.error('Error checking schema:', err);
    } finally {
        pool.end();
    }
}

checkSchema();
