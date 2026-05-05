const express = require("express");
const router  = express.Router();
const Event   = require("../models/event"); 

// fetch events kulaha mn el database w b3d kda n7otaha f response b format json 3shan el frontend y2dr yst5dmha
router.get("/", async (req, res) => {
  const events = await Event.find();
  res.json(events);
});

// ha fetch event wa7da be id
router.get("/:id", async (req, res) => {
  const event = await Event.findById(req.params.id);
  res.json(event);
});

//create event, ha receive data mn el frontend w b3d kda ha saveha f database w b3d kda ha return el event el gdida f response f json
router.post("/", async (req, res) => {
  try {
    const event = new Event(req.body);
    await event.save(); 
    res.status(201).json(event);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

//booking - ha check awl en el event 3ndo available seats, lw mafeesh ha return error, lw fe available seats ha decrement w b3d kda ha return el event f json
router.put("/:id/book", async (req, res) => {
  const event = await Event.findOneAndUpdate(
    { _id: req.params.id, available: { $gt: 0 } }, //check mawgod seats wla la
    { $inc: { available: -1 } },
    { returnDocument: "after" }
  );
  if (!event) return res.status(409).json({ message: "Sold out" });
  res.json(event);
});

// delete booking - ha increment el available seats be 1 w b3d kda ha return el event f json
router.put("/:id/cancel", async (req, res) => {
  const event = await Event.findByIdAndUpdate(
    req.params.id,
    { $inc: { available: 1 } }, // Restore seat
    { returnDocument: "after" }
  );
  res.json(event);
});

// Edit event - ha receive data mn el frontend w b3d kda ha update el event f database w b3d kda ha return el event f json
router.put("/:id", async (req, res) => {
  const event = await Event.findByIdAndUpdate(req.params.id, req.body, { returnDocument: "after" });
  res.json(event);
});

// Remove event - ha delete el event f database w b3d kda ha return message f json
router.delete("/:id", async (req, res) => {
  await Event.findByIdAndDelete(req.params.id);
  res.json({ message: "Event deleted" });
});

module.exports = router;