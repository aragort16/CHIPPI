import { badRequest } from '../utils/errors.js';

/**
 * Valida req.body / req.query / req.params con un esquema de zod.
 * Uso: router.post('/', validate({ body: schema }), handler)
 */
export const validate = (schemas) => (req, res, next) => {
  for (const key of ['body', 'query', 'params']) {
    const schema = schemas[key];
    if (!schema) continue;
    const result = schema.safeParse(req[key]);
    if (!result.success) {
      const details = result.error.issues.map((i) => ({
        campo: i.path.join('.') || key,
        mensaje: i.message,
      }));
      return next(badRequest('Datos inválidos', details));
    }
    req[key] = result.data;
  }
  next();
};
