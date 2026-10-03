import { Router } from 'express';
import {
  getOrganizers,
  createOrganizer,
  deleteOrganizer,
  resendOrganizerEmail,
  getCategoryTeams,
  getMyCategoryTeam
} from './organizer.controller.js';
import { requireAuth, requireRole } from '../auth/auth.middleware.js';

const router = Router();

// Authentication required for all organizer and team endpoints
router.use(requireAuth);

// Team endpoints accessible to both organizers and administrators
router.get('/my-team', getMyCategoryTeam);
router.get('/teams', getCategoryTeams);

// All organizer credential creation and account management routes require HOD (admin) authorization
router.use(requireRole('admin'));

router.get('/', getOrganizers);
router.post('/', createOrganizer);
router.delete('/:id', deleteOrganizer);
router.post('/:id/resend-email', resendOrganizerEmail);

export default router;

