import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    id: {
      type: String,
      required: true,
      trim: true
    },
    name: { type: String, required: true, trim: true },
    icon: { type: String, default: '🏷️', trim: true },
    color: { type: String, default: '#8b5cf6', trim: true },
    bg: { type: String, default: 'rgba(139, 92, 246, 0.15)' },
    border: { type: String, default: 'rgba(139, 92, 246, 0.35)' },
    desc: { type: String, default: '', trim: true },
    maxOrganizers: {
      type: Number,
      default: 3,
      min: [1, 'Capacity must be at least 1'],
      max: [20, 'Capacity cannot exceed 20']
    },
    isSpecialized: { type: Boolean, default: false },
    specializedModule: {
      type: String,
      default: null,
      enum: [null, 'sports', 'culture', 'tech']
    },
    formConfig: { type: mongoose.Schema.Types.Mixed, default: null }
  },
  {
    _id: false,
    timestamps: true
  }
);

// Performance & Uniqueness Indexes
categorySchema.index({ id: 1 }, { unique: true });
categorySchema.index({ name: 1 });
categorySchema.index({ isSpecialized: 1 });

export const Category = mongoose.model('Category', categorySchema);
