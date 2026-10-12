import { Router } from 'express';
import authRoutes from './authRoutes.js';
import dashboardRoutes from './dashboardRoutes.js';
import productRoutes from './productRoutes.js';
import customerRoutes from './customerRoutes.js';
import leadRoutes from './leadRoutes.js';
import quotationRoutes from './quotationRoutes.js';
import aiRoutes from './aiRoutes.js';
import conversationRoutes from './conversationRoutes.js';
import webhookRoutes from './webhookRoutes.js';
import orderRoutes from './orderRoutes.js';
import { sendSuccess } from '../utils/apiResponse.js';

const apiRouter = Router();

// Health check endpoint
apiRouter.get('/health', (req, res) => {
  return sendSuccess(res, {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'VyaparAI Orchestration Backend',
    version: '1.0.0',
  });
});

// Mount modules
apiRouter.use('/auth', authRoutes);
apiRouter.use('/dashboard', dashboardRoutes);
apiRouter.use('/products', productRoutes);
apiRouter.use('/customers', customerRoutes);
apiRouter.use('/leads', leadRoutes);
apiRouter.use('/quotations', quotationRoutes);
apiRouter.use('/orders', orderRoutes);
apiRouter.use('/ai', aiRoutes);
apiRouter.use('/conversations', conversationRoutes);
apiRouter.use('/webhooks', webhookRoutes);

export default apiRouter;
