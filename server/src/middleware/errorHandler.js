import { env } from '../config/env.js';
import { AppError } from '../utils/errors.js';

export function notFoundHandler(req, res) {
  res.status(404).json({ error: `Ruta no encontrada: ${req.method} ${req.originalUrl}` });
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  if (err instanceof AppError) {
    return res.status(err.status).json({ error: err.message, details: err.details });
  }

  // Errores de PostgreSQL más comunes
  if (err.code === '23505') {
    return res.status(409).json({ error: 'Ya existe un registro con esos datos.' });
  }
  if (err.code === '23503') {
    return res.status(400).json({ error: 'Referencia inválida a otro registro.' });
  }
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'JSON inválido en el cuerpo de la solicitud.' });
  }

  console.error('[error]', err);
  res.status(500).json({
    error: 'Error interno del servidor',
    ...(env.isProd ? {} : { detail: err.message }),
  });
}
