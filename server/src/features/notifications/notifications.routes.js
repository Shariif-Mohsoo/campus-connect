import { Router } from 'express';
import { getOutboxLedger, deleteOutboxEmail, clearOutboxLedger } from './notifications.controller.js';
import { requireAuth, requireRole } from '../auth/auth.middleware.js';

const router = Router();

// HOD Super Admin outbox inspection & management
router.get('/outbox', requireAuth, requireRole('admin'), getOutboxLedger);
router.delete('/outbox/:id', requireAuth, requireRole('admin'), deleteOutboxEmail);
router.delete('/outbox', requireAuth, requireRole('admin'), clearOutboxLedger);

export default router;
