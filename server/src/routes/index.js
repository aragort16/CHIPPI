import { Router } from 'express';
import authRoutes from './auth.routes.js';
import dashboardRoutes from './dashboard.routes.js';

const router = Router();

router.get('/health', (req, res) => res.json({ ok: true, service: 'chippi-api', time: new Date().toISOString() }));

router.use('/auth', authRoutes);
router.use('/dashboard', dashboardRoutes);

// Próximos módulos (se agregan acá a medida que se construyen):
// router.use('/contacts', contactsRoutes);
// router.use('/pipeline', pipelineRoutes);
// router.use('/calendar', calendarRoutes);
// router.use('/email', emailRoutes);
// router.use('/workflows', workflowsRoutes);
// router.use('/forms', formsRoutes);
// router.use('/pages', pagesRoutes);
// router.use('/invoices', invoicesRoutes);
// router.use('/reputation', reputationRoutes);
// router.use('/reports', reportsRoutes);
// router.use('/team', teamRoutes);

export default router;
