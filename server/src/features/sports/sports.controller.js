import { store } from '../../shared/database/store.js';

/**
 * Controller: Get Sports Proposals
 * - Public / Student: Returns only Approved public proposals and activities.
 * - Organizer: Returns proposals authored by them.
 * - HOD Admin: Returns all proposals.
 */
export const getProposals = async (req, res) => {
  try {
    const isPublicQuery = req.query.public === 'true' || !req.user;
    const userRole = req.user?.role;

    let proposals;
    if (isPublicQuery) {
      proposals = store.getProposals({ category: req.query.category || 'Sports', publicOnly: true });
    } else if (userRole === 'admin') {
      proposals = store.getProposals(req.query.category ? { category: req.query.category } : {});
    } else {
      // Shared Workspace: Category organizers see all shared proposals for their team
      proposals = store.getProposals({ category: 'Sports', user: req.user });
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
      return res.status(404).json({ success: false, message: 'Sports Week proposal not found.' });
    }

    // If user is public viewer, ensure proposal is approved
    if (!req.user && !proposal.isPublic) {
      return res.status(403).json({ success: false, message: 'This proposal is not currently public.' });
    }

    return res.json({ success: true, proposal });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

/**
 * Controller: Create Sports Week Proposal (Organizer Action)
 * Validates against duplicate active draft/pending proposals for the category team.
 */
export const createProposal = async (req, res) => {
  try {
    const { title, description, startDate, endDate, activities } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Proposal title is required.' });
    }

    const proposal = store.createProposal({
      title,
      description,
      category: 'Sports',
      organizerId: req.user._id,
      organizerName: req.user.name,
      user: req.user,
      department: req.user.department || 'Sports Directorate',
      startDate,
      endDate,
      activities: Array.isArray(activities) ? activities : []
    });

    return res.status(201).json({
      success: true,
      message: `Sports Week proposal "${proposal.title}" created successfully.`,
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
 * Controller: HOD Review Proposal (Approve / Reject / Changes)
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
 * Deletes Sports Week + all child activities + all grandchild student registrations.
 */
export const deleteProposal = async (req, res) => {
  try {
    const { id } = req.params;

    const result = store.deleteProposalCascade(id, req.user);

    return res.json({
      success: true,
      message: result.message,
      telemetry: result
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

/**
 * Controller: Manual Toggle Registration (Rule 5)
 */
export const toggleActivityRegistration = async (req, res) => {
  try {
    const { activityId } = req.params;
    const { isClosed } = req.body;

    const updated = store.toggleActivityRegistration(activityId, Boolean(isClosed), req.user);

    return res.json({
      success: true,
      message: updated.isRegistrationManuallyClosed
        ? `Registration for "${updated.name}" is now closed.`
        : `Registration for "${updated.name}" is now open.`,
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
    const { studentName, rollNumber, department, semester, section, contactNumber } = req.body;

    if (!studentName || !studentName.trim()) {
      return res.status(400).json({ success: false, message: 'Student full name is required.' });
    }
    if (!rollNumber || !rollNumber.trim()) {
      return res.status(400).json({ success: false, message: 'Valid university roll number is required.' });
    }
    if (!department || !department.trim()) {
      return res.status(400).json({ success: false, message: 'Academic department is required.' });
    }

    const result = store.createRegistration(activityId, {
      studentName,
      rollNumber,
      department,
      semester,
      section,
      contactNumber
    });

    return res.status(201).json({
      success: true,
      message: `Registration confirmed for ${studentName} (${rollNumber}) in ${result.activity.name}!`,
      registration: result.registration,
      activity: result.activity
    });
  } catch (error) {
    return res.status(error.statusCode || 400).json({ success: false, message: error.message });
  }
};

/**
 * Controller: Get Activity Registered Applicants Roster (Rule 6)
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
 * Controller: Download Activity Registrations CSV (Rule 6)
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
 * Controller: Update Child Activity (Rule 1)
 */
export const updateActivity = async (req, res) => {
  try {
    const { proposalId, activityId } = req.params;
    const activityData = req.body;

    const updated = store.updateActivity(proposalId, activityId, activityData, req.user);

    return res.json({
      success: true,
      message: `Sport activity "${updated.name}" updated successfully.`,
      activity: updated
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};


/**
 * Controller: Get Student Registrations by Roll Number
 */
export const getStudentRegistrations = async (req, res) => {
  try {
    const { rollNumber } = req.params;
    const registrations = store.getStudentRegistrations(rollNumber);

    return res.json({
      success: true,
      count: registrations.length,
      registeredActivityIds: registrations.map(r => r.activityId),
      registrations
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

/**
 * Controller: Get Proposal Review Comments Thread
 */
export const getProposalComments = async (req, res) => {
  try {
    const { id } = req.params;
    const comments = store.getProposalComments(id);
    return res.json({ success: true, count: comments.length, comments });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

/**
 * Controller: Add Comment to Proposal (HOD or Organizer)
 */
export const addProposalComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: 'Comment message is required.' });
    }

    const comment = store.addProposalComment(id, { message }, req.user);
    return res.status(201).json({
      success: true,
      message: 'Comment posted successfully.',
      comment
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

/**
 * Controller: Update Comment (Owner or Admin)
 */
export const updateProposalComment = async (req, res) => {
  try {
    const { id, commentId } = req.params;
    const { message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: 'Updated comment message cannot be empty.' });
    }

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
 * Controller: Delete Comment (Owner or Admin)
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

