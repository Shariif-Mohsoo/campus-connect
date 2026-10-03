import { store } from '../../shared/database/store.js';
import { emailService } from '../notifications/email.service.js';
import { config } from '../../shared/config/env.js';

/**
 * Controller: Get all category teams and active member quotas (Requirement 1 & 9)
 */
export const getCategoryTeams = async (req, res) => {
  try {
    const teams = store.getAllCategoryTeams();
    return res.json({
      success: true,
      teams
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Controller: Get logged-in organizer's category team members (Requirement 1 & 2)
 */
export const getMyCategoryTeam = async (req, res) => {
  try {
    const userCategory = req.user?.category || 'Sports';
    const teamMembers = store.getCategoryTeam(userCategory);
    return res.json({
      success: true,
      category: userCategory,
      count: teamMembers.length,
      maxCapacity: 3,
      members: teamMembers
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Controller: Get all organizers (for HOD / Super Admin)
 */
export const getOrganizers = async (req, res) => {
  try {
    const organizers = store.getOrganizers();
    return res.json({
      success: true,
      count: organizers.length,
      organizers
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Controller: Create new organizer & dispatch welcome email (HOD feature)
 */
export const createOrganizer = async (req, res) => {
  try {
    const { name, rollNumber, department, email, password, category } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Organizer full name is required.' });
    }

    if (!rollNumber || !rollNumber.trim()) {
      return res.status(400).json({ success: false, message: 'Student / Faculty Roll Number is required.' });
    }

    if (!department || !department.trim()) {
      return res.status(400).json({ success: false, message: 'Academic Department is required.' });
    }

    if (!email || !email.trim()) {
      return res.status(400).json({ success: false, message: 'Valid university email is required.' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return res.status(400).json({ success: false, message: 'Please provide a valid email format (e.g. name@university.edu).' });
    }

    const result = store.createOrganizer({
      name,
      rollNumber,
      department,
      email,
      password,
      category: category || 'Sports',
      addedByName: req.user?.name || 'Super Admin (HOD)'
    });

    // Dispatch real email to organizer's personal inbox
    const dispatchResult = await emailService.sendOrganizerCredentials({
      to: result.organizer.email,
      recipientName: result.organizer.name,
      rollNumber: result.organizer.rollNumber,
      department: result.organizer.department,
      category: result.organizer.category,
      username: result.organizer.email,
      password: result.generatedPassword,
      loginLink: config.clientUrl
    });

    if (result.mailRecord) {
      result.mailRecord.status = dispatchResult.status;
      result.mailRecord.realDelivered = dispatchResult.delivered;
    }

    return res.status(201).json({
      success: true,
      message: dispatchResult.delivered
        ? `Organizer "${result.organizer.name}" (${result.organizer.category}) created and credentials email sent directly to ${result.organizer.email}!`
        : `Organizer "${result.organizer.name}" (${result.organizer.category}) created. Credentials recorded in HOD portal ledger.`,
      organizer: result.organizer,
      mailRecord: result.mailRecord,
      emailDispatch: dispatchResult
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * Controller: Delete organizer
 */
export const deleteOrganizer = async (req, res) => {
  try {
    const { id } = req.params;
    const removed = store.deleteOrganizer(id);
    return res.json({
      success: true,
      message: `Organizer "${removed.name}" removed from portal.`,
      organizer: removed
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * Controller: Resend credentials email to an existing organizer
 */
export const resendOrganizerEmail = async (req, res) => {
  try {
    const { id } = req.params;
    const organizer = store.getUserById(id);
    if (!organizer) {
      return res.status(404).json({ success: false, message: 'Organizer not found.' });
    }

    const passwordToUse = organizer.plainPasswordHint || 'Org@' + Math.floor(1000 + Math.random() * 9000);
    const assignedCategory = organizer.category || 'Sports';

    const dispatchResult = await emailService.sendOrganizerCredentials({
      to: organizer.email,
      recipientName: organizer.name,
      rollNumber: organizer.rollNumber,
      department: organizer.department,
      category: assignedCategory,
      username: organizer.email,
      password: passwordToUse,
      loginLink: config.clientUrl
    });

    const mailRecord = {
      _id: `mail-resend-${Date.now()}`,
      to: organizer.email,
      recipientName: organizer.name,
      rollNumber: organizer.rollNumber,
      department: organizer.department,
      category: assignedCategory,
      subject: `Welcome to UniActivity Hub - ${assignedCategory} Organizer Credentials (Resent)`,
      username: organizer.email,
      password: passwordToUse,
      loginLink: config.clientUrl,
      sentAt: new Date().toISOString(),
      status: dispatchResult.status,
      realDelivered: dispatchResult.delivered,
      sender: `HOD / Super Admin (${req.user?.name || 'Prof. Dr. Tariq Mahmood'})`
    };

    store.recordSentEmail(mailRecord);

    return res.json({
      success: true,
      message: dispatchResult.delivered
        ? `Credentials email successfully dispatched to ${organizer.email}!`
        : `Email delivery status: ${dispatchResult.status}`,
      mailRecord,
      emailDispatch: dispatchResult
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
