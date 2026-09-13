import * as authService from '../services/auth.service.js';

export async function register(req, res) {
  const result = await authService.register(req.body);
  res.status(201).json(result);
}

export async function login(req, res) {
  const result = await authService.login(req.body);
  res.json(result);
}

export async function me(req, res) {
  const user = await authService.me(req.user.id);
  res.json({ user });
}

export async function updateProfile(req, res) {
  const user = await authService.updateProfile(req.user.id, req.body);
  res.json({ user });
}

export async function changePassword(req, res) {
  await authService.changePassword(req.user.id, req.body);
  res.json({ ok: true, message: 'Contraseña actualizada' });
}
