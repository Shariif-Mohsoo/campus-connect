import mongoose from 'mongoose';

const sentEmailSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    to: { type: String, required: true, index: true, lowercase: true, trim: true },
    recipientName: { type: String, default: '' },
    rollNumber: { type: String, default: '' },
    department: { type: String, default: '' },
    category: { type: String, default: '' },
    subject: { type: String, required: true },
    username: { type: String, default: '' },
    password: { type: String, default: '' },
    loginLink: { type: String, default: '' },
    status: { type: String, default: 'Delivered', index: true },
    sender: { type: String, default: 'Directorate of Student Affairs' },
    sentAt: { type: Date, default: Date.now, index: true }
  },
  {
    _id: false,
    timestamps: false
  }
);

sentEmailSchema.index({ to: 1, sentAt: -1 });

export const SentEmail = mongoose.model('SentEmail', sentEmailSchema);
