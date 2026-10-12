import { Router } from 'express';
import { QuotationController } from '../controllers/quotationController.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { tenantScope } from '../middleware/tenantScope.js';
import { validate } from '../middleware/validate.js';
import {
  createQuotationSchema,
  approveQuotationSchema,
  rejectQuotationSchema,
} from '../validators/quotationSchemas.js';
import { USER_ROLES } from '../models/User.js';

const router = Router();

router.use(authenticate, tenantScope);

router.get('/', QuotationController.listQuotations);
router.post('/', validate(createQuotationSchema), QuotationController.createQuotation);
router.get('/:id', QuotationController.getQuotationById);

// Owner / Manager Approval
router.post(
  '/:id/approve',
  authorize(USER_ROLES.SUPER_ADMIN, USER_ROLES.BUSINESS_OWNER, USER_ROLES.SALES_MANAGER),
  validate(approveQuotationSchema),
  QuotationController.approveQuotation
);

// Delivery & Customer Response
router.post('/:id/send', QuotationController.sendQuotation);
router.post('/:id/accept', QuotationController.acceptQuotation);
router.post('/:id/reject', validate(rejectQuotationSchema), QuotationController.rejectQuotation);

// PDF Viewer / Download
router.get('/:id/pdf', QuotationController.getPdf);

export default router;
