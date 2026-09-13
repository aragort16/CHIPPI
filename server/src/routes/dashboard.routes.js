import { Router } from 'express';
import * as ctrl from '../controllers/dashboard.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();
router.get('/', requireAuth, asyncHandler(ctrl.getDashboard));
export default router;
