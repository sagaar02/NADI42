const mongoose = require('mongoose');

const motherSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    ashaId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    phcId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    deliveryDate: {
      type: Date,
      required: true
    },
    village: String,
    latitude: Number,
    longitude: Number,
    currentRisk: {
      type: String,
      enum: ['green', 'amber', 'red'],
      default: 'green'
    },
    lastCheckInAt: Date
  },
  { timestamps: true }
);

motherSchema.index({ userId: 1 }, { unique: true });
motherSchema.index({ ashaId: 1, currentRisk: 1 });
motherSchema.index({ phcId: 1, currentRisk: 1 });

module.exports = mongoose.model('Mother', motherSchema);
