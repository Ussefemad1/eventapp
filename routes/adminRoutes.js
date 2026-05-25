const express = require("express");
const router = express.Router();

const auth = require("../middleware/auth");
const admin = require("../middleware/admin");
const User = require("../models/user");
const Event = require("../models/event");
const Booking = require("../models/booking");

router.get("/stats", auth, admin, async (req, res) => {
  try {
    const [
      totalUsers,
      totalEvents,
      totalBookings,
      activeBookings,
      pendingCashPayments,
      revenueResult,
      lowSeatEvents,
      upcomingEvents,
    ] = await Promise.all([
      User.countDocuments(),
      Event.countDocuments(),
      Booking.countDocuments(),
      Booking.countDocuments({ bookingStatus: "active" }),
      Booking.countDocuments({
        paymentMethod: "cash",
        paymentStatus: "pending",
        bookingStatus: "active",
      }),
      Booking.aggregate([
        {
          $match: {
            paymentStatus: "paid",
            bookingStatus: "active",
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: "$amount" },
          },
        },
      ]),
      Event.find({
        status: { $ne: "cancelled" },
        $expr: { $lte: ["$available", { $max: [5, { $ceil: { $multiply: ["$seats", 0.1] } }] }] },
      })
        .select("name category venue startDate seats available")
        .sort({ available: 1 })
        .limit(10),
      Event.countDocuments({
        status: "upcoming",
        startDate: { $gte: new Date() },
      }),
    ]);

    res.json({
      totalUsers,
      totalEvents,
      totalBookings,
      activeBookings,
      upcomingEvents,
      revenue: revenueResult[0]?.total || 0,
      pendingCashPayments,
      lowSeatEvents,
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
