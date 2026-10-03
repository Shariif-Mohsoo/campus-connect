/**
 * Legacy compatibility re-export
 * Controllers have been decomposed into feature-specific controllers:
 * - features/auth/auth.controller.js
 * - features/organizers/organizer.controller.js
 * - features/notifications/notifications.controller.js
 */
export { login, getProfile } from '../features/auth/auth.controller.js';
export {
  getOrganizers,
  createOrganizer,
  deleteOrganizer,
  resendOrganizerCredentialsEmail
} from '../features/organizers/organizer.controller.js';
export { getOutboxLedger as getSentEmails } from '../features/notifications/notifications.controller.js';
