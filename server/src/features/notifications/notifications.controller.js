import { store } from '../../shared/database/store.js';

/**
 * Controller: Get sent emails ledger (HOD Outbox inspection)
 * By default returns the updated/latest onboarding credentials email per organizer.
 */
export const getOutboxLedger = async (req, res) => {
  try {
    const latestOnly = req.query.all !== 'true';
    const emails = store.getSentEmails({ latestOnly });
    return res.json({
      success: true,
      count: emails.length,
      emails
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Controller: Delete an email record from the outbox / delivered inboxes
 */
export const deleteOutboxEmail = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ success: false, message: 'Email ID is required.' });
    }
    const removed = store.deleteSentEmail(id);
    return res.json({
      success: true,
      message: 'Organizer inbox record deleted successfully.',
      deletedId: id
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Controller: Clear all outbox emails
 */
export const clearOutboxLedger = async (req, res) => {
  try {
    store.clearSentEmails();
    return res.json({
      success: true,
      message: 'All delivered organizer inbox records cleared successfully.'
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
