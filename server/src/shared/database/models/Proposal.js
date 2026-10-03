import mongoose from 'mongoose';

const proposalActivityLogSchema = new mongoose.Schema(
  {
    _id: { type: String, default: () => `log-${Date.now()}-${Math.random().toString(36).substr(2, 6)}` },
    action: { type: String, required: true },
    details: { type: String, required: true },
    organizerId: { type: String },
    organizerName: { type: String },
    organizerRole: { type: String },
    timestamp: { type: Date, default: Date.now }
  },
  { _id: false }
);

const proposalSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    title: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true },
    description: { type: String, default: '', trim: true },
    startDate: { type: Date },
    endDate: { type: Date },
    venue: { type: String, default: 'Campus Grounds & Auditorium', trim: true },
    generalInstructions: [{ type: String, trim: true }],
    activities: [{ type: String }],
    organizerId: { type: String },
    organizerName: { type: String, default: '' },
    department: { type: String, default: 'Computer Science' },
    status: {
      type: String,
      enum: ['Draft', 'Pending HOD Approval', 'Approved', 'Changes Requested', 'Rejected'],
      default: 'Draft'
    },
    isPublic: { type: Boolean, default: false },
    revisionNotes: { type: String, default: '' },
    feedbackNotes: { type: String, default: '' },
    createdBy: {
      _id: { type: String },
      name: { type: String },
      email: { type: String },
      rollNumber: { type: String }
    },
    lastUpdatedBy: {
      _id: { type: String },
      name: { type: String },
      email: { type: String },
      rollNumber: { type: String }
    },
    activityLog: [proposalActivityLogSchema]
  },
  {
    _id: false,
    timestamps: true
  }
);

// Performance & Query Indexes
proposalSchema.index({ category: 1, status: 1 });
proposalSchema.index({ category: 1, isPublic: 1 });
proposalSchema.index({ organizerId: 1 });
proposalSchema.index({ status: 1, isPublic: 1 });
proposalSchema.index({ createdAt: -1 });

export const Proposal = mongoose.model('Proposal', proposalSchema);
