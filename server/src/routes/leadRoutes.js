import { Router } from 'express';
import { LeadController } from '../controllers/leadController.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { tenantScope } from '../middleware/tenantScope.js';
import { validate } from '../middleware/validate.js';
import { createLeadSchema, updateLeadSchema, addLeadNoteSchema, assignLeadSchema } from '../validators/leadSchemas.js';
import { USER_ROLES } from '../models/User.js';

const router = Router();

router.use(authenticate, tenantScope);

router.get('/', LeadController.listLeads);
router.post('/', validate(createLeadSchema), LeadController.createLead);
router.get('/:id', LeadController.getLeadById);
router.patch('/:id', validate(updateLeadSchema), LeadController.updateLead);

// Notes timeline
router.post('/:id/notes', validate(addLeadNoteSchema), LeadController.addNote);

// Sales Rep Assignment (Management only)
router.post(
  '/:id/assign',
  authorize(USER_ROLES.SUPER_ADMIN, USER_ROLES.BUSINESS_OWNER, USER_ROLES.SALES_MANAGER),
  validate(assignLeadSchema),
  LeadController.assignLead
);

export default router;
