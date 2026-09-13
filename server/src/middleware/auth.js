import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { query } from '../config/db.js';
import { unauthorized, forbidden } from '../utils/errors.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/**
 * Verifica el JWT del header Authorization y carga el usuario en req.user.
 * Se consulta la base para asegurar que el usuario siga activo.
 */
export const requireAuth = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) throw unauthorized('Necesitás iniciar sesión');

  let payload;
  try {
    payload = jwt.verify(token, env.jwtSecret);
  } catch {
    throw unauthorized('Sesión inválida o expirada');
  }

  const { rows } = await query(
    `SELECT u.id, u.organization_id, u.name, u.email, u.role, u.avatar_url, u.is_active,
            o.name AS organization_name, o.slug AS organization_slug
       FROM users u
       JOIN organizations o ON o.id = u.organization_id
      WHERE u.id = $1`,
    [payload.sub],
  );
  const user = rows[0];
  if (!user || !user.is_active) throw unauthorized('La cuenta no está activa');

  req.user = user;
  next();
});

/** Restringe una ruta a ciertos roles. Uso: requireRole('admin', 'sales_manager') */
export const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) return next(unauthorized());
  if (!roles.includes(req.user.role)) return next(forbidden());
  next();
};
