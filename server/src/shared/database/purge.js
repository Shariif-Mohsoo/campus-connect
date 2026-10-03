import { connectDB } from './connection.js';
import {
  User,
  Category,
  Proposal,
  Activity,
  Registration,
  ProposalComment,
  SentEmail,
  AuditLog
} from './models/index.js';
import { config } from '../config/env.js';
import bcrypt from 'bcryptjs';
import { initialCategories } from './store.js';

async function purgeDatabase() {
  console.log('🔌 Connecting to MongoDB Atlas...');
  await connectDB();

  console.log('🧹 Purging all dummy data from MongoDB...');

  // 1. Delete all dummy/test proposals
  const delProps = await Proposal.deleteMany({});
  console.log('  • Deleted proposals:', delProps.deletedCount);

  // 2. Delete all dummy activities
  const delActs = await Activity.deleteMany({});
  console.log('  • Deleted activities:', delActs.deletedCount);

  // 3. Delete all dummy registrations
  const delRegs = await Registration.deleteMany({});
  console.log('  • Deleted registrations:', delRegs.deletedCount);

  // 4. Delete all dummy comments
  const delComms = await ProposalComment.deleteMany({});
  console.log('  • Deleted comments:', delComms.deletedCount);

  // 5. Delete all dummy sent emails
  const delMails = await SentEmail.deleteMany({});
  console.log('  • Deleted emails:', delMails.deletedCount);

  // 6. Delete all audit logs
  const delLogs = await AuditLog.deleteMany({});
  console.log('  • Deleted audit logs:', delLogs.deletedCount);

  // 7. Delete all users EXCEPT the single HOD admin
  const delUsers = await User.deleteMany({ role: { $ne: 'admin' } });
  console.log('  • Deleted dummy organizers:', delUsers.deletedCount);

  // 8. Ensure HOD admin user exists with credentials from .env
  await User.findOneAndUpdate(
    { role: 'admin' },
    {
      _id: 'user-admin-1',
      name: config.hod.name,
      rollNumber: 'FAC-001',
      email: config.hod.email,
      passwordHash: bcrypt.hashSync(config.hod.password, 10),
      plainPasswordHint: '••••••••',
      role: 'admin',
      department: 'Directorate of Student Affairs & Sports',
      designation: 'Head of Department / Super Admin'
    },
    { upsert: true, new: true }
  );
  console.log(`  • HOD credentials synchronized in MongoDB: "${config.hod.email}"`);

  // 9. Reset categories to ONLY the 5 clean initial categories
  await Category.deleteMany({});
  await Category.insertMany(initialCategories);
  console.log('  • Categories reset to the 5 core clean categories.');

  const finalCounts = {
    categories: await Category.countDocuments(),
    users: await User.countDocuments(),
    proposals: await Proposal.countDocuments(),
    activities: await Activity.countDocuments(),
    registrations: await Registration.countDocuments(),
    comments: await ProposalComment.countDocuments(),
    emails: await SentEmail.countDocuments(),
    auditLogs: await AuditLog.countDocuments()
  };

  console.log('\n✨ CLEAN PRODUCTION DATABASE STATE:');
  console.log(JSON.stringify(finalCounts, null, 2));

  process.exit(0);
}

purgeDatabase().catch(err => {
  console.error('Purge error:', err);
  process.exit(1);
});
