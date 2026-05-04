const express = require("express");
const router  = express.Router();
const Event   = require("../models/event");

router.get("/", async (req, res) => {
  const events = await Event.find();
  res.json(events);
});

router.get("/:id", async (req, res) => {
  const event = await Event.findById(req.params.id);
  res.json(event);
});

router.post("/", async (req, res) => {
  try {
    const event = new Event(req.body);
    await event.save();
    res.status(201).json(event);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put("/:id/book", async (req, res) => {
  const event = await Event.findOneAndUpdate(
    { _id: req.params.id, available: { $gt: 0 } },
    { $inc: { available: -1 } },
    { returnDocument: "after" }
  );
  if (!event) return res.status(409).json({ message: "Sold out" });
  res.json(event);
});

router.put("/:id/cancel", async (req, res) => {
  const event = await Event.findByIdAndUpdate(
    req.params.id,
    { $inc: { available: 1 } },
    { returnDocument: "after" }
  );
  res.json(event);
});

router.put("/:id", async (req, res) => {
  const event = await Event.findByIdAndUpdate(req.params.id, req.body, { returnDocument: "after" });
  res.json(event);
});

router.delete("/:id", async (req, res) => {
  await Event.findByIdAndDelete(req.params.id);
  res.json({ message: "Event deleted" });
});

module.exports = router;