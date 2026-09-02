const mongoose = require('mongoose');

const followUpSchema = new mongoose.Schema(
  {
    caseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Case',
      required: true
    },
    ashaId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    scheduledAt: Date,
    notes: String,
    status: {
      type: String,
      enum: ['scheduled', 'completed', 'cancelled'],
      default: 'scheduled'
    },
    completedAt: Date
  },
  { timestamps: true }
);

followUpSchema.index({ caseId: 1, scheduledAt: 1 });
followUpSchema.index({ ashaId: 1, status: 1, scheduledAt: 1 });

module.exports = mongoose.model('FollowUp', followUpSchema);
