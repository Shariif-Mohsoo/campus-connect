import mongoose from 'mongoose';

const proposalCommentSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    proposalId: { type: String, required: true },
    authorId: { type: String, required: true },
    authorName: { type: String, required: true },
    authorRole: { type: String, default: 'organizer' },
    message: { type: String, required: true, trim: true },
    createdAt: { type: Date, default: Date.now }
  },
  {
    _id: false,
    timestamps: true
  }
);

proposalCommentSchema.index({ proposalId: 1, createdAt: 1 });

export const ProposalComment = mongoose.model('ProposalComment', proposalCommentSchema);
