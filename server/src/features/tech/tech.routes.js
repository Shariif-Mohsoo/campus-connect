import express from 'express';
import {
  getProposals,
  getProposalById,
  createProposal,
  updateProposal,
  submitProposal,
  reviewProposal,
  deleteProposal,
  updateActivity,
  toggleActivityRegistration,
  registerTeam,
  getStudentRegistrations,
  getActivityRegistrations,
  exportActivityCsv,
  getProposalComments,
  addProposalComment,
  updateProposalComment,
  deleteProposalComment
} from './tech.controller.js';
import { requireAuth, requireAdmin, optionalAuth } from '../auth/auth.middleware.js';

const router = express.Router();

// ==========================================
// TECH PROPOSALS (CRUD & HOD GOVERNANCE)
// ==========================================

// Get proposals (Public if unauthenticated/query, or role-scoped if authenticated)
router.get('/proposals', optionalAuth, getProposals);

// Get single proposal with populated child activities
router.get('/proposals/:id', optionalAuth, getProposalById);

// Create proposal (Tech Organizer action)
router.post('/proposals', requireAuth, createProposal);

// Edit proposal (Resets approval state if approved)
router.put('/proposals/:id', requireAuth, updateProposal);

// Delete proposal (Cascading delete down to activities and team registrations)
router.delete('/proposals/:id', requireAuth, deleteProposal);

// Submit proposal for HOD approval
router.post('/proposals/:id/submit', requireAuth, submitProposal);

// HOD review decision (Approve / Reject / Changes Requested)
router.patch('/proposals/:id/review', requireAuth, requireAdmin, reviewProposal);

// ==========================================
// PROPOSAL COMMENTS (HOD & ORGANIZER COLLABORATION)
// ==========================================

router.get('/proposals/:id/comments', requireAuth, getProposalComments);
router.post('/proposals/:id/comments', requireAuth, addProposalComment);
router.put('/proposals/:id/comments/:commentId', requireAuth, updateProposalComment);
router.delete('/proposals/:id/comments/:commentId', requireAuth, deleteProposalComment);

// ==========================================
// TECHNICAL ACTIVITIES & TEAM REGISTRATIONS
// ==========================================

// Update individual child technical activity inside a proposal
router.put('/proposals/:proposalId/activities/:activityId', requireAuth, updateActivity);

// Organizer manual toggle to close or reopen registration
router.patch('/activities/:activityId/registration-toggle', requireAuth, toggleActivityRegistration);
router.patch('/activities/:activityId/toggle-registration', requireAuth, toggleActivityRegistration);

// Student zero-login team or individual registration with dynamic team size & capacity check
router.post('/activities/:activityId/register', registerTeam);

// Student registration lookup by roll number (for zero-login verification)
router.get('/students/:rollNumber/registrations', getStudentRegistrations);

// Get registered team roster for an activity (Organizer & HOD)
router.get('/activities/:activityId/registrations', requireAuth, getActivityRegistrations);

// Download activity-specific CSV roster file (repeating team rows)
router.get('/activities/:activityId/export-csv', requireAuth, exportActivityCsv);

export default router;
