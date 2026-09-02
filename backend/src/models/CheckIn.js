const mongoose = require('mongoose');

const checkInSchema = new mongoose.Schema(
  {
    motherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Mother',
      required: true
    },
    bleeding: {
      type: String,
      enum: ['normal', 'more', 'heavy'],
      required: true
    },
    fever: Boolean,
    severeHeadache: Boolean,
    visionChanges: Boolean,
    emotionalDistress: Boolean,
    feedingDifficulty: Boolean,
    riskLevel: {
      type: String,
      enum: ['green', 'amber', 'red'],
      required: true
    },
    riskReasons: [String]
  },
  { timestamps: true }
);

checkInSchema.index({ motherId: 1, createdAt: -1 });

module.exports = mongoose.model('CheckIn', checkInSchema);
