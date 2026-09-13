import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from '../config/db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const reset = process.argv.includes('--reset');

async function run() {
  const client = await pool.connect();
  try {
    if (reset) {
      console.log('⚠️  Reiniciando esquema (DROP SCHEMA public CASCADE)...');
      await client.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
    }
    const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
    console.log('✅ Esquema aplicado correctamente.');
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('❌ Error aplicando el esquema:', err.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

run();
