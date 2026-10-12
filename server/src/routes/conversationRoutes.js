import { Router } from 'express';
import { ConversationController } from '../controllers/conversationController.js';
import { authenticate } from '../middleware/authenticate.js';
import { tenantScope } from '../middleware/tenantScope.js';

const router = Router();

router.use(authenticate, tenantScope);

router.get('/', ConversationController.listConversations);
router.get('/:id/messages', ConversationController.getMessages);
router.post('/:id/messages', ConversationController.sendMessage);
router.post('/:id/assign', ConversationController.assignRepresentative);
router.post('/:id/ai-draft', ConversationController.generateAiDraft);

export default router;
