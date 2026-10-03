import { store } from '../../shared/database/store.js';

/**
 * Controller: Get Extracurricular Event Proposals for Generic / Dynamic Categories
 * (Requirement 3, 4, 5 & 7)
 * - Public / Student: Returns only Approved public proposals and activities.
 * - Organizer: Returns shared proposals for their assigned category team.
 * - HOD Admin: Returns all proposals or filtered by category.
 */
export const getProposals = async (req, res) => {
  try {
    const isPublicQuery = req.query.public === 'true' || !req.user;
    const userRole = req.user?.role;
    const requestedCategory = req.query.category;

    let proposals;
    if (isPublicQuery) {
      const filter = { publicOnly: true };
      if (requestedCategory && requestedCategory !== 'All') {
        filter.category = requestedCategory;
      }
      proposals = store.getProposals(filter);
    } else if (userRole === 'admin') {
      const filter = {};
      if (requestedCategory && requestedCategory !== 'All') {
        filter.category = requestedCategory;
      }
      proposals = store.getProposals(filter);
    } else {
      // Shared Workspace: Category organizers see all shared proposals for their team
      const orgCategory = req.user?.category || requestedCategory || 'Arts & Drama';
      proposals = store.getProposals({ category: orgCategory, user: req.user });
    }

    return res.json({
      success: true,
      count: proposals.length,
      proposals
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

/**
 * Controller: Get Single Proposal by ID
 */
export const getProposalById = async (req, res) => {
  try {
    const { id } = req.params;
    const proposal = store.getProposalById(id);

    if (!proposal) {
      return res.status(404).json({ success: false, message: 'Event proposal not found.' });
    }

    if (!req.user && !proposal.isPublic) {
      return res.status(403).json({ success: false, message: 'This proposal is not currently public.' });
    }

    return res.json({ success: true, proposal });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

/**
 * Controller: Create Event Proposal (Organizer Action)
 * Validates against duplicate active draft/pending proposals for the category team.
 * (Requirement 4 & 6)
 */
export const createProposal = async (req, res) => {
  try {
    const {
      title,
      description,
      startDate,
      endDate,
      generalInstructions,
      venue,
      activities,
      category
    } = req.body;

    const eventCategory = category || req.user?.category || 'Arts & Drama';

    const proposal = store.createProposal({
      title,
      category: eventCategory,
      description,
      startDate,
      endDate,
      generalInstructions,
      venue,
      activities: activities || [],
      organizerId: req.user._id,
      organizerName: req.user.name,
      department: req.user.department,
      user: req.user
    });

    return res.status(201).json({
      success: true,
      message: `Event proposal "${proposal.title}" (${eventCategory}) drafted successfully.`,
      proposal
    });
  } catch (error) {
    return res.status(error.statusCode || 400).json({
      success: false,
      message: error.message,
      code: error.code,
      existingProposal: error.existingProposal
    });
  }
};

/**
 * Controller: Edit Proposal (Rule 1 & Rule 2)
 * If an approved proposal is modified, automatically resets to 'Pending HOD Approval'.
 */
export const updateProposal = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const updated = store.updateProposal(id, updates, req.user);

    return res.json({
      success: true,
      message: updated.status === 'Pending HOD Approval'
        ? 'Proposal modified and submitted for HOD re-approval.'
        : 'Proposal updated successfully.',
      proposal: updated
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

/**
 * Controller: Submit Proposal for HOD Approval
 */
export const submitProposal = async (req, res) => {
  try {
    const { id } = req.params;
    const submitted = store.submitProposal(id, req.user);

    return res.json({
      success: true,
      message: `Proposal "${submitted.title}" submitted to HOD console for approval.`,
      proposal: submitted
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

/**
 * Controller: HOD Review Decision (Approve / Reject / Changes Requested)
 */
export const reviewProposal = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, feedbackNotes } = req.body;

    if (!status) {
      return res.status(400).json({ success: false, message: 'Review decision status is required.' });
    }

    const reviewed = store.reviewProposal(id, { status, feedbackNotes }, req.user);

    return res.json({
      success: true,
      message: `Proposal "${reviewed.title}" marked as ${status}.`,
      proposal: reviewed
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

/**
 * Controller: Cascade Delete Proposal (Rule 3)
 */
export const deleteProposal = async (req, res) => {
  try {
    const { id } = req.params;
    const result = store.deleteProposalCascade(id, req.user);

    return res.json(result);
  } catch (error) {
    return res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

/**
 * Controller: Update Child Activity (Rule 1)
 */
export const updateActivity = async (req, res) => {
  try {
    const { proposalId, activityId } = req.params;
    const activityData = req.body;

    const updated = store.updateActivity(proposalId, activityId, activityData, req.user);

    return res.json({
      success: true,
      message: `Activity "${updated.name}" updated successfully.`,
      activity: updated
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

/**
 * Controller: Toggle Registration Open/Closed (Rule 5)
 */
export const toggleActivityRegistration = async (req, res) => {
  try {
    const { activityId } = req.params;
    const { isClosed } = req.body;

    const updated = store.toggleActivityRegistration(activityId, Boolean(isClosed), req.user);

    return res.json({
      success: true,
      message: isClosed
        ? `Registration for "${updated.name}" manually closed.`
        : `Registration for "${updated.name}" reopened.`,
      activity: updated
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

/**
 * Controller: Student Zero-Login Registration (Rule 4, Requirement 8)
 * Supports both solo individual entries and multi-student team registrations.
 */
export const registerStudent = async (req, res) => {
  try {
    const { activityId } = req.params;
    const registrationData = req.body;

    const result = store.registerStudent(activityId, registrationData);

    return res.status(201).json({
      success: true,
      message: result.registration.isTeam
        ? `Team "${result.registration.teamName}" registered successfully for ${result.activity.name}!`
        : `Student ${result.registration.studentName} registered successfully for ${result.activity.name}!`,
      registration: result.registration,
      activity: result.activity
    });
  } catch (error) {
    return res.status(error.statusCode || 400).json({ success: false, message: error.message });
  }
};

/**
 * Controller: Get Activity Registered Applicants Roster (Rule 6, Requirement 9)
 */
export const getActivityRegistrations = async (req, res) => {
  try {
    const { activityId } = req.params;

    if (!store.isUserAuthorizedForActivity(req.user, activityId)) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized: You can only view registrations for your assigned category team.'
      });
    }

    const result = store.getRegistrationsByActivity(activityId, req.query);

    if (result && result.page !== undefined) {
      return res.json({
        success: true,
        ...result
      });
    }

    return res.json({
      success: true,
      count: result.length,
      registrations: result
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

/**
 * Controller: Download Activity Registrations CSV (Rule 6, Requirement 9)
 */
export const exportActivityCsv = async (req, res) => {
  try {
    const { activityId } = req.params;

    if (!store.isUserAuthorizedForActivity(req.user, activityId)) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized: You can only export rosters for your assigned category team.'
      });
    }

    if (req.query.stream === 'true') {
      return store.streamActivityCsv(activityId, res);
    }

    const { csvContent, filename, count } = store.generateActivityCsv(activityId);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('X-Total-Count', count.toString());

    return res.status(200).send(csvContent);
  } catch (error) {
    return res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

/**
 * Controller: Get Comments for a Proposal
 */
export const getProposalComments = async (req, res) => {
  try {
    const { id } = req.params;
    const comments = store.getProposalComments(id);
    return res.json({ success: true, count: comments.length, comments });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Controller: Add Comment to Proposal (HOD & Organizer Thread)
 */
export const addProposalComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { message } = req.body;
    const comment = store.addProposalComment(id, { message }, req.user);
    return res.status(201).json({ success: true, comment });
  } catch (error) {
    return res.status(error.statusCode || 400).json({ success: false, message: error.message });
  }
};
