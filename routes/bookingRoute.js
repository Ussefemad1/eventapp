const express = require("express");
const router  = express.Router();
const Booking = require("../models/booking");
const auth    = require("../middleware/auth");

// fetch bookings
router.get("/", auth, async (req, res) => {

  const bookings = await Booking.find({
    user: req.user.email
  });

  res.json(bookings);
});

// fetch booking by id
router.get("/:id", auth, async (req, res) => {

  const booking = await Booking.findById(req.params.id);

  if (!booking) {
    return res.status(404).json({ message: "Booking not found" });
  }

  if (booking.user !== req.user.email) {
    return res.status(403).json({ message: "Unauthorized" });
  }

  res.json(booking);
});

// create booking
router.post("/", auth, async (req, res) => {
  try {

    const booking = new Booking({
      ...req.body,
      user: req.user.email
    });

    await booking.save();

    res.status(201).json(booking);

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// edit booking
router.put("/:id", auth, async (req, res) => {

  const booking = await Booking.findById(req.params.id);

  if (!booking) {
    return res.status(404).json({ message: "Booking not found" });
  }

  if (booking.user !== req.user.email) {
    return res.status(403).json({ message: "Unauthorized" });
  }

  const updated = await Booking.findByIdAndUpdate(
    req.params.id,
    req.body,
    { returnDocument: "after" }
  );

  res.json(updated);
});

// delete booking
router.delete("/:id", auth, async (req, res) => {

  const booking = await Booking.findById(req.params.id);

  if (!booking) {
    return res.status(404).json({ message: "Booking not found" });
  }

  if (booking.user !== req.user.email) {
    return res.status(403).json({ message: "Unauthorized" });
  }

  await Booking.findByIdAndDelete(req.params.id);

  res.json({ message: "Booking deleted" });
});

module.exports = router;