import express from 'express';
import {
  getProposals,
  getProposalById,
  createProposal,
  updateProposal,
  submitProposal,
  reviewProposal,
  deleteProposal,
  toggleActivityRegistration,
  registerStudent,
  getActivityRegistrations,
  exportActivityCsv,
  getProposalComments,
  addProposalComment,
  updateProposalComment,
  deleteProposalComment,
  updateActivity,
  getStudentRegistrations
} from './sports.controller.js';
import { requireAuth, requireAdmin, optionalAuth } from '../auth/auth.middleware.js';

const router = express.Router();

// ==========================================
// PROPOSALS (CRUD & HOD GOVERNANCE)
// ==========================================

// Get proposals (Public if unauthenticated/query, or role-scoped if authenticated)
router.get('/proposals', optionalAuth, getProposals);

// Get single proposal with populated child activities
router.get('/proposals/:id', optionalAuth, getProposalById);

// Create proposal (Organizer action)
router.post('/proposals', requireAuth, createProposal);

// Edit proposal (Rule 1 & Rule 2: resets approval state if approved)
router.put('/proposals/:id', requireAuth, updateProposal);

// Delete proposal (Rule 3: Cascading delete down to activities and registrations)
router.delete('/proposals/:id', requireAuth, deleteProposal);

// Submit proposal for HOD approval
router.post('/proposals/:id/submit', requireAuth, submitProposal);

// HOD review decision (Approve / Reject / Changes Requested)
router.patch('/proposals/:id/review', requireAuth, requireAdmin, reviewProposal);

// ==========================================
// PROPOSAL COMMENTS (HOD & ORGANIZER COLLABORATION)
// ==========================================

// Get comments for a proposal
router.get('/proposals/:id/comments', requireAuth, getProposalComments);

// Add a comment to a proposal
router.post('/proposals/:id/comments', requireAuth, addProposalComment);

// Update a comment
router.put('/proposals/:id/comments/:commentId', requireAuth, updateProposalComment);

// Delete a comment
router.delete('/proposals/:id/comments/:commentId', requireAuth, deleteProposalComment);

// ==========================================
// ACTIVITIES & REGISTRATIONS
// ==========================================

// Rule 1 & Rule 2: Update individual child activity inside a proposal
router.put('/proposals/:proposalId/activities/:activityId', requireAuth, updateActivity);

// Rule 5: Organizer manual toggle to close or reopen registration
router.patch('/activities/:activityId/registration-toggle', requireAuth, toggleActivityRegistration);

// Rule 4: Student zero-login registration with backend deadline & capacity check
router.post('/activities/:activityId/register', registerStudent);

// Student registration lookup by roll number (for zero-login verification)
router.get('/students/:rollNumber/registrations', getStudentRegistrations);

// Rule 6: Get registered applicants roster for an activity (Organizer & HOD)
router.get('/activities/:activityId/registrations', requireAuth, getActivityRegistrations);

// Rule 6: Download activity-specific CSV roster file
router.get('/activities/:activityId/export-csv', requireAuth, exportActivityCsv);

export default router;

