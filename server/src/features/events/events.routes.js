import express from 'express';
import {
  getProposals,
  getProposalById,
  createProposal,
  updateProposal,
  deleteProposal,
  submitProposal,
  reviewProposal,
  updateActivity,
  toggleActivityRegistration,
  registerStudent,
  getActivityRegistrations,
  exportActivityCsv,
  getProposalComments,
  addProposalComment
} from './events.controller.js';
import { requireAuth, requireAdmin, optionalAuth } from '../auth/auth.middleware.js';

const router = express.Router();

// ==========================================
// PROPOSALS (CRUD & HOD GOVERNANCE)
// ==========================================

// Get proposals (Public if unauthenticated or publicOnly=true, role-scoped if authenticated)
router.get('/proposals', optionalAuth, getProposals);

// Get single proposal with populated child activities
router.get('/proposals/:id', optionalAuth, getProposalById);

// Create proposal (Organizer action)
router.post('/proposals', requireAuth, createProposal);

// Edit proposal (resets approval state if approved)
router.put('/proposals/:id', requireAuth, updateProposal);

// Delete proposal (cascading delete)
router.delete('/proposals/:id', requireAuth, deleteProposal);

// Submit proposal for HOD review
router.post('/proposals/:id/submit', requireAuth, submitProposal);

// HOD review decision
router.patch('/proposals/:id/review', requireAuth, requireAdmin, reviewProposal);

// Proposal comments thread
router.get('/proposals/:id/comments', requireAuth, getProposalComments);
router.post('/proposals/:id/comments', requireAuth, addProposalComment);

// ==========================================
// ACTIVITIES & REGISTRATIONS
// ==========================================

// Update child activity
router.put('/proposals/:proposalId/activities/:activityId', requireAuth, updateActivity);

// Manual toggle to close or reopen registration
router.patch('/activities/:activityId/registration-toggle', requireAuth, toggleActivityRegistration);

// Student zero-login registration (individual or team)
router.post('/activities/:activityId/register', registerStudent);

// Get registered applicants roster
router.get('/activities/:activityId/registrations', requireAuth, getActivityRegistrations);

// Download activity CSV roster file
router.get('/activities/:activityId/export-csv', requireAuth, exportActivityCsv);

export default router;
