import { Router } from 'express';
import { login, getCurrentUser } from './auth.controller.js';
import { requireAuth } from './auth.middleware.js';

const router = Router();

// Public login route
router.post('/login', login);

// Protected profile route
router.get('/me', requireAuth, getCurrentUser);

export default router;
