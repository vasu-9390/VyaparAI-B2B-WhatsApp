import { Router } from 'express';
import { OrderController } from '../controllers/orderController.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { tenantScope } from '../middleware/tenantScope.js';
import { USER_ROLES } from '../models/User.js';

const router = Router();

router.use(authenticate, tenantScope);

// Order Listing & Detail
router.get('/', OrderController.getOrders);
router.get('/:id', OrderController.getOrderById);

// Convert Quotation to Order
router.post(
  '/from-quotation/:quotationId',
  authorize(USER_ROLES.SUPER_ADMIN, USER_ROLES.BUSINESS_OWNER, USER_ROLES.SALES_MANAGER, USER_ROLES.SALES_REP),
  OrderController.convertFromQuotation
);

// Lifecycle Status Transition
router.patch(
  '/:id/status',
  authorize(USER_ROLES.SUPER_ADMIN, USER_ROLES.BUSINESS_OWNER, USER_ROLES.SALES_MANAGER, USER_ROLES.INVENTORY_MANAGER),
  OrderController.updateStatus
);

// Payment Recording & Ledger
router.post(
  '/:id/payments',
  authorize(USER_ROLES.SUPER_ADMIN, USER_ROLES.BUSINESS_OWNER, USER_ROLES.SALES_MANAGER),
  OrderController.recordPayment
);
router.get('/:id/payments', OrderController.getOrderPayments);

export default router;
