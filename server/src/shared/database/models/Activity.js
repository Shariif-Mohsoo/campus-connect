import mongoose from 'mongoose';

const activitySchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    proposalId: { type: String, required: true },
    category: { type: String, default: 'General', trim: true },
    region: { type: String, default: '', trim: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '', trim: true },
    format: { type: String, default: 'Standard', trim: true },
    venue: { type: String, default: 'Campus Activity Center', trim: true },
    minTeamSize: { type: Number, default: 1, min: 1 },
    maxTeamSize: { type: Number, default: 1, min: 1 },
    maxTeams: { type: Number },
    participantLimit: { type: Number, default: 30, min: 1 },
    currentCount: { type: Number, default: 0, min: 0 },
    isRegistrationManuallyClosed: { type: Boolean, default: false },
    registrationDeadline: { type: Date },
    rules: [{ type: String, trim: true }],
    sampleImage: { type: String, default: null },
    createdBy: {
      _id: { type: String },
      name: { type: String }
    },
    lastUpdatedBy: {
      _id: { type: String },
      name: { type: String }
    }
  },
  {
    _id: false,
    timestamps: true
  }
);

// Performance Indexes
activitySchema.index({ proposalId: 1 });
activitySchema.index({ category: 1, isRegistrationManuallyClosed: 1 });
activitySchema.index({ registrationDeadline: 1 });
activitySchema.index({ proposalId: 1, currentCount: 1, participantLimit: 1 });

export const Activity = mongoose.model('Activity', activitySchema);
