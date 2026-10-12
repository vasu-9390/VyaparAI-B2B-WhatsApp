import { Router } from 'express';
import { AiController } from '../controllers/aiController.js';
import { authenticate } from '../middleware/authenticate.js';
import { tenantScope } from '../middleware/tenantScope.js';

const router = Router();

router.use(authenticate, tenantScope);

router.post('/extract', AiController.extractRequirements);
router.post('/process-message', AiController.processMessage);
router.post('/draft-reply', AiController.draftReply);

export default router;
