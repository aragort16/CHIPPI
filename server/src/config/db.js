import pg from 'pg';
import { env } from './env.js';

const { Pool } = pg;

export const pool = new Pool({
  connectionString: env.databaseUrl,
  max: 10,
  idleTimeoutMillis: 30_000,
  ssl: env.isProd && !env.databaseUrl.includes('localhost') ? { rejectUnauthorized: false } : undefined,
});

pool.on('error', (err) => {
  console.error('[db] error inesperado en cliente inactivo', err);
});

/** Ejecuta una consulta simple. */
export const query = (text, params) => pool.query(text, params);

/** Ejecuta una función dentro de una transacción. */
export async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
