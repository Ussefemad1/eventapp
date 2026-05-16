const express = require("express");
const router  = express.Router();
const User    = require("../models/user");
const bcrypt  = require("bcryptjs");
const jwt     = require("jsonwebtoken");
const auth    = require("../middleware/auth");

// fetch all users
router.get("/", auth, async (req, res) => {
  const users = await User.find().select("-password");
  res.json(users);
});

// fetch user bel id
router.get("/:id", auth, async (req, res) => {
  const user = await User.findById(req.params.id).select("-password");
  res.json(user);
});

// register
router.post("/", async (req, res) => {
  try {
    const existingUser = await User.findOne({ email: req.body.email });

    if (existingUser) {
      return res.status(400).json({ message: "Email already exists" });
    }

    const user = new User(req.body);

    await user.save();

    res.status(201).json({
      message: "User created successfully"
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({ message: "Invalid login" });
    }

    const match = await bcrypt.compare(password, user.password);

    if (!match) {
      return res.status(401).json({ message: "Invalid login" });
    }

    const token = jwt.sign(
      {
        id: user._id,
        email: user.email,
        isAdmin: user.isAdmin,
        name: user.name
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        isAdmin: user.isAdmin
      }
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// current logged in user
router.get("/me/profile", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(user);

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Edit user details
router.put("/:id", auth, async (req, res) => {
  const user = await User.findByIdAndUpdate(
    req.params.id,
    req.body,
    { returnDocument: "after" }
  ).select("-password");

  res.json(user);
});

// Remove user
router.delete("/:id", auth, async (req, res) => {
  await User.findByIdAndDelete(req.params.id);
  res.json({ message: "User deleted" });
});

module.exports = router;