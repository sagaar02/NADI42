const mongoose = require('mongoose');

const caseSchema = new mongoose.Schema(
  {
    motherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Mother',
      required: true
    },
    checkInId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CheckIn',
      required: true
    },
    riskLevel: {
      type: String,
      enum: ['amber', 'red'],
      required: true
    },
    status: {
      type: String,
      enum: ['open', 'acknowledged', 'follow_up', 'resolved'],
      default: 'open'
    },
    trigger: [String],
    assignedAshaId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    phcId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    resolvedAt: Date
  },
  { timestamps: true }
);

caseSchema.index({ motherId: 1, status: 1 });
caseSchema.index({ assignedAshaId: 1, status: 1, riskLevel: 1 });
caseSchema.index({ phcId: 1, status: 1, riskLevel: 1 });

module.exports = mongoose.model('Case', caseSchema);
