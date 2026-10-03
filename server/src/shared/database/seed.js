import bcrypt from 'bcryptjs';
import { config } from '../config/env.js';
import {
  User,
  Category,
  Activity,
  Proposal,
  Registration,
  ProposalComment,
  SentEmail
} from './models/index.js';

import {
  initialCategories,
  initialUsers,
  initialEmails,
  initialProposals,
  initialActivities,
  initialRegistrations,
  initialComments
} from './store.js';

/**
 * Helper to idempotently seed records without duplicating or overwriting
 */
async function seedModelIfMissing(Model, items, name) {
  if (!items || items.length === 0) return 0;
  const ids = items.map(i => i._id);
  const existingDocs = await Model.find({ _id: { $in: ids } }, { _id: 1 }).lean();
  const existingIdSet = new Set(existingDocs.map(d => d._id));
  const missing = items.filter(i => !existingIdSet.has(i._id));

  if (missing.length > 0) {
    await Model.insertMany(missing, { ordered: false });
    console.log(`🌱 [Seed] Seeded ${missing.length} new ${name} records.`);
  }
  return Model.countDocuments();
}

/**
 * Idempotent Database Seeder
 * Populates essential starter data into MongoDB without overwriting or duplicating existing records.
 */
export async function seedDatabase() {
  const stats = {
    categories: 0,
    users: 0,
    proposals: 0,
    activities: 0,
    registrations: 0,
    emails: 0,
    comments: 0
  };

  try {
    stats.categories = await seedModelIfMissing(Category, initialCategories, 'Categories');
    stats.users = await seedModelIfMissing(User, initialUsers, 'Users');

    // Ensure HOD account in MongoDB matches current credentials from .env
    if (config.hod && config.hod.email) {
      await User.updateOne(
        { role: 'admin' },
        {
          $set: {
            email: config.hod.email,
            name: config.hod.name,
            passwordHash: bcrypt.hashSync(config.hod.password, 10),
            plainPasswordHint: '••••••••'
          }
        }
      );
    }
    stats.proposals = await seedModelIfMissing(Proposal, initialProposals, 'Proposals');
    stats.activities = await seedModelIfMissing(Activity, initialActivities, 'Activities');
    stats.registrations = await seedModelIfMissing(Registration, initialRegistrations, 'Registrations');
    stats.emails = await seedModelIfMissing(SentEmail, initialEmails, 'SentEmails');
    stats.comments = await seedModelIfMissing(ProposalComment, initialComments, 'Comments');

    console.log(`✅ [MongoDB Seed] Database verified:`, stats);
    return stats;
  } catch (err) {
    console.error('⚠️ [MongoDB Seed] Error during seed:', err.message);
    return stats;
  }
}
