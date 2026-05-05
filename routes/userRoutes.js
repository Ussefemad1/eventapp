const express = require("express");
const router  = express.Router();
const User    = require("../models/user"); 
const bcrypt  = require("bcryptjs");       // el function el mas2ola 3an el password hashing w el verification

// fetch all users
router.get("/", async (req, res) => {
  const users = await User.find();
  res.json(users);
});

// fetch user bel id 
router.get("/:id", async (req, res) => {
  const user = await User.findById(req.params.id);
  res.json(user);
});

// ha register user gded w hash password before saving
router.post("/", async (req, res) => {
  try {
    const user = new User(req.body);
    await user.save(); // Persist
    res.status(201).json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Authentication by comparing email w el hash password stored in database
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }); // Lookup email
    if (!user) return res.status(401).json({ message: "Invalid login" });

    const match = await bcrypt.compare(password, user.password); // Verify hash
    if (!match) return res.status(401).json({ message: "Invalid login" });

    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Edit user details (except password
router.put("/:id", async (req, res) => {
  const user = await User.findByIdAndUpdate(req.params.id, req.body, { returnDocument: "after" });
  res.json(user);
});

// Remove user
router.delete("/:id", async (req, res) => {
  await User.findByIdAndDelete(req.params.id);
  res.json({ message: "User deleted" });
});

module.exports = router;