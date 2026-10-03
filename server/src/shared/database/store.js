import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { config } from '../config/env.js';
import { logger } from '../utils/logger.js';
import {
  User,
  Category,
  Activity,
  Proposal,
  Registration,
  ProposalComment,
  SentEmail,
  AuditLog
} from './models/index.js';

/**
 * Category Definitions with Dynamic Capacity and Specialized Module Tags
 * (Requirement 1, 2, 4 & 5)
 */
export const initialCategories = [
  {
    _id: 'cat-sports',
    id: 'Sports',
    name: 'Sports & Athletics',
    icon: '⚽',
    color: '#38bdf8',
    bg: 'rgba(56, 189, 248, 0.15)',
    border: 'rgba(56, 189, 248, 0.35)',
    desc: 'Tournaments, sports matches, pitches & athletic squads',
    maxOrganizers: 3,
    isSpecialized: true,
    specializedModule: 'sports',
    createdAt: '2026-09-01T08:00:00.000Z'
  },
  {
    _id: 'cat-culture',
    id: 'Culture Day',
    name: 'Culture Day & Gala',
    icon: '🎭',
    color: '#fbbf24',
    bg: 'rgba(245, 158, 11, 0.15)',
    border: 'rgba(245, 158, 11, 0.35)',
    desc: 'Cultural pavilions, folk performances, food stalls & heritage',
    maxOrganizers: 3,
    isSpecialized: true,
    specializedModule: 'culture',
    createdAt: '2026-09-01T08:00:00.000Z'
  },
  {
    _id: 'cat-tech',
    id: 'Tech & Hackathon',
    name: 'Tech & Hackathons',
    icon: '💻',
    color: '#a5b4fc',
    bg: 'rgba(129, 140, 248, 0.15)',
    border: 'rgba(129, 140, 248, 0.35)',
    desc: 'Coding sprints, AI challenges, dev labs & robotics',
    maxOrganizers: 3,
    isSpecialized: true,
    specializedModule: 'tech',
    createdAt: '2026-09-01T08:00:00.000Z'
  },
  {
    _id: 'cat-arts',
    id: 'Arts & Drama',
    name: 'Arts & Drama',
    icon: '🎨',
    color: '#f472b6',
    bg: 'rgba(236, 72, 153, 0.15)',
    border: 'rgba(236, 72, 153, 0.35)',
    desc: 'Theater productions, gallery exhibitions & music shows',
    maxOrganizers: 3,
    isSpecialized: false,
    specializedModule: null,
    createdAt: '2026-09-01T08:00:00.000Z'
  },
  {
    _id: 'cat-literary',
    id: 'Literary & Debates',
    name: 'Literary & Debates',
    icon: '🎤',
    color: '#34d399',
    bg: 'rgba(52, 211, 153, 0.15)',
    border: 'rgba(52, 211, 153, 0.35)',
    desc: 'Declamations, Model UN, parliamentary debates',
    maxOrganizers: 3,
    isSpecialized: false,
    specializedModule: null,
    createdAt: '2026-09-01T08:00:00.000Z'
  }
];

/**
 * Category Normalizer Helper: Ensures uniform category matching across
 * Sports, Culture Day, Tech & Hackathon, and dynamic generic categories.
 */
export function normalizeCategory(cat, categoriesList = null) {
  if (!cat) return 'Sports';
  const c = String(cat).toLowerCase().trim();
  if (c.includes('sport')) return 'Sports';
  if (c.includes('cultur')) return 'Culture Day';
  if (c.includes('tech') || c.includes('hack')) return 'Tech & Hackathon';

  const list = Array.isArray(categoriesList) ? categoriesList : initialCategories;
  const match = list.find(item =>
    (item.id && item.id.toLowerCase() === c) ||
    (item.name && item.name.toLowerCase() === c)
  );
  if (match) return match.id;
  return String(cat).trim();
}

export const initialUsers = [
  {
    _id: 'user-admin-1',
    name: config.hod.name,
    rollNumber: 'FAC-001',
    email: config.hod.email,
    passwordHash: bcrypt.hashSync(config.hod.password, 10),
    plainPasswordHint: '••••••••',
    role: 'admin',
    department: 'Directorate of Student Affairs & Sports',
    designation: 'Head of Department / Super Admin',
    createdAt: '2026-09-01T08:00:00.000Z'
  }
];

export const initialEmails = [];

// Clean Production State: No dummy proposals, activities, registrations, or comments
export const initialProposals = [];
export const initialActivities = [];
export const initialRegistrations = [];
export const initialComments = [];


/**
 * Shared In-Memory Data Store with Atomic Cascading Deletion Engine
 */
class SharedDataStore {
  constructor() {
    this.categories = JSON.parse(JSON.stringify(initialCategories));
    this.users = [...initialUsers];
    this.sentEmails = [...initialEmails];
    this.proposals = [...initialProposals];
    this.activities = [...initialActivities];
    this.registrations = [...initialRegistrations];
    this.comments = [...initialComments];
    this._migrateExistingData();

    // Auto-sync when Mongoose connection is established
    mongoose.connection.on('connected', () => {
      this.initFromMongo();
    });
    mongoose.connection.on('reconnected', () => {
      this.initFromMongo();
    });
    if (mongoose.connection.readyState === 1) {
      this.initFromMongo();
    }
  }

  /**
   * Synchronize state from MongoDB collections whenever database is active
   */
  async initFromMongo() {
    if (mongoose.connection.readyState !== 1) return;
    try {
      const [categories, users, proposals, activities, registrations, comments, emails] = await Promise.all([
        Category.find({}).lean(),
        User.find({}).lean(),
        Proposal.find({}).lean(),
        Activity.find({}).lean(),
        Registration.find({}).lean(),
        ProposalComment.find({}).lean(),
        SentEmail.find({}).lean()
      ]);

      if (categories && categories.length > 0) this.categories = categories;
      if (users && users.length > 0) this.users = users;
      if (proposals && proposals.length > 0) this.proposals = proposals;
      if (activities && activities.length > 0) this.activities = activities;
      if (registrations && registrations.length > 0) this.registrations = registrations;
      if (comments && comments.length > 0) this.comments = comments;
      if (emails && emails.length > 0) {
        const hodEmail = (config.hod?.email || 'admin@university.edu').toLowerCase();
        this.sentEmails = emails.filter(m => {
          const toLower = (m.to || '').trim().toLowerCase();
          return toLower !== hodEmail && toLower !== 'admin@university.edu' && !(m.subject && m.subject.includes('Proposal Submitted'));
        });
      }

      logger.info(`📦 [Store] Initialized from MongoDB: ${this.proposals.length} proposals, ${this.activities.length} activities, ${this.registrations.length} registrations, ${this.users.length} users, ${this.categories.length} categories.`);
    } catch (err) {
      logger.warn('[Store] Initializing from MongoDB notice:', err.message);
    }
  }

  /**
   * Safe In-Memory Data Migration (Requirement 8):
   * Ensures existing proposals have createdBy, lastUpdatedBy, and activityLog.
   * Ensures activities have lastUpdatedBy.
   * Preserves all existing IDs and database relationships.
   */
  _migrateExistingData() {
    this.proposals.forEach(prop => {
      const creatorUser = this.users.find(u => u._id === prop.organizerId);
      if (!prop.createdBy) {
        prop.createdBy = {
          _id: prop.organizerId || 'user-org-1',
          name: prop.organizerName || 'Lead Organizer',
          email: creatorUser?.email || '',
          rollNumber: creatorUser?.rollNumber || ''
        };
      }
      if (!prop.lastUpdatedBy) {
        prop.lastUpdatedBy = { ...prop.createdBy };
      }
      if (!Array.isArray(prop.activityLog)) {
        prop.activityLog = [
          {
            _id: `log-seed-${prop._id}-1`,
            action: 'PROPOSAL_CREATED',
            details: `Drafted proposal "${prop.title}"`,
            organizerId: prop.organizerId,
            organizerName: prop.organizerName,
            organizerRole: 'organizer',
            timestamp: prop.createdAt || '2026-09-20T10:00:00.000Z'
          },
          {
            _id: `log-seed-${prop._id}-2`,
            action: 'HOD_REVIEW',
            details: prop.status === 'Approved' ? 'Proposal approved by Directorate of Student Affairs.' : `Proposal status: ${prop.status}`,
            organizerId: 'user-admin-1',
            organizerName: 'Prof. Dr. Tariq Mahmood',
            organizerRole: 'admin',
            timestamp: prop.updatedAt || '2026-09-21T12:00:00.000Z'
          }
        ];
      }
    });

    this.activities.forEach(act => {
      if (!act.lastUpdatedBy) {
        const parentProp = this.proposals.find(p => p._id === act.proposalId);
        act.lastUpdatedBy = {
          _id: parentProp?.organizerId || 'user-org-1',
          name: parentProp?.organizerName || 'Lead Organizer'
        };
      }
    });
  }

  // ==========================================
  // USERS & ORGANIZERS
  // ==========================================

  getUsers() {
    return this.users.map(({ passwordHash, ...user }) => user);
  }

  getOrganizers() {
    return this.users
      .filter(u => u.role === 'organizer')
      .map(({ passwordHash, ...user }) => user);
  }

  normalizeCategory(cat) {
    return normalizeCategory(cat, this.categories);
  }

  /**
   * Organizer Team Management (Requirement 1 & 3):
   * Get active team members for a category.
   */
  getCategoryTeam(category) {
    const norm = this.normalizeCategory(category);
    return this.users
      .filter(u => u.role === 'organizer' && this.normalizeCategory(u.category) === norm)
      .map(({ passwordHash, ...user }) => user);
  }

  /**
   * Organizer Team Management (Requirement 1 & 2):
   * Summarize all category teams with dynamic capacities and member rosters.
   */
  getAllCategoryTeams() {
    return this.categories.map(cat => {
      const members = this.getCategoryTeam(cat.id);
      const maxCapacity = Number(cat.maxOrganizers) || 3;
      return {
        id: cat.id,
        category: cat.id,
        name: cat.name,
        icon: cat.icon || '🏷️',
        color: cat.color || '#6366f1',
        bg: cat.bg || 'rgba(99, 102, 241, 0.15)',
        border: cat.border || 'rgba(99, 102, 241, 0.35)',
        desc: cat.desc || '',
        count: members.length,
        maxCapacity,
        maxOrganizers: maxCapacity,
        isFull: members.length >= maxCapacity,
        isSpecialized: Boolean(cat.isSpecialized),
        specializedModule: cat.specializedModule || null,
        members
      };
    });
  }

  // ==========================================
  // DYNAMIC CATEGORIES CRUD (Requirement 1, 2 & 10)
  // ==========================================

  getCategories() {
    return this.categories.map(cat => {
      const members = this.getCategoryTeam(cat.id);
      const maxCapacity = Number(cat.maxOrganizers) || 3;
      const proposals = this.proposals.filter(p => this.normalizeCategory(p.category) === this.normalizeCategory(cat.id));
      const proposalIds = proposals.map(p => p._id);
      const registrations = this.registrations.filter(r => proposalIds.includes(r.proposalId));

      return {
        _id: cat._id,
        id: cat.id,
        name: cat.name,
        icon: cat.icon || '🏷️',
        color: cat.color || '#6366f1',
        bg: cat.bg || 'rgba(99, 102, 241, 0.15)',
        border: cat.border || 'rgba(99, 102, 241, 0.35)',
        desc: cat.desc || '',
        maxOrganizers: maxCapacity,
        count: members.length,
        isFull: members.length >= maxCapacity,
        isSpecialized: Boolean(cat.isSpecialized),
        specializedModule: cat.specializedModule || null,
        proposalCount: proposals.length,
        registrationCount: registrations.length,
        organizers: members.map(m => ({
          _id: m._id,
          name: m.name,
          email: m.email,
          rollNumber: m.rollNumber,
          department: m.department
        })),
        formConfig: cat.formConfig || null,
        createdAt: cat.createdAt,
        updatedAt: cat.updatedAt
      };
    });
  }

  getCategoryById(id) {
    if (!id) return null;
    const clean = String(id).toLowerCase().trim();
    return this.categories.find(c =>
      c.id.toLowerCase() === clean ||
      c._id === id ||
      c.name.toLowerCase() === clean ||
      this.normalizeCategory(c.id) === this.normalizeCategory(id)
    ) || null;
  }

  createCategory({
    name,
    id,
    icon = '🏷️',
    color = '#6366f1',
    desc = '',
    maxOrganizers = 3,
    formConfig = null
  }) {
    if (!name || !name.trim()) {
      throw new Error('Category name is required.');
    }
    const cleanName = name.trim();
    const cleanId = id && id.trim()
      ? id.trim()
      : cleanName.replace(/[^a-zA-Z0-9\s&]/g, '').trim();

    // Check unique ID / Name
    const existing = this.categories.find(c =>
      c.id.toLowerCase() === cleanId.toLowerCase() ||
      c.name.toLowerCase() === cleanName.toLowerCase()
    );
    if (existing) {
      throw new Error(`A category with name "${cleanName}" or identifier "${cleanId}" already exists.`);
    }

    const maxLimit = Number(maxOrganizers);
    if (isNaN(maxLimit) || maxLimit < 1) {
      throw new Error('Maximum organizers limit must be at least 1.');
    }

    const newCategory = {
      _id: `cat-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      id: cleanId,
      name: cleanName,
      icon: icon || '🏷️',
      color: color || '#6366f1',
      bg: `${color}25` || 'rgba(99, 102, 241, 0.15)',
      border: `${color}60` || 'rgba(99, 102, 241, 0.35)',
      desc: desc ? desc.trim() : '',
      maxOrganizers: maxLimit,
      isSpecialized: false,
      specializedModule: null,
      formConfig: formConfig || null,
      createdAt: new Date().toISOString()
    };

    this.categories.push(newCategory);
    if (mongoose.connection.readyState === 1) {
      Category.create(newCategory).catch(err => logger.db('Mongo createCategory error:', err.message));
    }
    return newCategory;
  }

  updateCategory(id, updates = {}) {
    const cat = this.getCategoryById(id);
    if (!cat) throw new Error('Category not found.');

    if (updates.name && updates.name.trim()) {
      const cleanName = updates.name.trim();
      const duplicate = this.categories.find(c =>
        c._id !== cat._id && c.name.toLowerCase() === cleanName.toLowerCase()
      );
      if (duplicate) {
        throw new Error(`Another category with name "${cleanName}" already exists.`);
      }
      cat.name = cleanName;
    }

    if (updates.maxOrganizers !== undefined) {
      const newLimit = Number(updates.maxOrganizers);
      if (isNaN(newLimit) || newLimit < 1) {
        throw new Error('Maximum organizers limit must be at least 1.');
      }
      const currentTeam = this.getCategoryTeam(cat.id);
      if (newLimit < currentTeam.length) {
        const err = new Error(
          `Cannot reduce organizer limit to ${newLimit}. The "${cat.name}" category currently has ${currentTeam.length} active organizer(s) assigned (${currentTeam.map(u => u.name).join(', ')}). Please remove or reassign organizers before reducing the limit.`
        );
        err.statusCode = 400;
        err.currentCount = currentTeam.length;
        err.newLimit = newLimit;
        throw err;
      }
      cat.maxOrganizers = newLimit;
    }

    if (updates.icon !== undefined) cat.icon = updates.icon || '🏷️';
    if (updates.desc !== undefined) cat.desc = updates.desc ? updates.desc.trim() : '';
    if (updates.color) {
      cat.color = updates.color;
      cat.bg = `${updates.color}25`;
      cat.border = `${updates.color}60`;
    }
    if (updates.formConfig !== undefined) cat.formConfig = updates.formConfig;

    cat.updatedAt = new Date().toISOString();
    if (mongoose.connection.readyState === 1) {
      Category.updateOne({ _id: cat._id }, { $set: cat }).catch(err => logger.db('Mongo updateCategory error:', err.message));
    }
    return cat;
  }

  deleteCategory(id) {
    const cat = this.getCategoryById(id);
    if (!cat) throw new Error('Category not found.');

    if (cat.isSpecialized) {
      const err = new Error(`The core specialized category "${cat.name}" cannot be deleted as it contains dedicated system workflows.`);
      err.statusCode = 400;
      throw err;
    }

    const assignedOrganizers = this.getCategoryTeam(cat.id);
    const relatedProposals = this.proposals.filter(p =>
      this.normalizeCategory(p.category) === this.normalizeCategory(cat.id)
    );
    const proposalIds = relatedProposals.map(p => p._id);
    const relatedActivities = this.activities.filter(a => proposalIds.includes(a.proposalId));
    const activityIds = relatedActivities.map(a => a._id);
    const relatedRegistrations = this.registrations.filter(r =>
      proposalIds.includes(r.proposalId) || activityIds.includes(r.activityId)
    );

    if (assignedOrganizers.length > 0 || relatedProposals.length > 0 || relatedRegistrations.length > 0) {
      const reasons = [];
      if (assignedOrganizers.length > 0) {
        reasons.push(`${assignedOrganizers.length} assigned organizer(s) (${assignedOrganizers.map(o => o.name).join(', ')})`);
      }
      if (relatedProposals.length > 0) {
        reasons.push(`${relatedProposals.length} event proposal(s)`);
      }
      if (relatedRegistrations.length > 0) {
        reasons.push(`${relatedRegistrations.length} student registration(s)`);
      }

      const err = new Error(
        `Cannot delete category "${cat.name}". It is currently linked to: ${reasons.join(', ')}. To preserve university records and prevent orphaned entries, reassign or remove these items before deleting the category.`
      );
      err.statusCode = 400;
      err.code = 'CATEGORY_IN_USE';
      err.details = {
        organizerCount: assignedOrganizers.length,
        proposalCount: relatedProposals.length,
        registrationCount: relatedRegistrations.length
      };
      throw err;
    }

    const index = this.categories.findIndex(c => c._id === cat._id || c.id === cat.id);
    if (index === -1) throw new Error('Category not found.');
    const [deleted] = this.categories.splice(index, 1);

    if (mongoose.connection.readyState === 1) {
      Category.deleteOne({ _id: deleted._id }).catch(err => logger.db('Mongo deleteCategory error:', err.message));
    }

    return {
      success: true,
      message: `Category "${deleted.name}" deleted successfully.`,
      category: deleted
    };
  }

  getUserById(id) {
    return this.users.find(u => u._id === id) || null;
  }

  getUserByEmail(email) {
    if (!email) return null;
    return this.users.find(u => u.email.toLowerCase() === email.trim().toLowerCase()) || null;
  }

  createOrganizer({ name, rollNumber, department, email, password, category = 'Sports', addedByName = 'Super Admin (HOD)' }) {
    const cleanEmail = email.trim().toLowerCase();
    const existing = this.getUserByEmail(cleanEmail);
    if (existing) {
      throw new Error(`An account with email "${cleanEmail}" already exists.`);
    }

    const cleanRoll = rollNumber ? rollNumber.trim().toUpperCase() : '';
    if (cleanRoll && cleanRoll !== 'N/A') {
      const existingRoll = this.users.find(u => u.rollNumber && u.rollNumber.toUpperCase() === cleanRoll);
      if (existingRoll) {
        throw new Error(`An account with Roll Number "${cleanRoll}" already exists (${existingRoll.name}).`);
      }
    }

    const assignedCategory = this.normalizeCategory(category);
    const catConfig = this.getCategoryById(assignedCategory);
    const maxCapacity = catConfig ? (Number(catConfig.maxOrganizers) || 3) : 3;
    const currentTeam = this.getCategoryTeam(assignedCategory);
    if (currentTeam.length >= maxCapacity) {
      throw new Error(`The "${catConfig?.name || assignedCategory}" team has already reached the maximum capacity of ${maxCapacity} active organizers. Adjust the team limit or remove an existing member before adding a new one.`);
    }

    const assignedPassword = password && password.trim() ? password.trim() : `Org@${Math.floor(1000 + Math.random() * 9000)}`;
    const passwordHash = bcrypt.hashSync(assignedPassword, 10);

    const newOrganizer = {
      _id: `user-org-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      name: name.trim(),
      rollNumber: cleanRoll || 'N/A',
      email: cleanEmail,
      passwordHash,
      plainPasswordHint: assignedPassword,
      role: 'organizer',
      department: department || 'Computer Science',
      category: assignedCategory,
      designation: `${assignedCategory} Activity Organizer`,
      createdAt: new Date().toISOString()
    };

    this.users.push(newOrganizer);

    const mailRecord = {
      _id: `mail-${Date.now()}`,
      to: cleanEmail,
      recipientName: name.trim(),
      rollNumber: newOrganizer.rollNumber,
      department: newOrganizer.department,
      category: assignedCategory,
      subject: `Welcome to UniActivity Hub - ${assignedCategory} Organizer Credentials`,
      username: cleanEmail,
      password: assignedPassword,
      loginLink: config.clientUrl,
      sentAt: new Date().toISOString(),
      status: 'Delivered',
      sender: `HOD / Super Admin (${addedByName})`
    };

    this.sentEmails.unshift(mailRecord);
    if (mongoose.connection.readyState === 1) {
      User.create(newOrganizer).catch(err => logger.db('Mongo create User error:', err.message));
      SentEmail.create(mailRecord).catch(err => logger.db('Mongo create SentEmail error:', err.message));
    }

    const { passwordHash: _, ...safeUser } = newOrganizer;
    return {
      organizer: safeUser,
      generatedPassword: assignedPassword,
      mailRecord
    };
  }

  deleteOrganizer(id) {
    const idx = this.users.findIndex(u => u._id === id && u.role === 'organizer');
    if (idx === -1) {
      throw new Error('Organizer not found or cannot delete super admin.');
    }
    const removed = this.users.splice(idx, 1)[0];
    if (mongoose.connection.readyState === 1) {
      User.deleteOne({ _id: id }).catch(err => logger.db('Mongo delete User error:', err.message));
    }
    const { passwordHash: _, ...safeUser } = removed;
    return safeUser;
  }


  recordSentEmail(mailRecord) {
    if (!mailRecord) return;
    this.sentEmails.unshift(mailRecord);
    if (mongoose.connection.readyState === 1) {
      SentEmail.create(mailRecord).catch(err => logger.db('Mongo create SentEmail error:', err.message));
    }
  }

  // ==========================================
  // OUTBOX AUDIT LEDGER
  // ==========================================

  getSentEmails({ latestOnly = true } = {}) {
    const hodEmail = (config.hod?.email || 'admin@university.edu').toLowerCase();

    // 1. Filter: show only emails sent by HOD to organizers (exclude HOD/admin emails and internal proposal notifications)
    const organizerEmails = this.sentEmails.filter(mail => {
      if (!mail || !mail.to) return false;
      const toLower = mail.to.trim().toLowerCase();
      if (toLower === hodEmail || toLower === 'admin@university.edu') return false;
      if (mail.subject && mail.subject.includes('Proposal Submitted for Review')) return false;
      return true;
    });

    // 2. Sort descending by sent date (newest first)
    const sorted = [...organizerEmails].sort((a, b) => new Date(b.sentAt || 0) - new Date(a.sentAt || 0));

    if (!latestOnly) {
      return sorted;
    }

    // 3. Deduplicate: retain only the latest/updated credentials email for each organizer
    const seen = new Set();
    const latestEmails = [];
    for (const mail of sorted) {
      const key = mail.to.trim().toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        latestEmails.push(mail);
      }
    }

    return latestEmails;
  }

  deleteSentEmail(id) {
    const target = this.sentEmails.find(m => m._id === id || String(m._id) === String(id));
    const recipient = target?.to ? target.to.trim().toLowerCase() : null;

    // Remove from memory
    this.sentEmails = this.sentEmails.filter(m => {
      if (m._id === id || String(m._id) === String(id)) return false;
      if (recipient && m.to && m.to.trim().toLowerCase() === recipient) return false;
      return true;
    });

    // Remove from MongoDB
    if (mongoose.connection.readyState === 1) {
      if (recipient) {
        SentEmail.deleteMany({
          $or: [
            { _id: id },
            { to: recipient }
          ]
        }).catch(err => logger.db('Mongo delete SentEmail error:', err.message));
      } else {
        SentEmail.deleteOne({ _id: id }).catch(err => logger.db('Mongo delete SentEmail error:', err.message));
      }
    }

    return target;
  }

  clearSentEmails() {
    this.sentEmails = [];
    if (mongoose.connection.readyState === 1) {
      SentEmail.deleteMany({}).catch(err => logger.db('Mongo clear SentEmail error:', err.message));
    }
    return true;
  }

  // ==========================================
  // SPORTS PROPOSALS (CRUD & LIFECYCLE)
  // ==========================================

  /**
   * Helper: Attaches live status and participant counts to an activity object
   * Supports both individual participation (seats) and team competitions (teams counted as teams).
   */
  _populateActivity(act) {
    const registrations = this.registrations.filter(r => r.activityId === act._id);
    const deadlineReached = act.registrationDeadline ? Date.now() >= new Date(act.registrationDeadline).getTime() : false;

    const isTeamActivity = (act.minTeamSize !== undefined && act.minTeamSize > 1) ||
      (act.maxTeamSize !== undefined && act.maxTeamSize > 1) ||
      (act.maxTeams !== undefined && act.minTeamSize !== 1);

    const capacity = act.maxTeams || act.participantLimit || (isTeamActivity ? 10 : 20);
    const registeredCount = registrations.length;
    const capacityReached = registeredCount >= capacity;
    const isClosed = act.isRegistrationManuallyClosed || deadlineReached || capacityReached;
    const remainingSlots = Math.max(0, capacity - registeredCount);

    let statusText = isClosed ? 'Registration Closed' : 'Registration Open';
    if (!isClosed) {
      if (isTeamActivity) {
        statusText = `${registeredCount} / ${capacity} Teams — ${remainingSlots} Slots Remaining`;
      } else {
        statusText = `${registeredCount} / ${capacity} Applications — ${remainingSlots} Seats Remaining`;
      }
    } else if (capacityReached) {
      statusText = isTeamActivity
        ? `${capacity} / ${capacity} Teams — Registration Full`
        : `${capacity} / ${capacity} Applications — Registration Full`;
    }

    const totalStudentsCount = registrations.reduce((sum, r) => sum + (r.members?.length || 1), 0);

    const registeredRollNumbers = Array.from(new Set(
      registrations.flatMap(r => {
        const rolls = [];
        if (r.rollNumber) rolls.push(String(r.rollNumber).trim().toUpperCase());
        if (Array.isArray(r.members)) {
          r.members.forEach(m => {
            if (m.rollNumber) rolls.push(String(m.rollNumber).trim().toUpperCase());
          });
        }
        return rolls;
      })
    ));

    return {
      ...act,
      participantLimit: capacity,
      maxTeams: capacity,
      minTeamSize: act.minTeamSize || 1,
      maxTeamSize: act.maxTeamSize || 1,
      registeredCount,
      registeredTeamsCount: registeredCount,
      totalStudentsCount,
      registeredRollNumbers,
      remainingSeats: remainingSlots,
      remainingTeams: remainingSlots,
      isDeadlineReached: deadlineReached,
      isCapacityReached: capacityReached,
      isRegistrationClosed: isClosed,
      registrationStatusText: statusText
    };
  }

  /**
   * Helper: Attaches all child activities to a proposal
   */
  _populateProposal(prop) {
    const childActivities = this.activities
      .filter(a => a.proposalId === prop._id)
      .map(a => this._populateActivity(a));

    const totalApplications = this.registrations.filter(r => r.proposalId === prop._id).length;
    const comments = this.getProposalComments(prop._id);

    return {
      ...prop,
      activities: childActivities,
      activitiesCount: childActivities.length,
      totalApplications,
      comments
    };
  }

  /**
   * Get proposals with optional filters
   */
  /**
   * Helper: Check if user is authorized for a proposal (Admin OR Category Team Organizer)
   */
  isUserAuthorizedForProposal(user, prop) {
    if (!user || !prop) return false;
    if (user.role === 'admin') return true;
    if (user.role === 'organizer') {
      return normalizeCategory(user.category) === normalizeCategory(prop.category);
    }
    return false;
  }

  /**
   * Helper: Check if user is authorized for a specific child activity
   */
  isUserAuthorizedForActivity(user, activityId) {
    if (!user) return false;
    if (user.role === 'admin') return true;
    const act = this.activities.find(a => a._id === activityId);
    if (!act) return false;
    const prop = this.proposals.find(p => p._id === act.proposalId);
    if (!prop) return false;
    return this.isUserAuthorizedForProposal(user, prop);
  }

  /**
   * Activity Logging Engine (Requirement 6):
   * Appends an audit trail entry and sets lastUpdatedBy & updatedAt.
   */
  _logProposalActivity(proposalId, { action, details, user }) {
    const prop = this.proposals.find(p => p._id === proposalId);
    if (!prop) return null;
    if (!Array.isArray(prop.activityLog)) {
      prop.activityLog = [];
    }
    const logEntry = {
      _id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      action,
      details,
      organizerId: user?._id || 'user-unknown',
      organizerName: user?.name || 'Authorized Member',
      organizerRole: user?.role || 'organizer',
      timestamp: new Date().toISOString()
    };
    prop.activityLog.unshift(logEntry);
    if (user) {
      prop.lastUpdatedBy = {
        _id: user._id,
        name: user.name,
        email: user.email || '',
        rollNumber: user.rollNumber || ''
      };
    }
    prop.updatedAt = new Date().toISOString();
    return logEntry;
  }

  /**
   * Get proposals with shared team workspace visibility (Requirement 2 & 3)
   */
  getProposals({ organizerId, category, user, status, publicOnly = false } = {}) {
    const targetCategory = category
      ? normalizeCategory(category)
      : (user && user.role === 'organizer' ? normalizeCategory(user.category) : null);

    let list = this.proposals
      .filter(p => {
        if (publicOnly && !p.isPublic) return false;
        if (status && p.status !== status) return false;

        // If target category is specified (or deduced from organizer), filter by category
        if (targetCategory && normalizeCategory(p.category) !== targetCategory) {
          return false;
        }

        // If user is organizer, enforce strict category isolation
        if (user && user.role === 'organizer') {
          if (normalizeCategory(p.category) !== normalizeCategory(user.category)) {
            return false;
          }
        }

        // Backward compatibility: if caller passed organizerId without user and without matching category
        if (!user && !targetCategory && organizerId) {
          const orgUser = this.getUserById(organizerId);
          if (orgUser && orgUser.role === 'organizer') {
            if (normalizeCategory(p.category) !== normalizeCategory(orgUser.category)) return false;
          } else if (p.organizerId !== organizerId) {
            return false;
          }
        }

        return true;
      })
      .map(p => this._populateProposal(p))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Support pagination metadata (Requirement 6)
    const { page, limit } = (arguments[0] || {});
    if (page !== undefined || limit !== undefined) {
      const validLimit = Math.min(Math.max(1, parseInt(limit, 10) || 20), 100);
      const validPage = Math.max(1, parseInt(page, 10) || 1);
      const total = list.length;
      const totalPages = Math.ceil(total / validLimit) || 1;
      const paginatedData = list.slice((validPage - 1) * validLimit, validPage * validLimit);

      return {
        proposals: paginatedData,
        page: validPage,
        pageSize: validLimit,
        totalRecords: total,
        totalPages
      };
    }

    return list;
  }

  getProposalById(id) {
    const prop = this.proposals.find(p => p._id === id);
    if (!prop) return null;
    return this._populateProposal(prop);
  }

  getActivityById(id) {
    const act = this.activities.find(a => a._id === id);
    if (!act) return null;
    return this._populateActivity(act);
  }

  getProposalByActivityId(activityId) {
    const act = this.activities.find(a => a._id === activityId);
    if (!act) return null;
    return this.getProposalById(act.proposalId);
  }

  /**
   * Create Proposal (Requirement 2, 4 & 6):
   * Validates duplicate draft/pending proposals for the category team.
   * Attaches createdBy, lastUpdatedBy, and initial audit log.
   */
  createProposal({
    title,
    category = 'Sports',
    description = '',
    organizerId,
    organizerName,
    user,
    department,
    startDate,
    endDate,
    activities = []
  }) {
    if (!title || !title.trim()) {
      throw new Error('Proposal title is required.');
    }

    const normCategory = normalizeCategory(category);
    const creatorUser = user || this.getUserById(organizerId);

    // Permission check for organizers: cannot create for other categories
    if (creatorUser && creatorUser.role === 'organizer') {
      if (normalizeCategory(creatorUser.category) !== normCategory) {
        const err = new Error(`Unauthorized: You are assigned to the ${creatorUser.category} team and cannot create proposals for ${normCategory}.`);
        err.statusCode = 403;
        throw err;
      }
    }

    // Rule 4: Prevent Duplicate Proposals in same team and category context
    const existingPendingOrDraft = this.proposals.find(p =>
      normalizeCategory(p.category) === normCategory &&
      (p.status === 'Draft' || p.status === 'Pending HOD Approval')
    );

    if (existingPendingOrDraft) {
      const err = new Error(
        `An active proposal ("${existingPendingOrDraft.title}") is already in progress for ${normCategory} (${existingPendingOrDraft.status}) drafted by ${existingPendingOrDraft.organizerName || 'a team member'}. Team members should collaborate on this existing proposal rather than creating an uncoordinated duplicate.`
      );
      err.statusCode = 409;
      err.code = 'DUPLICATE_PROPOSAL';
      err.existingProposal = this._populateProposal(existingPendingOrDraft);
      throw err;
    }

    const existingExactTitle = this.proposals.find(p =>
      normalizeCategory(p.category) === normCategory &&
      p.title.trim().toLowerCase() === title.trim().toLowerCase()
    );

    if (existingExactTitle) {
      const err = new Error(
        `A proposal with the title "${title.trim()}" already exists in the ${normCategory} team (${existingExactTitle.status}). Please choose a distinct title or open the existing proposal.`
      );
      err.statusCode = 409;
      err.code = 'DUPLICATE_TITLE';
      err.existingProposal = this._populateProposal(existingExactTitle);
      throw err;
    }

    const proposalId = `prop-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;

    const authorMeta = {
      _id: creatorUser?._id || organizerId || 'user-org-1',
      name: creatorUser?.name || organizerName || 'Organizer',
      email: creatorUser?.email || '',
      rollNumber: creatorUser?.rollNumber || ''
    };

    const newProposal = {
      _id: proposalId,
      title: title.trim(),
      category: normCategory,
      description: description.trim(),
      organizerId: authorMeta._id,
      organizerName: authorMeta.name,
      createdBy: authorMeta,
      lastUpdatedBy: authorMeta,
      department: department || creatorUser?.department || 'Directorate of Student Affairs',
      startDate: startDate || new Date().toISOString().split('T')[0],
      endDate: endDate || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      status: 'Draft',
      isPublic: false,
      revisionNotes: `Drafted by ${authorMeta.name}.`,
      activityLog: [
        {
          _id: `log-${Date.now()}`,
          action: 'PROPOSAL_CREATED',
          details: `Drafted proposal "${title.trim()}"`,
          organizerId: authorMeta._id,
          organizerName: authorMeta.name,
          organizerRole: creatorUser?.role || 'organizer',
          timestamp: new Date().toISOString()
        }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.proposals.unshift(newProposal);
    if (mongoose.connection.readyState === 1) {
      Proposal.create(newProposal).catch(err => logger.db('Mongo create Proposal error:', err.message));
    }

    // Create child activities if provided
    if (Array.isArray(activities) && activities.length > 0) {
      activities.forEach(act => {
        this.createActivity(proposalId, act, creatorUser || authorMeta);
      });
    }

    return this.getProposalById(proposalId);
  }

  /**
   * Edit Proposal (Requirement 2 & 3):
   * Authorized team members can collaborate and edit the shared proposal.
   * If an approved proposal is modified in any critical aspect, reset its status to
   * "Pending HOD Approval" so the organizer team cannot bypass HOD governance.
   */
  updateProposal(id, updates, userOrId, userRole) {
    const propIndex = this.proposals.findIndex(p => p._id === id);
    if (propIndex === -1) {
      throw new Error('Proposal not found.');
    }

    const prop = this.proposals[propIndex];

    const user = (typeof userOrId === 'object' && userOrId !== null)
      ? userOrId
      : this.getUserById(userOrId) || { _id: userOrId, role: userRole };

    // Authorization check: HOD admin or any member of the assigned category team
    if (!this.isUserAuthorizedForProposal(user, prop)) {
      const err = new Error(`Unauthorized: You can only edit proposals within your assigned category team ("${prop.category}").`);
      err.statusCode = 403;
      throw err;
    }

    // Determine if critical fields changed that require re-approval
    const criticalFields = ['title', 'startDate', 'endDate', 'description', 'activities'];
    const hasCriticalChanges = criticalFields.some(key => updates[key] !== undefined);

    let nextStatus = prop.status;
    let nextIsPublic = prop.isPublic;
    let revisionNote = prop.revisionNotes;

    // Rule 2: If proposal was already Approved or Submitted, require HOD review again
    if (hasCriticalChanges && (prop.status === 'Approved' || prop.status === 'Pending HOD Approval')) {
      nextStatus = 'Pending HOD Approval';
      nextIsPublic = false;
      revisionNote = `Modified by ${user.name || 'Organizer'} on ${new Date().toLocaleDateString()} — Requires HOD re-approval before publishing.`;
    }

    const authorMeta = {
      _id: user._id,
      name: user.name,
      email: user.email || '',
      rollNumber: user.rollNumber || ''
    };

    // Update proposal root fields
    const updated = {
      ...prop,
      title: updates.title !== undefined ? updates.title.trim() : prop.title,
      description: updates.description !== undefined ? updates.description.trim() : prop.description,
      startDate: updates.startDate || prop.startDate,
      endDate: updates.endDate || prop.endDate,
      venue: updates.venue !== undefined ? updates.venue.trim() : (prop.venue || 'Campus Facility'),
      generalRules: updates.generalRules !== undefined ? updates.generalRules : prop.generalRules,
      generalInstructions: updates.generalInstructions !== undefined ? updates.generalInstructions : prop.generalInstructions,
      status: updates.status && user.role === 'admin' ? updates.status : nextStatus,
      isPublic: user.role === 'admin' && updates.isPublic !== undefined ? updates.isPublic : nextIsPublic,
      revisionNotes: revisionNote,
      lastUpdatedBy: authorMeta,
      updatedAt: new Date().toISOString()
    };

    this.proposals[propIndex] = updated;
    if (mongoose.connection.readyState === 1) {
      Proposal.updateOne({ _id: id }, { $set: updated }).catch(err => logger.db('Mongo update Proposal error:', err.message));
    }

    // Log the update
    const changedFieldNames = Object.keys(updates).filter(k => k !== 'activities');
    this._logProposalActivity(id, {
      action: 'PROPOSAL_UPDATED',
      details: changedFieldNames.length > 0 ? `Updated proposal fields: ${changedFieldNames.join(', ')}` : 'Updated proposal details',
      user
    });

    // Handle embedded activities sync if provided
    if (Array.isArray(updates.activities)) {
      const incomingIds = updates.activities.filter(a => a._id).map(a => a._id);

      // Find activities to delete (ones present previously but not in new list)
      const existingActivities = this.activities.filter(a => a.proposalId === id);
      existingActivities.forEach(oldAct => {
        if (!incomingIds.includes(oldAct._id)) {
          this.deleteActivityCascade(id, oldAct._id, user, user.role);
        }
      });

      // Update or create each incoming activity
      updates.activities.forEach(act => {
        if (act._id && this.activities.some(a => a._id === act._id)) {
          this.updateActivity(id, act._id, act, user, user.role);
        } else {
          this.createActivity(id, act, user);
        }
      });
    }

    return this.getProposalById(id);
  }

  /**
   * Submit / Resubmit Proposal for HOD Approval (Requirement 5)
   */
  submitProposal(id, userOrId, userRole) {
    const prop = this.proposals.find(p => p._id === id);
    if (!prop) throw new Error('Proposal not found.');

    const user = (typeof userOrId === 'object' && userOrId !== null)
      ? userOrId
      : this.getUserById(userOrId) || { _id: userOrId, role: userRole };

    if (!this.isUserAuthorizedForProposal(user, prop)) {
      const err = new Error(`Unauthorized: You can only submit proposals within your assigned category team ("${prop.category}").`);
      err.statusCode = 403;
      throw err;
    }

    prop.status = 'Pending HOD Approval';
    prop.isPublic = false;
    prop.revisionNotes = `Submitted for HOD Review by ${user.name} on ${new Date().toLocaleDateString()}`;
    prop.lastUpdatedBy = {
      _id: user._id,
      name: user.name,
      email: user.email || '',
      rollNumber: user.rollNumber || ''
    };
    prop.updatedAt = new Date().toISOString();

    this._logProposalActivity(id, {
      action: 'PROPOSAL_SUBMITTED',
      details: 'Submitted proposal for HOD review & approval',
      user
    });

    if (mongoose.connection.readyState === 1) {
      Proposal.updateOne({ _id: id }, { $set: prop }).catch(err => logger.db('Mongo submit Proposal error:', err.message));
    }

    return this.getProposalById(id);
  }

  /**
   * HOD Review Proposal: Approve / Reject / Request Changes (Requirement 5)
   */
  reviewProposal(id, { status, feedbackNotes }, adminUser) {
    const prop = this.proposals.find(p => p._id === id);
    if (!prop) throw new Error('Proposal not found.');

    const validStatuses = ['Approved', 'Changes Requested', 'Rejected'];
    if (!validStatuses.includes(status)) {
      throw new Error(`Invalid status: ${status}. Must be one of ${validStatuses.join(', ')}.`);
    }

    prop.status = status;
    prop.isPublic = status === 'Approved';
    prop.revisionNotes = feedbackNotes ? feedbackNotes.trim() : `Reviewed by ${adminUser.name}: ${status}`;
    prop.lastUpdatedBy = {
      _id: adminUser._id,
      name: adminUser.name,
      email: adminUser.email || '',
      rollNumber: adminUser.rollNumber || ''
    };
    prop.updatedAt = new Date().toISOString();

    this._logProposalActivity(id, {
      action: 'HOD_REVIEW',
      details: `HOD marked proposal as "${status}"${feedbackNotes ? ` — Notes: ${feedbackNotes}` : ''}`,
      user: adminUser
    });

    // If feedback / change request is specified, automatically add it as an official HOD comment in the review thread
    if (feedbackNotes && feedbackNotes.trim()) {
      this.addProposalComment(id, { message: feedbackNotes.trim() }, adminUser);
    }

    if (mongoose.connection.readyState === 1) {
      Proposal.updateOne({ _id: id }, { $set: prop }).catch(err => logger.db('Mongo review Proposal error:', err.message));
    }

    return this.getProposalById(id);
  }

  /**
   * Rule 3 & Rule 7: CASCADE DELETION ENGINE
   * Deleting proposal MUST delete all child activities AND all grandchild student registrations.
   * Zero orphans remain.
   */
  deleteProposalCascade(id, userOrId, userRole) {
    const propIndex = this.proposals.findIndex(p => p._id === id);
    if (propIndex === -1) {
      throw new Error('Proposal not found.');
    }

    const prop = this.proposals[propIndex];

    const user = (typeof userOrId === 'object' && userOrId !== null)
      ? userOrId
      : this.getUserById(userOrId) || { _id: userOrId, role: userRole };

    // Authorization: only members of that category team or HOD admin can delete
    if (!this.isUserAuthorizedForProposal(user, prop)) {
      const err = new Error(`Unauthorized: You cannot delete proposals belonging to another category team.`);
      err.statusCode = 403;
      throw err;
    }

    // Step 1: Identify all child activities for this proposal
    const childActivityIds = this.activities
      .filter(a => a.proposalId === id)
      .map(a => a._id);

    // Step 2: Cascade delete all student registrations for these activities or proposalId
    const initialRegistrationsCount = this.registrations.length;
    this.registrations = this.registrations.filter(r =>
      r.proposalId !== id && !childActivityIds.includes(r.activityId)
    );
    const registrationsDeleted = initialRegistrationsCount - this.registrations.length;

    // Step 3: Cascade delete all child activities
    const initialActivitiesCount = this.activities.length;
    this.activities = this.activities.filter(a => a.proposalId !== id);
    const activitiesDeleted = initialActivitiesCount - this.activities.length;

    // Step 4: Cascade delete all proposal comments
    this.comments = this.comments.filter(c => c.proposalId !== id);

    // Step 5: Delete the parent proposal
    const [deletedProposal] = this.proposals.splice(propIndex, 1);

    if (mongoose.connection.readyState === 1) {
      Proposal.deleteOne({ _id: id }).catch(err => logger.db('Mongo delete Proposal error:', err.message));
      Activity.deleteMany({ proposalId: id }).catch(err => logger.db('Mongo delete Activities error:', err.message));
      Registration.deleteMany({ $or: [{ proposalId: id }, { activityId: { $in: childActivityIds } }] }).catch(err => logger.db('Mongo delete Registrations error:', err.message));
      ProposalComment.deleteMany({ proposalId: id }).catch(err => logger.db('Mongo delete Comments error:', err.message));
    }

    return {
      success: true,
      deletedProposalId: id,
      deletedTitle: deletedProposal.title,
      activitiesDeleted,
      registrationsDeleted,
      message: `Successfully deleted "${deletedProposal.title}" along with ${activitiesDeleted} activities and ${registrationsDeleted} registrations.`
    };
  }

  // ==========================================
  // PROPOSAL COMMENTS (HOD & ORGANIZER COLLABORATION)
  // ==========================================

  getProposalComments(proposalId) {
    return this.comments
      .filter(c => c.proposalId === proposalId)
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  }

  addProposalComment(proposalId, { message }, user) {
    const prop = this.proposals.find(p => p._id === proposalId);
    if (!prop) throw new Error('Proposal not found.');

    if (!message || !message.trim()) {
      throw new Error('Comment message is required.');
    }

    if (!this.isUserAuthorizedForProposal(user, prop)) {
      const err = new Error('Unauthorized: You can only comment on proposals within your category.');
      err.statusCode = 403;
      throw err;
    }

    const newComment = {
      _id: `comment-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      proposalId,
      authorId: user._id,
      authorName: user.name,
      authorRole: user.role, // 'admin' | 'organizer'
      message: message.trim(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.comments.push(newComment);
    if (mongoose.connection.readyState === 1) {
      ProposalComment.create(newComment).catch(err => logger.db('Mongo create Comment error:', err.message));
    }

    this._logProposalActivity(proposalId, {
      action: 'COMMENT_ADDED',
      details: `Added feedback comment to discussion thread`,
      user
    });

    return newComment;
  }

  updateProposalComment(proposalId, commentId, { message }, user) {
    const commentIndex = this.comments.findIndex(c => c._id === commentId && c.proposalId === proposalId);
    if (commentIndex === -1) {
      throw new Error('Comment not found.');
    }

    const comment = this.comments[commentIndex];

    // Only author or admin can edit
    if (user.role !== 'admin' && comment.authorId !== user._id) {
      const err = new Error('Unauthorized: You can only edit your own comments.');
      err.statusCode = 403;
      throw err;
    }

    if (!message || !message.trim()) {
      throw new Error('Updated comment message cannot be empty.');
    }

    const updated = {
      ...comment,
      message: message.trim(),
      updatedAt: new Date().toISOString()
    };

    this.comments[commentIndex] = updated;
    if (mongoose.connection.readyState === 1) {
      ProposalComment.updateOne({ _id: commentId }, { $set: updated }).catch(err => logger.db('Mongo update Comment error:', err.message));
    }
    return updated;
  }

  deleteProposalComment(proposalId, commentId, user) {
    const commentIndex = this.comments.findIndex(c => c._id === commentId && c.proposalId === proposalId);
    if (commentIndex === -1) {
      throw new Error('Comment not found.');
    }

    const comment = this.comments[commentIndex];

    // Only author or admin can delete
    if (user.role !== 'admin' && comment.authorId !== user._id) {
      const err = new Error('Unauthorized: You can only delete your own comments.');
      err.statusCode = 403;
      throw err;
    }

    const [deleted] = this.comments.splice(commentIndex, 1);
    if (mongoose.connection.readyState === 1) {
      ProposalComment.deleteOne({ _id: commentId }).catch(err => logger.db('Mongo delete Comment error:', err.message));
    }
    return deleted;
  }

  // ==========================================
  // ACTIVITIES MANAGEMENT (SHARED COLLABORATION)
  // ==========================================

  createActivity(proposalId, activityData, user) {
    const prop = this.proposals.find(p => p._id === proposalId);
    if (!prop) throw new Error('Parent proposal not found.');

    const actor = (typeof user === 'object' && user !== null)
      ? user
      : (user ? this.getUserById(user) : null) || { _id: prop.organizerId, name: prop.organizerName, role: 'organizer' };

    if (!this.isUserAuthorizedForProposal(actor, prop)) {
      const err = new Error('Unauthorized: You cannot add activities to this proposal.');
      err.statusCode = 403;
      throw err;
    }

    const minTeam = activityData.minTeamSize ? Number(activityData.minTeamSize) : 1;
    const maxTeam = activityData.maxTeamSize ? Number(activityData.maxTeamSize) : minTeam;
    const maxTeams = activityData.maxTeams ? Number(activityData.maxTeams) : (activityData.participantLimit ? Number(activityData.participantLimit) : 15);

    const newActivity = {
      _id: activityData._id || `act-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      proposalId,
      name: activityData.name ? activityData.name.trim() : 'Unnamed Activity',
      region: activityData.region ? activityData.region.trim() : (activityData.asset?.region || ''),
      description: activityData.description ? activityData.description.trim() : '',
      format: activityData.format ? activityData.format.trim() : 'Standard Match',
      venue: activityData.venue ? activityData.venue.trim() : 'Campus Facility',
      participantLimit: maxTeams,
      maxTeams: maxTeams,
      minTeamSize: minTeam,
      maxTeamSize: maxTeam,
      registrationDeadline: activityData.registrationDeadline || new Date(Date.now() + 7 * 86400000).toISOString(),
      isRegistrationManuallyClosed: Boolean(activityData.isRegistrationManuallyClosed),
      rules: Array.isArray(activityData.rules) ? activityData.rules : [activityData.rules || 'Standard rules apply.'],
      sampleImage: activityData.sampleImage || null,
      createdBy: { _id: actor._id, name: actor.name },
      lastUpdatedBy: { _id: actor._id, name: actor.name },
      createdAt: new Date().toISOString()
    };

    this.activities.push(newActivity);
    if (mongoose.connection.readyState === 1) {
      Activity.create({ ...newActivity, category: prop.category || 'General' })
        .catch(err => logger.db('Mongo create Activity error:', err.message));
    }

    this._logProposalActivity(proposalId, {
      action: 'ACTIVITY_ADDED',
      details: `Added activity "${newActivity.name}"`,
      user: actor
    });

    return this._populateActivity(newActivity);
  }

  updateActivity(proposalId, activityId, activityData, userOrId, userRole) {
    const prop = this.proposals.find(p => p._id === proposalId);
    if (!prop) throw new Error('Parent proposal not found.');

    const user = (typeof userOrId === 'object' && userOrId !== null)
      ? userOrId
      : this.getUserById(userOrId) || { _id: userOrId, role: userRole };

    if (!this.isUserAuthorizedForProposal(user, prop)) {
      const err = new Error('Unauthorized: You cannot modify activities for this proposal.');
      err.statusCode = 403;
      throw err;
    }

    const actIndex = this.activities.findIndex(a => a._id === activityId && a.proposalId === proposalId);
    if (actIndex === -1) {
      throw new Error('Activity not found in this proposal.');
    }

    const current = this.activities[actIndex];
    const minTeam = activityData.minTeamSize !== undefined ? Number(activityData.minTeamSize) : (current.minTeamSize || 1);
    const maxTeam = activityData.maxTeamSize !== undefined ? Number(activityData.maxTeamSize) : (current.maxTeamSize || minTeam);
    const maxTeams = activityData.maxTeams !== undefined ? Number(activityData.maxTeams) : (activityData.participantLimit !== undefined ? Number(activityData.participantLimit) : (current.maxTeams || current.participantLimit || 15));

    const updated = {
      ...current,
      name: activityData.name !== undefined ? activityData.name.trim() : current.name,
      region: activityData.region !== undefined ? activityData.region.trim() : (current.region || ''),
      description: activityData.description !== undefined ? activityData.description.trim() : (current.description || ''),
      format: activityData.format !== undefined ? activityData.format.trim() : current.format,
      venue: activityData.venue !== undefined ? activityData.venue.trim() : current.venue,
      participantLimit: maxTeams,
      maxTeams: maxTeams,
      minTeamSize: minTeam,
      maxTeamSize: maxTeam,
      registrationDeadline: activityData.registrationDeadline || current.registrationDeadline,
      isRegistrationManuallyClosed: activityData.isRegistrationManuallyClosed !== undefined
        ? Boolean(activityData.isRegistrationManuallyClosed)
        : current.isRegistrationManuallyClosed,
      rules: Array.isArray(activityData.rules) ? activityData.rules : (activityData.rules ? [activityData.rules] : current.rules),
      sampleImage: activityData.sampleImage !== undefined ? activityData.sampleImage : current.sampleImage,
      lastUpdatedBy: { _id: user._id, name: user.name }
    };

    this.activities[actIndex] = updated;
    if (mongoose.connection.readyState === 1) {
      Activity.updateOne({ _id: activityId }, { $set: updated })
        .catch(err => logger.db('Mongo update Activity error:', err.message));
    }

    this._logProposalActivity(proposalId, {
      action: 'ACTIVITY_UPDATED',
      details: `Updated activity "${updated.name}" details/quota`,
      user
    });

    return this._populateActivity(updated);
  }

  /**
   * Delete single activity and cascade delete all its registrations
   */
  deleteActivityCascade(proposalId, activityId, userOrId, userRole) {
    const prop = this.proposals.find(p => p._id === proposalId);
    if (!prop) throw new Error('Parent proposal not found.');

    const user = (typeof userOrId === 'object' && userOrId !== null)
      ? userOrId
      : this.getUserById(userOrId) || { _id: userOrId, role: userRole };

    if (!this.isUserAuthorizedForProposal(user, prop)) {
      const err = new Error('Unauthorized to delete this activity.');
      err.statusCode = 403;
      throw err;
    }

    const actIndex = this.activities.findIndex(a => a._id === activityId && a.proposalId === proposalId);
    if (actIndex === -1) return null;

    // Delete student registrations for this activity
    const beforeCount = this.registrations.length;
    this.registrations = this.registrations.filter(r => r.activityId !== activityId);
    const regsDeleted = beforeCount - this.registrations.length;

    // Delete the activity
    const [removed] = this.activities.splice(actIndex, 1);
    if (mongoose.connection.readyState === 1) {
      Activity.deleteOne({ _id: activityId }).catch(err => logger.db('Mongo delete Activity error:', err.message));
      Registration.deleteMany({ activityId }).catch(err => logger.db('Mongo delete Activity registrations error:', err.message));
    }

    this._logProposalActivity(proposalId, {
      action: 'ACTIVITY_DELETED',
      details: `Deleted activity "${removed.name}"`,
      user
    });

    return {
      deletedActivity: removed,
      registrationsDeleted: regsDeleted
    };
  }

  /**
   * Rule 5: Organizer manual toggle to Close or Reopen Registration
   */
  toggleActivityRegistration(activityId, isClosed, userOrId, userRole) {
    const act = this.activities.find(a => a._id === activityId);
    if (!act) throw new Error('Activity not found.');

    const prop = this.proposals.find(p => p._id === act.proposalId);
    const user = (typeof userOrId === 'object' && userOrId !== null)
      ? userOrId
      : this.getUserById(userOrId) || { _id: userOrId, role: userRole };

    if (!this.isUserAuthorizedForActivity(user, activityId)) {
      const err = new Error('Unauthorized: You can only toggle registration for activities within your category team.');
      err.statusCode = 403;
      throw err;
    }

    act.isRegistrationManuallyClosed = Boolean(isClosed);
    act.lastUpdatedBy = { _id: user._id, name: user.name };
    if (mongoose.connection.readyState === 1) {
      Activity.updateOne(
        { _id: activityId },
        { $set: { isRegistrationManuallyClosed: act.isRegistrationManuallyClosed, lastUpdatedBy: act.lastUpdatedBy } }
      ).catch(err => logger.db('Mongo toggle Activity error:', err.message));
    }

    if (prop) {
      this._logProposalActivity(prop._id, {
        action: 'REGISTRATION_TOGGLED',
        details: `${isClosed ? 'Closed' : 'Reopened'} registration for "${act.name}"`,
        user
      });
    }

    return this._populateActivity(act);
  }


  // ==========================================
  // STUDENT REGISTRATIONS & CSV EXPORT
  // ==========================================

  /**
   * Rule 4: Student Zero-Login Registration with strict backend deadline & capacity validation
   */
  createRegistration(activityId, { studentName, rollNumber, department, semester, section, contactNumber }) {
    const act = this.activities.find(a => a._id === activityId);
    if (!act) {
      throw new Error('The requested sports activity does not exist.');
    }

    const prop = this.proposals.find(p => p._id === act.proposalId);
    if (!prop || prop.status !== 'Approved') {
      throw new Error('Registration is unavailable. This Sports Week is not currently approved for public registration.');
    }

    // Rule 5: Check if manually closed by Organizer
    if (act.isRegistrationManuallyClosed) {
      throw new Error('Registration is currently closed by the event organizer.');
    }

    // Rule 4: Check if deadline has passed
    if (act.registrationDeadline && Date.now() >= new Date(act.registrationDeadline).getTime()) {
      throw new Error(`Registration for "${act.name}" closed on ${new Date(act.registrationDeadline).toLocaleString()}. No new applications are accepted.`);
    }

    // Check capacity limit
    const existingRegistrations = this.registrations.filter(r => r.activityId === activityId);
    if (existingRegistrations.length >= act.participantLimit) {
      throw new Error(`Registration is full. The maximum limit of ${act.participantLimit} participants has been reached.`);
    }

    // Check duplicate student roll number for this activity
    const cleanRoll = String(rollNumber || '').trim().toUpperCase();
    const duplicate = existingRegistrations.find(r => {
      if (r.rollNumber && String(r.rollNumber).trim().toUpperCase() === cleanRoll) return true;
      if (Array.isArray(r.members)) {
        return r.members.some(m => m.rollNumber && String(m.rollNumber).trim().toUpperCase() === cleanRoll);
      }
      return false;
    });
    if (duplicate) {
      throw new Error(`Student with Roll Number "${cleanRoll}" has already submitted an application for ${act.name}. You can only apply at most once.`);
    }

    const newRegistration = {
      _id: `reg-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      proposalId: act.proposalId,
      activityId,
      studentName: String(studentName || '').trim(),
      rollNumber: cleanRoll,
      department: String(department || 'General Studies').trim(),
      semester: semester !== undefined && semester !== null ? String(semester).trim() : 'Current Semester',
      section: section !== undefined && section !== null ? String(section).trim() : 'Section A',
      contactNumber: contactNumber !== undefined && contactNumber !== null ? String(contactNumber).trim() : 'N/A',
      registeredAt: new Date().toISOString(),
      status: 'Confirmed'
    };

    this.registrations.unshift(newRegistration);

    if (mongoose.connection.readyState === 1) {
      Activity.updateOne(
        { _id: activityId },
        { $inc: { currentCount: 1 } }
      ).catch(err => logger.db('Mongo Activity count inc error:', err.message));

      Registration.create({
        ...newRegistration,
        category: prop.category || 'General',
        activityName: act.name
      }).catch(err => logger.db('Mongo create Registration error:', err.message));

      AuditLog.create({
        _id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        action: 'STUDENT_REGISTERED',
        entityType: 'Registration',
        entityId: newRegistration._id,
        userId: cleanRoll,
        userName: newRegistration.studentName,
        userRole: 'student',
        details: { activityId, proposalId: act.proposalId, rollNumber: cleanRoll },
        timestamp: new Date()
      }).catch(err => logger.db('Mongo create AuditLog error:', err.message));
    }

    return {
      registration: newRegistration,
      activity: this._populateActivity(act)
    };
  }

  /**
   * Rule 4 & 5 (Tech & Hackathon): Team & Individual Activity Registration
   * - One student (the leader) registers the team.
   * - Dynamically validates minTeamSize & maxTeamSize.
   * - Dynamically checks for duplicate roll numbers within the same team.
   * - Prevents duplicate registrations across existing teams for the same activity.
   * - Enforces maxTeams capacity limit (teams counted as teams!).
   */
  createTeamRegistration(activityId, {
    teamName,
    leaderName,
    leaderRollNumber,
    department,
    semester,
    section,
    contactNumber,
    teammates = [],
    studentName,
    rollNumber
  }) {
    const act = this.activities.find(a => a._id === activityId);
    if (!act) {
      throw new Error('The requested technical activity does not exist.');
    }

    const prop = this.proposals.find(p => p._id === act.proposalId);
    if (!prop || prop.status !== 'Approved') {
      throw new Error('Registration is unavailable. This technical event is not currently approved for public registration.');
    }

    // Check if manually closed by Organizer
    if (act.isRegistrationManuallyClosed) {
      throw new Error('Registration is currently closed by the event organizer.');
    }

    // Check if deadline has passed
    if (act.registrationDeadline && Date.now() >= new Date(act.registrationDeadline).getTime()) {
      throw new Error(`Registration for "${act.name}" closed on ${new Date(act.registrationDeadline).toLocaleString()}. No new applications are accepted.`);
    }

    // Check capacity limit (teams counted as teams!)
    const isIndividual = (act.minTeamSize === 1 && act.maxTeamSize === 1);
    const maxTeams = act.maxTeams || act.participantLimit || (isIndividual ? 30 : 10);
    const existingRegistrations = this.registrations.filter(r => r.activityId === activityId);

    if (existingRegistrations.length >= maxTeams) {
      throw new Error(`Registration is full for "${act.name}". The maximum limit of ${maxTeams} ${isIndividual ? 'participants' : 'teams'} has been reached.`);
    }

    // Validate leader info
    const finalLeaderName = String(leaderName || studentName || '').trim();
    const finalLeaderRoll = String(leaderRollNumber || rollNumber || '').trim().toUpperCase();

    if (!finalLeaderName || !finalLeaderRoll) {
      throw new Error('Team leader full name and roll number are required.');
    }

    if (!semester || String(semester).trim() === '') {
      throw new Error('Please select your semester (1–8).');
    }

    const cleanSection = String(section || '').trim().toUpperCase();
    if (!cleanSection || cleanSection === 'SELECT SECTION') {
      throw new Error('Please select your section (A, B, C, or D).');
    }

    // Clean and validate teammates
    const cleanTeammates = Array.isArray(teammates) ? teammates.map((t, idx) => {
      const tName = String(t.studentName || t.fullName || '').trim();
      const tRoll = String(t.rollNumber || '').trim().toUpperCase();
      const tSem = String(t.semester || semester || '').trim();
      const tSec = String(t.section || '').trim().toUpperCase();

      if (!tName || !tRoll) {
        throw new Error(`Teammate #${idx + 1} is missing a full name or roll number.`);
      }
      if (!tSec || tSec === 'SELECT SECTION') {
        throw new Error(`Please select section (A, B, C, or D) for teammate "${tName}".`);
      }

      return {
        studentName: tName,
        rollNumber: tRoll,
        semester: tSem,
        section: tSec,
        isLeader: false
      };
    }) : [];

    // Total members: 1 (Leader) + teammates
    const totalMembers = 1 + cleanTeammates.length;
    const minTeam = act.minTeamSize || 1;
    const maxTeam = act.maxTeamSize || 1;

    if (totalMembers < minTeam) {
      throw new Error(`Team size must be at least ${minTeam} members. Current team size is ${totalMembers} (Leader + ${cleanTeammates.length} teammates).`);
    }

    if (totalMembers > maxTeam) {
      throw new Error(`Team size cannot exceed ${maxTeam} members. Current team size is ${totalMembers} (Leader + ${cleanTeammates.length} teammates).`);
    }

    // Validate Team Name if maxTeam > 1
    let finalTeamName = '';
    if (maxTeam > 1) {
      finalTeamName = String(teamName || '').trim();
      if (!finalTeamName) {
        throw new Error('Team name is required for team-based competitions.');
      }
    } else {
      finalTeamName = String(teamName || `Solo - ${finalLeaderName}`).trim();
    }

    // Check duplicate roll numbers WITHIN the same team
    const allTeamRolls = [finalLeaderRoll, ...cleanTeammates.map(t => t.rollNumber)];
    const rollSet = new Set();
    for (const roll of allTeamRolls) {
      if (rollSet.has(roll)) {
        throw new Error(`Duplicate roll number "${roll}" found within the team. Each team member must have a unique roll number.`);
      }
      rollSet.add(roll);
    }

    // Check duplicate registration ACROSS existing teams for this activity
    for (const existingReg of existingRegistrations) {
      const existingRolls = (existingReg.members && existingReg.members.length > 0)
        ? existingReg.members.map(m => m.rollNumber.toUpperCase())
        : [existingReg.rollNumber.toUpperCase()];

      for (const roll of allTeamRolls) {
        if (existingRolls.includes(roll)) {
          throw new Error(`Student with Roll Number "${roll}" is already registered in team "${existingReg.teamName || 'Existing Registration'}" for ${act.name}. You can only apply at most once.`);
        }
      }
    }

    const newRegistration = {
      _id: `reg-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      proposalId: act.proposalId,
      activityId,
      isTeam: maxTeam > 1,
      teamName: finalTeamName,
      leaderName: finalLeaderName,
      leaderRollNumber: finalLeaderRoll,
      studentName: finalLeaderName,
      rollNumber: finalLeaderRoll,
      department: String(department || 'Computer Science').trim(),
      semester: String(semester).trim(),
      section: cleanSection,
      contactNumber: String(contactNumber || 'N/A').trim(),
      teamSize: totalMembers,
      members: [
        {
          studentName: finalLeaderName,
          rollNumber: finalLeaderRoll,
          semester: String(semester).trim(),
          section: cleanSection,
          isLeader: true
        },
        ...cleanTeammates
      ],
      registeredAt: new Date().toISOString(),
      status: 'Confirmed'
    };

    this.registrations.unshift(newRegistration);

    if (mongoose.connection.readyState === 1) {
      Activity.updateOne(
        { _id: activityId },
        { $inc: { currentCount: 1 } }
      ).catch(err => logger.db('Mongo Activity count inc error:', err.message));

      Registration.create({
        ...newRegistration,
        category: prop.category || 'General',
        activityName: act.name
      }).catch(err => logger.db('Mongo create Team Registration error:', err.message));

      AuditLog.create({
        _id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        action: 'TEAM_REGISTERED',
        entityType: 'Registration',
        entityId: newRegistration._id,
        userId: finalLeaderRoll,
        userName: finalLeaderName,
        userRole: 'student',
        details: { activityId, proposalId: act.proposalId, teamName: finalTeamName, teamSize: totalMembers },
        timestamp: new Date()
      }).catch(err => logger.db('Mongo create Team AuditLog error:', err.message));
    }

    return {
      registration: newRegistration,
      activity: this._populateActivity(act)
    };
  }

  /**
   * Generic & Unified Student Registration (Requirement 8)
   * Dispatches to createTeamRegistration if activity is team-based or has teammates,
   * otherwise creates individual registration with graceful fallbacks.
   */
  registerStudent(activityId, registrationData) {
    const act = this.activities.find(a => a._id === activityId);
    if (!act) {
      throw new Error('The requested event activity does not exist.');
    }
    const isTeam = (act.maxTeamSize && act.maxTeamSize > 1) || (Array.isArray(registrationData.teammates) && registrationData.teammates.length > 0);
    if (isTeam) {
      return this.createTeamRegistration(activityId, registrationData);
    } else {
      const payload = {
        studentName: registrationData.studentName || registrationData.leaderName,
        rollNumber: registrationData.rollNumber || registrationData.leaderRollNumber,
        department: registrationData.department || 'General Studies',
        semester: registrationData.semester !== undefined && registrationData.semester !== null ? registrationData.semester : '1',
        section: registrationData.section !== undefined && registrationData.section !== null ? registrationData.section : 'A',
        contactNumber: registrationData.contactNumber || 'N/A'
      };
      return this.createRegistration(activityId, payload);
    }
  }

  /**
   * Rule 6: Get registrations for an activity (remains fully stored even after registration closes)
   * Supports pagination metadata { page, limit, search } (Requirement 6)
   */
  getRegistrationsByActivity(activityId, options = {}) {
    let regs = this.registrations
      .filter(r => r.activityId === activityId);

    const { page, limit, search } = options;

    if (search && typeof search === 'string' && search.trim()) {
      const q = search.trim().toLowerCase();
      regs = regs.filter(r =>
        (r.studentName && r.studentName.toLowerCase().includes(q)) ||
        (r.rollNumber && r.rollNumber.toLowerCase().includes(q)) ||
        (r.teamName && r.teamName.toLowerCase().includes(q)) ||
        (r.members && r.members.some(m => m.studentName.toLowerCase().includes(q) || m.rollNumber.toLowerCase().includes(q)))
      );
    }

    regs.sort((a, b) => new Date(b.registeredAt) - new Date(a.registeredAt));

    if (page !== undefined || limit !== undefined) {
      const validLimit = Math.min(Math.max(1, parseInt(limit, 10) || 20), 100);
      const validPage = Math.max(1, parseInt(page, 10) || 1);
      const total = regs.length;
      const totalPages = Math.ceil(total / validLimit) || 1;
      const paginatedData = regs.slice((validPage - 1) * validLimit, validPage * validLimit);

      return {
        data: paginatedData,
        registrations: paginatedData,
        page: validPage,
        pageSize: validLimit,
        totalRecords: total,
        totalPages
      };
    }

    return regs;
  }

  /**
   * Get registrations for a specific student by roll number (checks leader & teammates)
   */
  getStudentRegistrations(rollNumber) {
    if (!rollNumber) return [];
    const cleanRoll = rollNumber.trim().toUpperCase();
    return this.registrations
      .filter(r => {
        if (r.rollNumber && r.rollNumber.toUpperCase() === cleanRoll) return true;
        if (r.members && r.members.some(m => m.rollNumber && m.rollNumber.toUpperCase() === cleanRoll)) return true;
        return false;
      })
      .map(r => {
        const act = this.activities.find(a => a._id === r.activityId);
        return {
          ...r,
          activity: act ? this._populateActivity(act) : null
        };
      })
      .sort((a, b) => new Date(b.registeredAt) - new Date(a.registeredAt));
  }

  /**
   * Rule 6: Generate CSV content for an activity roster
   * Supports both team-based multi-row member export and single participant export.
   */
  generateActivityCsv(activityId) {
    const act = this.activities.find(a => a._id === activityId);
    if (!act) throw new Error('Activity not found.');

    const prop = this.proposals.find(p => p._id === act.proposalId);
    const regs = this.getRegistrationsByActivity(activityId);

    const isTeamActivity = (act.maxTeamSize && act.maxTeamSize > 1) || regs.some(r => r.isTeam || (r.members && r.members.length > 1));

    let headers = [];
    let rows = [];

    if (isTeamActivity) {
      headers = [
        'Event Name',
        'Activity Name',
        'Team Name',
        'Team Registration ID',
        'Team Leader Name',
        'Team Leader Roll Number',
        'Member Name',
        'Member Roll Number',
        'Semester',
        'Section',
        'Registration Date/Time',
        'Registration Status',
        'Department',
        'Contact Number'
      ];

      regs.forEach(r => {
        const memberList = (r.members && r.members.length > 0)
          ? r.members
          : [{ studentName: r.studentName, rollNumber: r.rollNumber, semester: r.semester, section: r.section, isLeader: true }];

        memberList.forEach(m => {
          rows.push([
            `"${(prop?.title || 'Event').replace(/"/g, '""')}"`,
            `"${(act.name || '').replace(/"/g, '""')}"`,
            `"${(r.teamName || r.studentName || '').replace(/"/g, '""')}"`,
            `"${r._id}"`,
            `"${(r.leaderName || r.studentName || '').replace(/"/g, '""')}"`,
            `"${r.leaderRollNumber || r.rollNumber}"`,
            `"${m.studentName.replace(/"/g, '""')}"`,
            `"${m.rollNumber}"`,
            `"${m.semester}"`,
            `"${m.section}"`,
            `"${new Date(r.registeredAt).toLocaleString()}"`,
            `"${r.status || 'Confirmed'}"`,
            `"${(r.department || 'N/A').replace(/"/g, '""')}"`,
            `"${r.contactNumber || 'N/A'}"`
          ]);
        });
      });
    } else {
      headers = [
        'Student Name',
        'Roll Number',
        'Semester',
        'Section',
        'Activity/Culture',
        'Event Name',
        'Registration Date/Time',
        'Department',
        'Contact Number'
      ];

      rows = regs.map(r => [
        `"${r.studentName.replace(/"/g, '""')}"`,
        `"${r.rollNumber}"`,
        `"${r.semester}"`,
        `"${r.section}"`,
        `"${(act.name || '').replace(/"/g, '""')}"`,
        `"${(prop?.title || '').replace(/"/g, '""')}"`,
        `"${new Date(r.registeredAt).toLocaleString()}"`,
        `"${r.department.replace(/"/g, '""')}"`,
        `"${r.contactNumber}"`
      ]);
    }

    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\r\n');

    // Produce clean filename: EventName_ActivityName_Teams.csv or EventName_ActivityName_Participants.csv
    const cleanPropTitle = (prop?.title || 'Event')
      .replace(/Annual|University/gi, '')
      .replace(/&\s*Hackathon/gi, '')
      .replace(/Day\s*Celebration/gi, 'Day')
      .trim()
      .replace(/[^a-zA-Z0-9]/g, '') || 'Event';
    const cleanActName = (act.name || 'Activity')
      .split('—')[0]
      .split('/')[0]
      .replace(/Competition|Challenge|Showcase|Tournament/gi, '')
      .trim()
      .replace(/[^a-zA-Z0-9]/g, '') || 'Activity';

    const filename = isTeamActivity
      ? `${cleanPropTitle}_${cleanActName}_Teams.csv`
      : `${cleanPropTitle}_${cleanActName}_Participants.csv`;

    return {
      csvContent,
      filename,
      activityName: act.name,
      proposalTitle: prop?.title || 'Event',
      count: regs.length,
      rowCount: rows.length
    };
  }

  /**
   * High-Performance Bounded Streaming CSV Export
   * Streams registration records in chunks directly into HTTP response
   * to guarantee low memory overhead and high concurrency support.
   */
  streamActivityCsv(activityId, res) {
    const act = this.activities.find(a => a._id === activityId);
    if (!act) throw new Error('Activity not found.');

    const prop = this.proposals.find(p => p._id === act.proposalId);
    const regs = this.getRegistrationsByActivity(activityId);

    const isTeamActivity = (act.maxTeamSize && act.maxTeamSize > 1) || regs.some(r => r.isTeam || (r.members && r.members.length > 1));

    let headers = [];
    if (isTeamActivity) {
      headers = [
        'Event Name',
        'Activity Name',
        'Team Name',
        'Team Registration ID',
        'Team Leader Name',
        'Team Leader Roll Number',
        'Member Name',
        'Member Roll Number',
        'Semester',
        'Section',
        'Registration Date/Time',
        'Registration Status',
        'Department',
        'Contact Number'
      ];
    } else {
      headers = [
        'Student Name',
        'Roll Number',
        'Semester',
        'Section',
        'Activity/Culture',
        'Event Name',
        'Registration Date/Time',
        'Department',
        'Contact Number'
      ];
    }

    const cleanPropTitle = (prop?.title || 'Event')
      .replace(/Annual|University/gi, '')
      .replace(/&\s*Hackathon/gi, '')
      .replace(/Day\s*Celebration/gi, 'Day')
      .trim()
      .replace(/[^a-zA-Z0-9]/g, '') || 'Event';
    const cleanActName = (act.name || 'Activity')
      .split('—')[0]
      .split('/')[0]
      .replace(/Competition|Challenge|Showcase|Tournament/gi, '')
      .trim()
      .replace(/[^a-zA-Z0-9]/g, '') || 'Activity';

    const filename = isTeamActivity
      ? `${cleanPropTitle}_${cleanActName}_Teams.csv`
      : `${cleanPropTitle}_${cleanActName}_Participants.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    res.write(headers.join(',') + '\r\n');

    const CHUNK_SIZE = 50;
    for (let i = 0; i < regs.length; i += CHUNK_SIZE) {
      const chunk = regs.slice(i, i + CHUNK_SIZE);
      const rows = [];
      if (isTeamActivity) {
        chunk.forEach(r => {
          const memberList = (r.members && r.members.length > 0)
            ? r.members
            : [{ studentName: r.studentName, rollNumber: r.rollNumber, semester: r.semester, section: r.section, isLeader: true }];

          memberList.forEach(m => {
            rows.push([
              `"${(prop?.title || 'Event').replace(/"/g, '""')}"`,
              `"${(act.name || '').replace(/"/g, '""')}"`,
              `"${(r.teamName || r.studentName || '').replace(/"/g, '""')}"`,
              `"${r._id}"`,
              `"${(r.leaderName || r.studentName || '').replace(/"/g, '""')}"`,
              `"${r.leaderRollNumber || r.rollNumber}"`,
              `"${m.studentName.replace(/"/g, '""')}"`,
              `"${m.rollNumber}"`,
              `"${m.semester}"`,
              `"${m.section}"`,
              `"${new Date(r.registeredAt).toLocaleString()}"`,
              `"${r.status || 'Confirmed'}"`,
              `"${(r.department || 'N/A').replace(/"/g, '""')}"`,
              `"${r.contactNumber || 'N/A'}"`
            ].join(','));
          });
        });
      } else {
        chunk.forEach(r => {
          rows.push([
            `"${r.studentName.replace(/"/g, '""')}"`,
            `"${r.rollNumber}"`,
            `"${r.semester}"`,
            `"${r.section}"`,
            `"${(act.name || '').replace(/"/g, '""')}"`,
            `"${(prop?.title || '').replace(/"/g, '""')}"`,
            `"${new Date(r.registeredAt).toLocaleString()}"`,
            `"${r.department.replace(/"/g, '""')}"`,
            `"${r.contactNumber}"`
          ].join(','));
        });
      }
      if (rows.length > 0) {
        res.write(rows.join('\r\n') + '\r\n');
      }
    }

    res.end();
  }
}

export const store = new SharedDataStore();

