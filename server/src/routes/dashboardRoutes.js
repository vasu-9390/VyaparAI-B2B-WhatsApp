import { Router } from 'express';
import { DashboardController } from '../controllers/dashboardController.js';
import { authenticate } from '../middleware/authenticate.js';
import { tenantScope } from '../middleware/tenantScope.js';

const router = Router();

router.use(authenticate, tenantScope);

router.get('/summary', DashboardController.getSummary);
router.get('/sales', DashboardController.getSalesTrends);

export default router;
