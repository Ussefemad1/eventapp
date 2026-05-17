const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema({
  name:     String,
  username: String,
  isAdmin:  Boolean,
  email:    String,
  phone:    String,
  age:      Number,
  gender:   String,
  password: String,
  id:       Number,
});

userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, 10);
});

module.exports = mongoose.model("User", userSchema);
