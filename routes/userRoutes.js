const express = require("express");
const router  = express.Router();
const crypto  = require("crypto");
const User    = require("../models/user");
const Event   = require("../models/event");
const Booking = require("../models/booking");
const bcrypt  = require("bcryptjs");
const jwt     = require("jsonwebtoken");
const auth    = require("../middleware/auth");
const admin   = require("../middleware/admin");

// ─── BREVO EMAIL (HTTPS REST API — works on Railway, no SMTP, no SDK) ──────────
async function sendBrevoEmail({ to, subject, html }) {
  if (!process.env.BREVO_API_KEY) {
    console.warn("BREVO_API_KEY not set — skipping email send.");
    return;
  }
  try {
    const resp = await fetch("https://api.brevo.com/v3/smtp/email", {
      method:  "POST",
      headers: {
        "accept":       "application/json",
        "content-type": "application/json",
        "api-key":      process.env.BREVO_API_KEY,
      },
      body: JSON.stringify({
        sender: {
          name:  process.env.SENDER_NAME || "Eventify",
          email: process.env.SENDER_EMAIL,
        },
        to:          [{ email: to }],
        subject,
        htmlContent: html,
      }),
    });
    if (!resp.ok) {
      const detail = await resp.text();
      console.error("Brevo send failed:", resp.status, detail);
    }
  } catch (err) {
    console.error("Brevo send error:", err.message);
  }
}

async function sendPasswordChangedEmail(user) {
  if (!process.env.BREVO_API_KEY) return;

  try {
    await sendBrevoEmail({
      to: user.email,
      subject: "Your Eventify password was changed",
      html: `
        <div style="font-family:Arial,sans-serif;padding:24px;background:#f5f7fa;color:#111;">
          <div style="max-width:600px;margin:auto;background:#fff;border-radius:14px;padding:32px;border:1px solid #e5e7eb;">
            <h2 style="margin-top:0;color:#166534;">Password Changed</h2>
            <p>Hello ${user.name || "User"},</p>
            <p>Your Eventify account password was successfully changed.</p>
            <p>If you did not make this change, please contact us immediately or reset your password.</p>
            <p style="margin-top:30px;color:#6b7280;font-size:14px;">Eventify Security Team</p>
          </div>
        </div>
      `,
    });
  } catch (err) {
    console.error("Could not send password changed email:", err.message);
  }
}


function hashResetToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

// ─── OTP EMAIL VERIFICATION ───────────────────────────────────────────────────
const OTP_TTL_MS       = 10 * 60 * 1000; // codes are valid for 10 minutes
const OTP_MAX_ATTEMPTS = 5;              // wrong tries before a new code is needed

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000)); // 6 digits
}

function hashOtp(otp) {
  return crypto.createHash("sha256").update(String(otp)).digest("hex");
}

// generate a fresh code on the user, persist its hash, and email the code
async function issueOtp(user) {
  const otp = generateOtp();
  user.otpHash     = hashOtp(otp);
  user.otpExpires  = new Date(Date.now() + OTP_TTL_MS);
  user.otpAttempts = 0;
  await user.save();
  await sendOtpEmail(user, otp);
}

async function sendOtpEmail(user, otp) {
  await sendBrevoEmail({
    to:      user.email,
    subject: `${otp} is your Eventify verification code`,
    html: `
      <div style="font-family:Arial,sans-serif;padding:24px;background:#f5f7fa;color:#111;">
        <div style="max-width:600px;margin:auto;background:#fff;border-radius:14px;padding:32px;border:1px solid #e5e7eb;">
          <h2 style="margin-top:0;color:#166534;">Verify your email</h2>
          <p>Hello ${user.name || "there"},</p>
          <p>Use the code below to verify your Eventify account. It expires in 10 minutes.</p>
          <div style="margin:28px 0;text-align:center;">
            <span style="display:inline-block;background:#0d3d22;color:#fff;font-size:34px;font-weight:700;letter-spacing:10px;padding:16px 24px;border-radius:12px;">${otp}</span>
          </div>
          <p>If you didn't create an account, you can safely ignore this email.</p>
          <p style="margin-top:30px;color:#6b7280;font-size:14px;">Eventify Security Team</p>
        </div>
      </div>
    `,
  });
}

function createAuthResponse(user) {
  const token = jwt.sign(
    { id: user._id, email: user.email, isAdmin: user.isAdmin, name: user.name, isVerified: user.isVerified },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
  return {
    token,
    user: {
      id:             user._id,
      name:           user.name,
      email:          user.email,
      phone:          user.phone,
      age:            user.age,
      gender:         user.gender,
      favoriteEvents: user.favoriteEvents || [],
      isAdmin:        user.isAdmin,
      isVerified:     user.isVerified,
    },
  };
}

function publicUser(user) {
  return {
    id:             user._id,
    name:           user.name,
    email:          user.email,
    phone:          user.phone,
    age:            user.age,
    gender:         user.gender,
    favoriteEvents: user.favoriteEvents || [],
    isAdmin:        user.isAdmin,
    isVerified:     user.isVerified,
  };
}

function createTokenForUser(user) {
  return jwt.sign(
    { id: user._id, email: user.email, isAdmin: user.isAdmin, name: user.name, isVerified: user.isVerified },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}

// ─── PUBLIC ROUTES ────────────────────────────────────────────────────────────

// register
router.post("/", async (req, res) => {
  try {
    const existingUser = await User.findOne({ email: String(req.body.email || "").toLowerCase().trim() });
    if (existingUser) {
      // Already verified → genuine duplicate.
      if (existingUser.isVerified) {
        return res.status(400).json({ message: "Email already exists" });
      }
      // Registered before but never verified → send a fresh code and let them finish.
      await issueOtp(existingUser);
      return res.status(200).json({
        message: "This email is already registered but not verified — we've sent you a new code.",
        email: existingUser.email,
        requiresVerification: true,
      });
    }

    const user = new User({
      name:    req.body.name,
      email:   req.body.email,
      phone:   req.body.phone,
      age:     req.body.age,
      gender:  req.body.gender,
      password: req.body.password,
      isAdmin: false,
      isVerified: false,
    });

    // saves the user (with hashed password + OTP) and emails the code
    await issueOtp(user);

    res.status(201).json({
      message: "Account created. We've emailed you a 6-digit verification code.",
      email: user.email,
      requiresVerification: true,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// verify the OTP — on success the user is marked verified and logged in (one time only)
router.post("/verify-otp", async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ message: "Email and code are required" });

    const user = await User.findOne({ email: String(email).toLowerCase().trim() });
    if (!user) return res.status(400).json({ message: "Invalid code" });

    // already verified — nothing to do, just issue a session
    if (user.isVerified) return res.json(createAuthResponse(user));

    if (!user.otpHash || !user.otpExpires || user.otpExpires.getTime() < Date.now()) {
      return res.status(400).json({ message: "Your code has expired. Please request a new one." });
    }
    if (user.otpAttempts >= OTP_MAX_ATTEMPTS) {
      return res.status(429).json({ message: "Too many attempts. Please request a new code." });
    }

    if (hashOtp(otp) !== user.otpHash) {
      user.otpAttempts += 1;
      await user.save();
      return res.status(400).json({ message: "Invalid code" });
    }

    // success — verify once, clear the OTP, and hand back a real session
    user.isVerified  = true;
    user.otpHash     = null;
    user.otpExpires  = null;
    user.otpAttempts = 0;
    await user.save();

    res.json(createAuthResponse(user));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// resend a fresh OTP (generic response so accounts can't be enumerated)
router.post("/resend-otp", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required" });

    const user = await User.findOne({ email: String(email).toLowerCase().trim() });
    if (user && !user.isVerified) {
      await issueOtp(user);
    }

    res.json({ message: "If that account needs verification, a new code has been sent." });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: String(email || "").toLowerCase().trim() });

    if (!user) return res.status(401).json({ message: "Invalid login" });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ message: "Invalid login" });

    // unverified users can't get a session — send them a fresh code instead
    if (!user.isVerified) {
      await issueOtp(user);
      return res.status(403).json({
        message: "Please verify your email. We've sent you a new code.",
        requiresVerification: true,
        email: user.email,
      });
    }

    res.json(createAuthResponse(user));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// forgot password
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required" });

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(200).json({
        message: "If an account exists for this email, a password reset link has been sent.",
      });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    user.resetPasswordToken   = hashResetToken(resetToken);
    user.resetPasswordExpires = Date.now() + 1000 * 60 * 15;
    await user.save();

    const resetURL = `${process.env.CLIENT_URL}/reset-password/reset-password.html?token=${resetToken}`;

    await sendBrevoEmail({
      to:      user.email,
      subject: "Reset Your Eventify Password",
      html: `
        <div style="font-family:Arial,sans-serif;padding:24px;background:#f5f7fa;color:#111;">
          <div style="max-width:600px;margin:auto;background:#fff;border-radius:14px;padding:32px;border:1px solid #e5e7eb;">
            <h2 style="margin-top:0;color:#166534;">Reset Your Password</h2>
            <p>Hello ${user.name || "User"},</p>
            <p>We received a request to reset your Eventify account password.</p>
            <p>This link will expire in <strong>15 minutes</strong>.</p>
            <div style="margin:30px 0;">
              <a href="${resetURL}"
                style="background:#166534;color:white;padding:14px 24px;text-decoration:none;border-radius:10px;font-weight:bold;display:inline-block;">
                Reset Password
              </a>
            </div>
            <p>If you did not request this, please ignore this email.</p>
            <p style="margin-top:30px;color:#6b7280;font-size:14px;">Eventify Security Team</p>
          </div>
        </div>
      `,
    });

    return res.status(200).json({
      message: "If an account exists for this email, a password reset link has been sent.",
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Could not send reset email" });
  }
});

// reset password
router.post("/reset-password", async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!passwordPattern.test(newPassword)) {
      return res.status(400).json({
        message: "Password must contain uppercase, lowercase, number and be at least 8 characters",
      });
    }

    const user = await User.findOne({
      resetPasswordToken:   hashResetToken(token),
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) return res.status(400).json({ message: "Invalid or expired reset token" });

    user.password             = newPassword;
    user.resetPasswordToken   = null;
    user.resetPasswordExpires = null;
    await user.save();

    return res.status(200).json({ message: "Password reset successfully" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Could not reset password" });
  }
});

// ─── PROTECTED /me ROUTES ─────────────────────────────────────────────────────

// current logged-in user (lightweight)
router.get("/me", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({ ...publicUser(user), token: createTokenForUser(user) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// update current logged-in user profile
// username is intentionally excluded — not used in DB
router.put("/me", auth, async (req, res) => {
  try {
    const allowedUpdates = ["name", "email", "phone", "age", "gender"];
    const updates = {};

    for (const field of allowedUpdates) {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) {
        updates[field] = req.body[field];
      }
    }

    const existingUser = await User.findById(req.user.id);
    if (!existingUser) return res.status(404).json({ message: "User not found" });

    if (updates.email) {
      updates.email = String(updates.email).toLowerCase().trim();

      const emailOwner = await User.findOne({
        email: updates.email,
        _id:   { $ne: req.user.id },
      });

      if (emailOwner) return res.status(400).json({ message: "Email already exists" });
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      updates,
      { returnDocument: "after", runValidators: true }
    ).select("-password");

    if (!user) return res.status(404).json({ message: "User not found" });

    // keep bookings in sync if email changed
    if (updates.email && updates.email !== existingUser.email) {
      await Booking.updateMany({ user: existingUser.email }, { user: updates.email });
    }

    res.json({ ...publicUser(user), token: createTokenForUser(user) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// current logged-in user full profile (for profile page load)
router.get("/me/profile", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// fetch favorites
router.get("/me/favorites", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select("favoriteEvents")
      .populate("favoriteEvents");

    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user.favoriteEvents || []);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// save event to favorites
router.post("/me/favorites/:eventId", auth, async (req, res) => {
  try {
    const event = await Event.findById(req.params.eventId);
    if (!event) return res.status(404).json({ message: "Event not found" });

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $addToSet: { favoriteEvents: event._id } },
      { returnDocument: "after", runValidators: true }
    ).select("-password");

    if (!user) return res.status(404).json({ message: "User not found" });
    res.status(201).json(publicUser(user));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// remove event from favorites
router.delete("/me/favorites/:eventId", auth, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $pull: { favoriteEvents: req.params.eventId } },
      { returnDocument: "after", runValidators: true }
    ).select("-password");

    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(publicUser(user));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// change password — verifies current password before allowing change
router.put("/me/password", auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Current password and new password are required" });
    }

    const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!passwordPattern.test(newPassword)) {
      return res.status(400).json({
        message: "Password must be at least 8 characters and include uppercase, lowercase, and a number",
      });
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const match = await bcrypt.compare(currentPassword, user.password);
    if (!match) return res.status(401).json({ message: "Current password is incorrect" });

    user.password = newPassword;
    await user.save();

    await sendPasswordChangedEmail(user);

    res.json({ message: "Password changed successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── ADMIN ROUTES ─────────────────────────────────────────────────────────────

// fetch all users
router.get("/", auth, admin, async (req, res) => {
  const users = await User.find().select("-password");
  res.json(users);
});

// edit user
router.put("/:id", auth, admin, async (req, res) => {
  const allowedUpdates = ["name", "email", "phone", "age", "gender", "isAdmin"];
  const updates = {};

  for (const field of allowedUpdates) {
    if (Object.prototype.hasOwnProperty.call(req.body, field)) {
      updates[field] = req.body[field];
    }
  }

  const user = await User.findByIdAndUpdate(
    req.params.id,
    updates,
    { returnDocument: "after", runValidators: true }
  ).select("-password");

  res.json(user);
});

// delete user
router.delete("/:id", auth, admin, async (req, res) => {
  await User.findByIdAndDelete(req.params.id);
  res.json({ message: "User deleted" });
});

// ─── DYNAMIC /:id — must come LAST ────────────────────────────────────────────
router.get("/:id", auth, async (req, res) => {
  if (!req.user.isAdmin && req.params.id !== req.user.id) {
    return res.status(403).json({ message: "Unauthorized" });
  }
  const user = await User.findById(req.params.id).select("-password");
  res.json(user);
});

module.exports = router;