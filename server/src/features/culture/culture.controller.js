import { store } from '../../shared/database/store.js';

const CULTURE_CATEGORY = 'Culture Day';

/**
 * Controller: Get Culture Day Proposals
 * - Public: Returns only Approved public Culture Day proposals & cultural activities.
 * - Organizer: Returns Culture Day proposals authored by them.
 * - HOD Admin: Returns Culture Day proposals.
 */
export const getProposals = async (req, res) => {
  try {
    const isPublicQuery = req.query.public === 'true' || !req.user;
    const userRole = req.user?.role;

    let proposals;
    if (isPublicQuery) {
      proposals = store.getProposals({ category: CULTURE_CATEGORY, publicOnly: true });
    } else if (userRole === 'admin') {
      proposals = store.getProposals({ category: CULTURE_CATEGORY });
    } else {
      // Shared Workspace: Culture organizers see all proposals for their category team
      proposals = store.getProposals({ category: CULTURE_CATEGORY, user: req.user });
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
 * Controller: Get Single Culture Proposal by ID
 */
export const getProposalById = async (req, res) => {
  try {
    const { id } = req.params;
    const proposal = store.getProposalById(id);

    if (!proposal) {
      return res.status(404).json({ success: false, message: 'Culture Day proposal not found.' });
    }

    // If user is public viewer, ensure proposal is approved
    if (!req.user && !proposal.isPublic) {
      return res.status(403).json({ success: false, message: 'This Culture Day proposal is not currently public.' });
    }

    return res.json({ success: true, proposal });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

/**
 * Controller: Create Culture Day Proposal (Organizer Action)
 * Validates against duplicate active draft/pending proposals for the category team.
 */
export const createProposal = async (req, res) => {
  try {
    const { title, description, startDate, endDate, activities } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Culture Day proposal title is required.' });
    }

    const proposal = store.createProposal({
      title,
      description,
      category: CULTURE_CATEGORY,
      organizerId: req.user._id,
      organizerName: req.user.name,
      user: req.user,
      department: req.user.department || 'Arts & Culture Directorate',
      startDate,
      endDate,
      activities: Array.isArray(activities) ? activities : []
    });

    return res.status(201).json({
      success: true,
      message: `Culture Day proposal "${proposal.title}" created successfully.`,
      proposal
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
      code: error.code,
      existingProposal: error.existingProposal
    });
  }
};

/**
 * Controller: Edit Culture Day Proposal (Rule 1 & Rule 2)
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
        ? 'Proposal updated! Critical edits submitted for HOD re-approval.'
        : 'Culture Day proposal updated successfully.',
      proposal: updated
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

/**
 * Controller: Submit Proposal for HOD Approval (Rule 1)
 */
export const submitProposal = async (req, res) => {
  try {
    const { id } = req.params;
    const submitted = store.submitProposal(id, req.user);

    return res.json({
      success: true,
      message: 'Culture Day proposal submitted for HOD governance review.',
      proposal: submitted
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

/**
 * Controller: HOD Review Decision (Rule 7: Approve / Reject / Request Changes)
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
      message: status === 'Approved'
        ? 'Culture Day proposal approved and published to university portal!'
        : status === 'Changes Requested'
        ? 'Changes requested from organizer with review notes.'
        : 'Culture Day proposal rejected.',
      proposal: reviewed
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

/**
 * Controller: Cascade Delete Proposal (Rule 3)
 * Permanently deletes proposal, child cultural activities, registrations, and comments.
 */
export const deleteProposal = async (req, res) => {
  try {
    const { id } = req.params;
    const result = store.deleteProposalCascade(id, req.user);

    return res.json({
      success: true,
      message: result.message,
      data: result
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

/**
 * Controller: Inline Edit Child Cultural Activity
 */
export const updateActivity = async (req, res) => {
  try {
    const { proposalId, activityId } = req.params;
    const activityData = req.body;

    const updatedActivity = store.updateActivity(proposalId, activityId, activityData, req.user);

    return res.json({
      success: true,
      message: `Cultural activity "${updatedActivity.name}" updated successfully.`,
      activity: updatedActivity
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

/**
 * Controller: Manual Toggle to Close/Reopen Activity Registration (Rule 5)
 */
export const toggleActivityRegistration = async (req, res) => {
  try {
    const { activityId } = req.params;
    const { isClosed } = req.body;

    if (isClosed === undefined) {
      return res.status(400).json({ success: false, message: 'isClosed state is required.' });
    }

    const updated = store.toggleActivityRegistration(activityId, isClosed, req.user);

    return res.json({
      success: true,
      message: isClosed
        ? `Registration closed for "${updated.name}". Existing applications preserved.`
        : `Registration reopened for "${updated.name}".`,
      activity: updated
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

/**
 * Controller: Student Zero-Login Registration (Rule 4)
 */
export const registerStudent = async (req, res) => {
  try {
    const { activityId } = req.params;
    const { rollNumber, department, semester, section, contactNumber } = req.body;
    const studentName = req.body.studentName || req.body.fullName;

    if (!studentName || !rollNumber) {
      return res.status(400).json({ success: false, message: 'Student full name and roll number are required.' });
    }

    const result = store.createRegistration(activityId, {
      studentName,
      rollNumber,
      department: department || 'General Studies',
      semester: semester || '1st Semester',
      section: section || 'Section A',
      contactNumber: contactNumber || 'N/A'
    });

    return res.status(201).json({
      success: true,
      message: `Registration confirmed for "${studentName}" in ${result.activity.name}!`,
      registration: result.registration,
      activity: result.activity
    });
  } catch (error) {
    const isConflict = error.message && error.message.toLowerCase().includes('already');
    return res.status(isConflict ? 409 : (error.statusCode || 400)).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Controller: Student Registration Lookup by Roll Number
 */
export const getStudentRegistrations = async (req, res) => {
  try {
    const { rollNumber } = req.params;
    const registrations = store.getStudentRegistrations(rollNumber);

    return res.json({
      success: true,
      count: registrations.length,
      registrations
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Controller: Get Applicant Roster for an Activity (Rule 6)
 */
export const getActivityRegistrations = async (req, res) => {
  try {
    const { activityId } = req.params;

    if (!store.isUserAuthorizedForActivity(req.user, activityId)) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized: You can only view participant rosters within your category team.'
      });
    }

    const registrations = store.getRegistrationsByActivity(activityId);

    return res.json({
      success: true,
      count: registrations.length,
      registrations
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

/**
 * Controller: Export Activity CSV (Rule 6)
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

    const { csvContent, filename } = store.generateActivityCsv(activityId);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.status(200).send(csvContent);
  } catch (error) {
    return res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};


/**
 * Controller: Get Proposal Comments
 */
export const getProposalComments = async (req, res) => {
  try {
    const { id } = req.params;
    const comments = store.getProposalComments(id);

    return res.json({
      success: true,
      count: comments.length,
      comments
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

/**
 * Controller: Add Proposal Comment
 */
export const addProposalComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { message } = req.body;

    const newComment = store.addProposalComment(id, { message }, req.user);

    return res.status(201).json({
      success: true,
      message: 'Comment posted successfully.',
      comment: newComment
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

/**
 * Controller: Update Proposal Comment
 */
export const updateProposalComment = async (req, res) => {
  try {
    const { id, commentId } = req.params;
    const { message } = req.body;

    const updated = store.updateProposalComment(id, commentId, { message }, req.user);

    return res.json({
      success: true,
      message: 'Comment updated successfully.',
      comment: updated
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

/**
 * Controller: Delete Proposal Comment
 */
export const deleteProposalComment = async (req, res) => {
  try {
    const { id, commentId } = req.params;

    const deleted = store.deleteProposalComment(id, commentId, req.user);

    return res.json({
      success: true,
      message: 'Comment deleted successfully.',
      comment: deleted
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};
