import express from 'express';
import {
  login,
  getCurrentUser,
  getOrganizers,
  createOrganizer,
  deleteOrganizer,
  resendOrganizerEmail,
  getOutboxEmails
} from '../controllers/authController.js';
import { verifyToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Public: Login
router.post('/login', login);

// Protected: Get currently authenticated user profile
router.get('/me', verifyToken, getCurrentUser);

// Protected: Super Admin (HOD) Organizer Management
router.get('/organizers', verifyToken, requireRole('admin'), getOrganizers);
router.post('/organizers', verifyToken, requireRole('admin'), createOrganizer);
router.delete('/organizers/:id', verifyToken, requireRole('admin'), deleteOrganizer);
router.post('/organizers/:id/resend-email', verifyToken, requireRole('admin'), resendOrganizerEmail);

// Protected: Super Admin (HOD) Sent Emails Ledger / Outbox
router.get('/outbox', verifyToken, requireRole('admin'), getOutboxEmails);

export default router;
