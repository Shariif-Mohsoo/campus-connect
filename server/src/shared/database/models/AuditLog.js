import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    action: { type: String, required: true, index: true },
    entityType: { type: String, required: true, index: true }, // 'Proposal' | 'Category' | 'Activity' | 'Registration' | 'User'
    entityId: { type: String, required: true, index: true },
    userId: { type: String, index: true },
    userName: { type: String },
    userRole: { type: String },
    details: { type: mongoose.Schema.Types.Mixed },
    ipAddress: { type: String },
    timestamp: { type: Date, default: Date.now, index: true }
  },
  {
    _id: false,
    timestamps: false
  }
);

auditLogSchema.index({ entityType: 1, entityId: 1, timestamp: -1 });
auditLogSchema.index({ action: 1, timestamp: -1 });

export const AuditLog = mongoose.model('AuditLog', auditLogSchema);
