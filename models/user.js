const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },

  username: {
    type: String,
    trim: true,
  },

  isAdmin: {
    type: Boolean,
    default: false,
  },

  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },

  phone: {
    type: String,
    trim: true,
  },

  age: {
    type: Number,
    min: 13,
    max: 120,
  },

  gender: {
    type: String,
    trim: true,
  },

  favoriteEvents: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "Event",
  }],

  password: {
    type: String,
    required: true,
    minlength: 8,
  },

  resetPasswordToken: {
    type: String,
    default: null,
  },

  resetPasswordExpires: {
    type: Date,
    default: null,
  },

  isVerified: {
    type: Boolean,
    default: false,
  },

  otpHash: {
    type: String,
    default: null,
  },

  otpExpires: {
    type: Date,
    default: null,
  },

  otpAttempts: {
    type: Number,
    default: 0,
  },

  id: Number,
});

userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;

  this.password = await bcrypt.hash(this.password, 10);
});

module.exports = mongoose.model("User", userSchema);