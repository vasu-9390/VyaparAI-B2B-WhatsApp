import { Router } from 'express';
import { CustomerController } from '../controllers/customerController.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { tenantScope } from '../middleware/tenantScope.js';
import { validate } from '../middleware/validate.js';
import { createCustomerSchema, updateCustomerSchema } from '../validators/customerSchemas.js';
import { USER_ROLES } from '../models/User.js';

const router = Router();

router.use(authenticate, tenantScope);

router.get('/', CustomerController.listCustomers);
router.post(
  '/',
  authorize(USER_ROLES.SUPER_ADMIN, USER_ROLES.BUSINESS_OWNER, USER_ROLES.SALES_MANAGER, USER_ROLES.SALES_REP),
  validate(createCustomerSchema),
  CustomerController.createCustomer
);

router.get('/:id', CustomerController.getCustomerById);
router.patch(
  '/:id',
  authorize(USER_ROLES.SUPER_ADMIN, USER_ROLES.BUSINESS_OWNER, USER_ROLES.SALES_MANAGER, USER_ROLES.SALES_REP),
  validate(updateCustomerSchema),
  CustomerController.updateCustomer
);
router.delete(
  '/:id',
  authorize(USER_ROLES.SUPER_ADMIN, USER_ROLES.BUSINESS_OWNER),
  CustomerController.deleteCustomer
);

// Customer-specific pricing lookup for a product
router.get('/:id/pricing/:productId', CustomerController.getPricingForProduct);

export default router;
