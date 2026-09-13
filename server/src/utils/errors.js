export class AppError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export const badRequest = (msg = 'Solicitud inválida', details) => new AppError(400, msg, details);
export const unauthorized = (msg = 'No autorizado') => new AppError(401, msg);
export const forbidden = (msg = 'No tenés permisos para esta acción') => new AppError(403, msg);
export const notFound = (msg = 'Recurso no encontrado') => new AppError(404, msg);
export const conflict = (msg = 'Conflicto') => new AppError(409, msg);
