const express = require("express");
const router  = express.Router();
const Booking = require("../models/booking");

router.get("/", async (req, res) => {
  const bookings = await Booking.find();
  res.json(bookings);
});

router.get("/:id", async (req, res) => {
  const booking = await Booking.findById(req.params.id);
  res.json(booking);
});

router.post("/", async (req, res) => {
  try {
    const booking = new Booking(req.body);
    await booking.save();
    res.status(201).json(booking);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put("/:id", async (req, res) => {
  const booking = await Booking.findByIdAndUpdate(req.params.id, req.body, { returnDocument: "after" });
  res.json(booking);
});

router.delete("/:id", async (req, res) => {
  await Booking.findByIdAndDelete(req.params.id);
  res.json({ message: "Booking deleted" });
});

module.exports = router;