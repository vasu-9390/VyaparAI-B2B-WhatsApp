import { Router } from 'express';
import { ProductController } from '../controllers/productController.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { tenantScope } from '../middleware/tenantScope.js';
import { validate } from '../middleware/validate.js';
import { createProductSchema, updateProductSchema, stockAdjustmentSchema } from '../validators/productSchemas.js';
import { USER_ROLES } from '../models/User.js';

const router = Router();

// Apply auth and tenant scoping to all product routes
router.use(authenticate, tenantScope);

// Catalog Export
router.get('/export-csv', ProductController.exportCsv);

// Product CRUD
router.get('/', ProductController.listProducts);
router.post(
  '/',
  authorize(USER_ROLES.SUPER_ADMIN, USER_ROLES.BUSINESS_OWNER, USER_ROLES.INVENTORY_MANAGER),
  validate(createProductSchema),
  ProductController.createProduct
);

router.get('/:id', ProductController.getProductById);
router.patch(
  '/:id',
  authorize(USER_ROLES.SUPER_ADMIN, USER_ROLES.BUSINESS_OWNER, USER_ROLES.INVENTORY_MANAGER),
  validate(updateProductSchema),
  ProductController.updateProduct
);
router.delete(
  '/:id',
  authorize(USER_ROLES.SUPER_ADMIN, USER_ROLES.BUSINESS_OWNER),
  ProductController.deleteProduct
);

// Stock availability and manual adjustments
router.get('/:id/availability', ProductController.getAvailability);
router.post(
  '/:id/adjust-stock',
  authorize(USER_ROLES.SUPER_ADMIN, USER_ROLES.BUSINESS_OWNER, USER_ROLES.INVENTORY_MANAGER),
  validate(stockAdjustmentSchema),
  ProductController.adjustStock
);

export default router;
