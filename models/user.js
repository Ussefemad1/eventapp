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

  password: {
    type: String,
    required: true,
    minlength: 8,
  },

  id: Number,
});

userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;

  this.password = await bcrypt.hash(this.password, 10);
});

module.exports = mongoose.model("User", userSchema);