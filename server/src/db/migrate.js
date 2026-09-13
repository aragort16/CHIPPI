import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { env } from '../config/env.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const reset = process.argv.includes('--reset');

/** Si la base de datos no existe, la crea conectándose a la DB de mantenimiento "postgres". */
async function ensureDatabase() {
  const url = new URL(env.databaseUrl);
  const dbName = url.pathname.replace(/^\//, '');
  const probe = new pg.Client({ connectionString: env.databaseUrl });
  try {
    await probe.connect();
    await probe.end();
    return;
  } catch (err) {
    if (err.code !== '3D000') throw err; // otro error: credenciales, servidor apagado, etc.
  }
  console.log(`ℹ️  La base de datos "${dbName}" no existe. Creándola...`);
  url.pathname = '/postgres';
  const admin = new pg.Client({ connectionString: url.toString() });
  await admin.connect();
  await admin.query(`CREATE DATABASE "${dbName}"`);
  await admin.end();
  console.log(`✅ Base de datos "${dbName}" creada.`);
}

async function run() {
  await ensureDatabase();
  const client = new pg.Client({ connectionString: env.databaseUrl });
  await client.connect();
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
    throw err;
  } finally {
    await client.end();
  }
}

run().catch((err) => {
  console.error('❌ Error aplicando el esquema:', err.message);
  if (err.code === 'ECONNREFUSED') {
    console.error('   PostgreSQL no está corriendo o el puerto es incorrecto. Revisá DATABASE_URL en server/.env');
  } else if (err.code === '28P01') {
    console.error('   Usuario o contraseña incorrectos. Revisá DATABASE_URL en server/.env');
  }
  process.exit(1);
});
