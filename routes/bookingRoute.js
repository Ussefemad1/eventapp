const express = require("express");
const router  = express.Router();
const Booking = require("../models/booking"); 

// fetch bookings kulha 
router.get("/", async (req, res) => {
  const bookings = await Booking.find();
  res.json(bookings);
});

// fetch booking bel id 
router.get("/:id", async (req, res) => {
  const booking = await Booking.findById(req.params.id);
  res.json(booking);
});

// booking gdeda 
router.post("/", async (req, res) => {
  try {
    const booking = new Booking(req.body);
    await booking.save(); // Persist
    res.status(201).json(booking);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Edit booking fel database 
router.put("/:id", async (req, res) => {
  const booking = await Booking.findByIdAndUpdate(req.params.id, req.body, { returnDocument: "after" });
  res.json(booking);
});

// Remove booking mn el database 
router.delete("/:id", async (req, res) => {
  await Booking.findByIdAndDelete(req.params.id);
  res.json({ message: "Booking deleted" });
});

module.exports = router;