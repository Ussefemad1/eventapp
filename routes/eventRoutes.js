const express = require("express");
const router  = express.Router();
const Event   = require("../models/event");
const auth    = require("../middleware/auth");

// fetch events
router.get("/", async (req, res) => {
  const events = await Event.find();
  res.json(events);
});

// fetch single event
router.get("/:id", async (req, res) => {
  const event = await Event.findById(req.params.id);
  res.json(event);
});

// create event (admin only)
router.post("/", auth, async (req, res) => {
  try {

    if (!req.user.isAdmin) {
      return res.status(403).json({ message: "Admins only" });
    }

    const event = new Event(req.body);

    await event.save();

    res.status(201).json(event);

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// booking
router.put("/:id/book", auth, async (req, res) => {

  const event = await Event.findOneAndUpdate(
    { _id: req.params.id, available: { $gt: 0 } },
    { $inc: { available: -1 } },
    { returnDocument: "after" }
  );

  if (!event) {
    return res.status(409).json({ message: "Sold out" });
  }

  res.json(event);
});

// cancel booking
router.put("/:id/cancel", auth, async (req, res) => {

  const event = await Event.findByIdAndUpdate(
    req.params.id,
    { $inc: { available: 1 } },
    { returnDocument: "after" }
  );

  res.json(event);
});

// edit event
router.put("/:id", auth, async (req, res) => {

  if (!req.user.isAdmin) {
    return res.status(403).json({ message: "Admins only" });
  }

  const event = await Event.findByIdAndUpdate(
    req.params.id,
    req.body,
    { returnDocument: "after" }
  );

  res.json(event);
});

// delete event
router.delete("/:id", auth, async (req, res) => {

  if (!req.user.isAdmin) {
    return res.status(403).json({ message: "Admins only" });
  }

  await Event.findByIdAndDelete(req.params.id);

  res.json({ message: "Event deleted" });
});

module.exports = router;