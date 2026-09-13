/**
 * Configuración inicial en un solo paso (funciona en Windows, Mac y Linux):
 *   1. Crea server/.env desde .env.example si no existe
 *   2. Crea la base de datos (si no existe) y aplica el esquema
 *   3. Carga los datos de demostración
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const envExample = path.join(root, '.env.example');
const envFile = path.join(root, 'server', '.env');

if (!fs.existsSync(envFile)) {
  fs.copyFileSync(envExample, envFile);
  console.log('✅ Creado server/.env a partir de .env.example');
  console.log('   ➜ Si tu PostgreSQL tiene otro usuario/contraseña, editá DATABASE_URL en server/.env y volvé a correr: npm run setup\n');
} else {
  console.log('ℹ️  server/.env ya existe, no se modifica.');
}

const run = (script) => {
  const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const res = spawnSync(npm, ['run', script, '-w', 'server'], { stdio: 'inherit', cwd: root, shell: process.platform === 'win32' });
  if (res.status !== 0) {
    console.error(`\n❌ Falló "npm run ${script}". Revisá el mensaje de arriba.`);
    process.exit(res.status || 1);
  }
};

run('db:migrate');
run('db:seed');

console.log('\n🎉 Listo. Ahora ejecutá:  npm run dev');
console.log('   y abrí http://localhost:5173  (usuario: admin@chippi.app / Chippi2024!)');
