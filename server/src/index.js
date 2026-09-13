import { env } from './config/env.js';
import { pool } from './config/db.js';
import { createApp } from './app.js';

async function main() {
  await pool.query('SELECT 1');
  console.log('✅ Conectado a PostgreSQL');

  const app = createApp();
  const server = app.listen(env.port, () => {
    console.log(`🚀 Chippi API escuchando en http://localhost:${env.port} (${env.nodeEnv})`);
  });

  const shutdown = async (signal) => {
    console.log(`\n${signal} recibido, cerrando...`);
    server.close(async () => {
      await pool.end();
      process.exit(0);
    });
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch((err) => {
  console.error('❌ No se pudo iniciar el servidor:', err.message);
  process.exit(1);
});
