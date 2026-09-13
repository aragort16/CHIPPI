import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { query, withTransaction } from '../config/db.js';
import { conflict, unauthorized, notFound } from '../utils/errors.js';
import { logActivity } from './activity.service.js';

const PUBLIC_USER_COLUMNS = `id, organization_id, name, email, role, avatar_url, phone, is_active, last_login_at, created_at`;

/** Etapas por defecto del pipeline (módulo 3). */
const DEFAULT_STAGES = [
  { name: 'Nuevo Lead', probability: 10, color: '#64748b' },
  { name: 'Contactado', probability: 20, color: '#0ea5e9' },
  { name: 'Reunión Agendada', probability: 40, color: '#8b5cf6' },
  { name: 'Propuesta Enviada', probability: 60, color: '#f59e0b' },
  { name: 'Negociación', probability: 80, color: '#f97316' },
  { name: 'Cerrado Ganado', probability: 100, color: '#22c55e', is_won: true },
  { name: 'Cerrado Perdido', probability: 0, color: '#ef4444', is_lost: true },
];

const DEFAULT_TAGS = [
  { name: 'VIP', color: '#f59e0b' },
  { name: 'Hot Lead', color: '#ef4444' },
  { name: 'Cliente', color: '#22c55e' },
  { name: 'Frío', color: '#64748b' },
];

const DEFAULT_MEETING_TYPES = [
  { name: 'Discovery Call', slug: 'discovery-call', duration_minutes: 30, color: '#3b82f6', description: 'Primera llamada para entender tu negocio y tus necesidades.' },
  { name: 'Demo', slug: 'demo', duration_minutes: 45, color: '#8b5cf6', description: 'Demostración de Chippi y de los agentes de IA en acción.' },
  { name: 'Follow-up', slug: 'follow-up', duration_minutes: 15, color: '#22c55e', description: 'Seguimiento rápido.' },
];

export function slugify(text) {
  return text
    .toString()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 60) || 'org';
}

async function uniqueSlug(client, base) {
  let slug = base;
  let i = 1;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { rowCount } = await client.query('SELECT 1 FROM organizations WHERE slug = $1', [slug]);
    if (!rowCount) return slug;
    slug = `${base}-${++i}`;
  }
}

export function signToken(user) {
  return jwt.sign({ sub: user.id, org: user.organization_id, role: user.role }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
  });
}

export const hashPassword = (password) => bcrypt.hash(password, env.bcryptRounds);

/**
 * Registro: crea la organización, el usuario admin y los datos por defecto
 * (pipeline con etapas, tags, tipos de reunión, disponibilidad L-V 9-18).
 */
export async function register({ organizationName, name, email, password }) {
  const normalizedEmail = email.toLowerCase().trim();
  const existing = await query('SELECT 1 FROM users WHERE email = $1', [normalizedEmail]);
  if (existing.rowCount) throw conflict('Ya existe una cuenta con ese email');

  const passwordHash = await hashPassword(password);

  const user = await withTransaction(async (client) => {
    const slug = await uniqueSlug(client, slugify(organizationName));
    const org = (
      await client.query(
        `INSERT INTO organizations (name, slug) VALUES ($1, $2) RETURNING *`,
        [organizationName.trim(), slug],
      )
    ).rows[0];

    const created = (
      await client.query(
        `INSERT INTO users (organization_id, name, email, password_hash, role, last_login_at)
         VALUES ($1, $2, $3, $4, 'admin', now()) RETURNING ${PUBLIC_USER_COLUMNS}`,
        [org.id, name.trim(), normalizedEmail, passwordHash],
      )
    ).rows[0];

    // Pipeline por defecto
    const pipeline = (
      await client.query(
        `INSERT INTO pipelines (organization_id, name, is_default) VALUES ($1, 'Pipeline de Ventas', true) RETURNING id`,
        [org.id],
      )
    ).rows[0];
    for (const [i, s] of DEFAULT_STAGES.entries()) {
      await client.query(
        `INSERT INTO pipeline_stages (pipeline_id, name, position, probability, color, is_won, is_lost)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [pipeline.id, s.name, i, s.probability, s.color, !!s.is_won, !!s.is_lost],
      );
    }

    for (const t of DEFAULT_TAGS) {
      await client.query(`INSERT INTO tags (organization_id, name, color) VALUES ($1,$2,$3)`, [org.id, t.name, t.color]);
    }

    for (const m of DEFAULT_MEETING_TYPES) {
      await client.query(
        `INSERT INTO meeting_types (organization_id, user_id, name, slug, description, duration_minutes, color)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [org.id, created.id, m.name, m.slug, m.description, m.duration_minutes, m.color],
      );
    }

    for (let day = 1; day <= 5; day++) {
      await client.query(
        `INSERT INTO availability_rules (organization_id, user_id, day_of_week, start_time, end_time)
         VALUES ($1,$2,$3,'09:00','18:00')`,
        [org.id, created.id, day],
      );
    }

    await logActivity(
      {
        organizationId: org.id,
        userId: created.id,
        entityType: 'user',
        entityId: created.id,
        action: 'registered',
        description: `${created.name} creó la cuenta de ${org.name}`,
      },
      client,
    );

    return { ...created, organization_name: org.name, organization_slug: org.slug };
  });

  return { user, token: signToken(user) };
}

export async function login({ email, password }) {
  const normalizedEmail = email.toLowerCase().trim();
  const { rows } = await query(
    `SELECT u.*, o.name AS organization_name, o.slug AS organization_slug
       FROM users u JOIN organizations o ON o.id = u.organization_id
      WHERE u.email = $1`,
    [normalizedEmail],
  );
  const user = rows[0];
  // Comparamos siempre contra un hash para no filtrar si el email existe (timing)
  const ok = await bcrypt.compare(password, user?.password_hash || '$2b$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalid');
  if (!user || !ok) throw unauthorized('Email o contraseña incorrectos');
  if (!user.is_active) throw unauthorized('Tu cuenta está desactivada. Contactá a tu administrador.');

  await query('UPDATE users SET last_login_at = now() WHERE id = $1', [user.id]);
  await logActivity({
    organizationId: user.organization_id,
    userId: user.id,
    entityType: 'user',
    entityId: user.id,
    action: 'login',
    description: `${user.name} inició sesión`,
  });

  const { password_hash, ...safeUser } = user;
  return { user: safeUser, token: signToken(safeUser) };
}

export async function me(userId) {
  const { rows } = await query(
    `SELECT ${PUBLIC_USER_COLUMNS.split(', ').map((c) => `u.${c}`).join(', ')},
            o.name AS organization_name, o.slug AS organization_slug, o.logo_url AS organization_logo,
            o.primary_color, o.currency, o.timezone
       FROM users u JOIN organizations o ON o.id = u.organization_id
      WHERE u.id = $1`,
    [userId],
  );
  if (!rows[0]) throw notFound('Usuario no encontrado');
  return rows[0];
}

export async function updateProfile(userId, { name, phone, avatar_url }) {
  const { rows } = await query(
    `UPDATE users SET name = COALESCE($2, name), phone = COALESCE($3, phone), avatar_url = COALESCE($4, avatar_url)
      WHERE id = $1 RETURNING ${PUBLIC_USER_COLUMNS}`,
    [userId, name, phone, avatar_url],
  );
  return rows[0];
}

export async function changePassword(userId, { currentPassword, newPassword }) {
  const { rows } = await query('SELECT password_hash FROM users WHERE id = $1', [userId]);
  const ok = await bcrypt.compare(currentPassword, rows[0]?.password_hash || '');
  if (!ok) throw unauthorized('La contraseña actual es incorrecta');
  const hash = await hashPassword(newPassword);
  await query('UPDATE users SET password_hash = $2 WHERE id = $1', [userId, hash]);
}
