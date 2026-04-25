const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function main() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    console.log('Adding columns to product_detail...');
    await client.query(`
      ALTER TABLE product_detail 
      ADD COLUMN IF NOT EXISTS detail_title TEXT,
      ADD COLUMN IF NOT EXISTS detail_title_en TEXT,
      ADD COLUMN IF NOT EXISTS detail_title_fr TEXT;
    `);

    await client.query('COMMIT');
    console.log('Success!');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('Error:', e);
  } finally {
    client.release();
    pool.end();
  }
}

main();
