const mongoose = require('mongoose');

const facilitySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true
    },
    type: { type: String, enum: ['PHC', 'hospital', 'clinic'], required: true },
    address: String,
    latitude: Number,
    longitude: Number,
    phone: String
  },
  { timestamps: true }
);

facilitySchema.index({ latitude: 1, longitude: 1 });

module.exports = mongoose.model('Facility', facilitySchema);
