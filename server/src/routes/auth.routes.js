import { Router } from 'express';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import * as ctrl from '../controllers/auth.controller.js';
import { validate } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados intentos. Probá de nuevo en unos minutos.' },
});

const password = z
  .string({ required_error: 'La contraseña es obligatoria' })
  .min(8, 'La contraseña debe tener al menos 8 caracteres')
  .max(72, 'La contraseña es demasiado larga');

const registerSchema = z.object({
  organizationName: z.string({ required_error: 'El nombre del negocio es obligatorio' }).trim().min(2, 'Nombre del negocio muy corto').max(100),
  name: z.string({ required_error: 'Tu nombre es obligatorio' }).trim().min(2, 'Nombre muy corto').max(100),
  email: z.string({ required_error: 'El email es obligatorio' }).trim().email('Email inválido'),
  password,
});

const loginSchema = z.object({
  email: z.string({ required_error: 'El email es obligatorio' }).trim().email('Email inválido'),
  password: z.string({ required_error: 'La contraseña es obligatoria' }).min(1, 'La contraseña es obligatoria'),
});

const profileSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  phone: z.string().trim().max(40).optional(),
  avatar_url: z.string().url().optional(),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Ingresá tu contraseña actual'),
  newPassword: password,
});

router.post('/register', authLimiter, validate({ body: registerSchema }), asyncHandler(ctrl.register));
router.post('/login', authLimiter, validate({ body: loginSchema }), asyncHandler(ctrl.login));
router.get('/me', requireAuth, asyncHandler(ctrl.me));
router.patch('/me', requireAuth, validate({ body: profileSchema }), asyncHandler(ctrl.updateProfile));
router.post('/change-password', requireAuth, validate({ body: passwordSchema }), asyncHandler(ctrl.changePassword));

export default router;
