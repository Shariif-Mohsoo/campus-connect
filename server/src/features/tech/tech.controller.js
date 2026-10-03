import { store } from '../../shared/database/store.js';

const TECH_CATEGORY = 'Tech & Hackathon';

/**
 * Controller: Get Tech & Hackathon Proposals
 * - Public: Returns only Approved public proposals & technical activities.
 * - Organizer: Returns Tech proposals authored by them.
 * - HOD Admin: Returns all Tech proposals.
 */
export const getProposals = async (req, res) => {
  try {
    const isPublicQuery = req.query.public === 'true' || !req.user;
    const userRole = req.user?.role;

    let proposals;
    if (isPublicQuery) {
      proposals = store.getProposals({ category: TECH_CATEGORY, publicOnly: true });
    } else if (userRole === 'admin') {
      proposals = store.getProposals({ category: TECH_CATEGORY });
    } else {
      // Shared Workspace: Tech organizers see all proposals for their category team
      proposals = store.getProposals({ category: TECH_CATEGORY, user: req.user });
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
 * Controller: Get Single Tech Proposal by ID
 */
export const getProposalById = async (req, res) => {
  try {
    const { id } = req.params;
    const proposal = store.getProposalById(id);

    if (!proposal) {
      return res.status(404).json({ success: false, message: 'Tech & Hackathon proposal not found.' });
    }

    // If user is public viewer, ensure proposal is approved
    if (!req.user && !proposal.isPublic) {
      return res.status(403).json({ success: false, message: 'This Tech & Hackathon proposal is not currently public.' });
    }

    return res.json({ success: true, proposal });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

/**
 * Controller: Create Tech & Hackathon Proposal (Organizer Action)
 * Validates against duplicate active draft/pending proposals for the category team.
 */
export const createProposal = async (req, res) => {
  try {
    const { title, description, startDate, endDate, activities, venue, rules } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Tech & Hackathon proposal title is required.' });
    }

    const proposal = store.createProposal({
      title,
      description,
      category: TECH_CATEGORY,
      organizerId: req.user._id,
      organizerName: req.user.name,
      user: req.user,
      department: req.user.department || 'Computer Science & IT',
      startDate,
      endDate,
      venue,
      rules,
      activities: Array.isArray(activities) ? activities : []
    });

    return res.status(201).json({
      success: true,
      message: `Tech & Hackathon proposal "${proposal.title}" created successfully.`,
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
 * Controller: Edit Tech Proposal (Rule 1 & Rule 2)
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
        : 'Tech & Hackathon proposal updated successfully.',
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
      message: 'Tech & Hackathon proposal submitted for HOD governance review.',
      proposal: submitted
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

/**
 * Controller: HOD Review Decision (Approve / Reject / Request Changes)
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
        ? 'Tech & Hackathon proposal approved and published to university portal!'
        : status === 'Changes Requested'
        ? 'Changes requested from organizer with review notes.'
        : 'Tech & Hackathon proposal rejected.',
      proposal: reviewed
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

/**
 * Controller: Cascade Delete Proposal
 * Permanently deletes proposal, child activities, team registrations, and comments.
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
 * Controller: Inline Edit Child Technical Activity
 */
export const updateActivity = async (req, res) => {
  try {
    const { proposalId, activityId } = req.params;
    const activityData = req.body;

    const updatedActivity = store.updateActivity(proposalId, activityId, activityData, req.user);

    return res.json({
      success: true,
      message: `Technical activity "${updatedActivity.name}" updated successfully.`,
      activity: updatedActivity
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

/**
 * Controller: Manual Toggle to Close/Reopen Activity Registration
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
        ? `Registration closed for "${updated.name}". Existing team applications preserved.`
        : `Registration reopened for "${updated.name}".`,
      activity: updated
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

/**
 * Controller: Team & Individual Registration (Zero-Login)
 * Validates dynamic team size, duplicate roll numbers within team,
 * duplicate registrations across existing teams, capacity limits, and deadlines.
 */
export const registerTeam = async (req, res) => {
  try {
    const { activityId } = req.params;
    const {
      teamName,
      leaderName,
      leaderRollNumber,
      studentName,
      rollNumber,
      department,
      semester,
      section,
      contactNumber,
      teammates
    } = req.body;

    const result = store.createTeamRegistration(activityId, {
      teamName,
      leaderName: leaderName || studentName,
      leaderRollNumber: leaderRollNumber || rollNumber,
      studentName: studentName || leaderName,
      rollNumber: rollNumber || leaderRollNumber,
      department: department || 'Computer Science',
      semester,
      section,
      contactNumber,
      teammates: Array.isArray(teammates) ? teammates : []
    });

    const isTeam = result.registration.isTeam;
    const displayName = isTeam
      ? `Team "${result.registration.teamName}"`
      : `"${result.registration.studentName}"`;

    return res.status(201).json({
      success: true,
      message: `Registration confirmed for ${displayName} in ${result.activity.name}!`,
      registration: result.registration,
      activity: result.activity
    });
  } catch (error) {
    const isConflict = error.message && (
      error.message.toLowerCase().includes('already') ||
      error.message.toLowerCase().includes('duplicate')
    );
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
 * Controller: Get Registered Teams Roster for an Activity (Organizer & HOD)
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
 * Controller: Export Activity CSV (Teams format with repeating team info per member)
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
 * Controller: Proposal Comments
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
