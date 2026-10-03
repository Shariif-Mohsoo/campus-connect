import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    rollNumber: { type: String, trim: true, uppercase: true },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address']
    },
    passwordHash: { type: String, required: true },
    plainPasswordHint: { type: String, default: '' },
    role: {
      type: String,
      enum: ['admin', 'organizer', 'student'],
      default: 'organizer',
      required: true
    },
    department: { type: String, default: 'Computer Science', trim: true },
    category: { type: String, trim: true },
    society: { type: String, default: '', trim: true },
    designation: { type: String, default: '', trim: true }
  },
  {
    _id: false,
    timestamps: true
  }
);

// Performance Indexes
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ rollNumber: 1 });
userSchema.index({ role: 1, category: 1 });

export const User = mongoose.model('User', userSchema);
