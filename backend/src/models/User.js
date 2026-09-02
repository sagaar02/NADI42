const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    password: {
      type: String,
      required: true,
      select: false
    },
    phone: String,
    role: {
      type: String,
      enum: ['mother', 'asha', 'phc'],
      required: true
    },
    language: {
      type: String,
      default: 'English'
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
