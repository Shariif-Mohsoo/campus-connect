import mongoose from 'mongoose';

const teamMemberSchema = new mongoose.Schema(
  {
    studentName: { type: String, required: true, trim: true },
    rollNumber: { type: String, required: true, uppercase: true, trim: true },
    semester: { type: String, default: '1', trim: true },
    section: { type: String, default: 'A', trim: true },
    isLeader: { type: Boolean, default: false }
  },
  { _id: false }
);

const registrationSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    activityId: { type: String, required: true },
    proposalId: { type: String, required: true },
    category: { type: String, default: 'General', trim: true },
    activityName: { type: String, default: '', trim: true },
    isTeam: { type: Boolean, default: false },
    teamName: { type: String, default: '', trim: true },
    leaderName: { type: String, default: '', trim: true },
    leaderRollNumber: { type: String, default: '', uppercase: true, trim: true },
    studentName: { type: String, required: true, trim: true },
    rollNumber: { type: String, required: true, uppercase: true, trim: true },
    department: { type: String, default: 'Computer Science', trim: true },
    semester: { type: String, default: '1', trim: true },
    section: { type: String, default: 'A', trim: true },
    contactNumber: { type: String, default: 'N/A', trim: true },
    teamSize: { type: Number, default: 1 },
    members: [teamMemberSchema],
    status: {
      type: String,
      default: 'Confirmed'
    },
    registeredAt: { type: Date, default: Date.now }
  },
  {
    _id: false,
    timestamps: true
  }
);

// Performance & Concurrency Indexes
registrationSchema.index({ activityId: 1, rollNumber: 1 }, { unique: true });
registrationSchema.index({ activityId: 1, registeredAt: 1 });
registrationSchema.index({ proposalId: 1 });
registrationSchema.index({ category: 1, registeredAt: -1 });
registrationSchema.index({ 'members.rollNumber': 1 });

export const Registration = mongoose.model('Registration', registrationSchema);
