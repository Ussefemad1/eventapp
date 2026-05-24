const express = require("express");
const router  = express.Router();

const Event = require("../models/event");
const auth  = require("../middleware/auth");

// fetch events
router.get("/", async (req, res) => {

  try {

    const events = await Event.find();

    res.json(events);

  } catch (err) {

    res.status(500).json({
      message: err.message
    });

  }

});

// fetch single event
router.get("/:id", async (req, res) => {

  try {

    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        message: "Event not found"
      });
    }

    res.json(event);

  } catch (err) {

    res.status(500).json({
      message: err.message
    });

  }

});

// create event (admin only)
router.post("/", auth, async (req, res) => {

  try {

    if (!req.user.isAdmin) {
      return res.status(403).json({
        message: "Admins only"
      });
    }

    const { name, category, venue, image, seats, price, available } = req.body;

    if (!image || !String(image).startsWith("data:image/")) {
      return res.status(400).json({
        message: "Event image is required"
      });
    }

    const event = new Event({
      name,
      category,
      venue,
      image,
      seats,
      price,
      available
    });

    await event.save();

    res.status(201).json(event);

  } catch (err) {

    res.status(500).json({
      message: err.message
    });

  }

});

// edit event
router.put("/:id", auth, async (req, res) => {

  try {

    if (!req.user.isAdmin) {
      return res.status(403).json({
        message: "Admins only"
      });
    }

    if (req.body.image && !String(req.body.image).startsWith("data:image/")) {
      return res.status(400).json({
        message: "Event image must be a valid image upload"
      });
    }

    const allowedUpdates = ["name", "category", "venue", "image", "seats", "price", "available"];
    const updates = {};

    for (const field of allowedUpdates) {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) {
        updates[field] = req.body[field];
      }
    }

    const event = await Event.findByIdAndUpdate(
      req.params.id,
      updates,
      { returnDocument: "after", runValidators: true }
    );

    if (!event) {
      return res.status(404).json({
        message: "Event not found"
      });
    }

    res.json(event);

  } catch (err) {

    res.status(500).json({
      message: err.message
    });

  }

});

// delete event
router.delete("/:id", auth, async (req, res) => {

  try {

    if (!req.user.isAdmin) {
      return res.status(403).json({
        message: "Admins only"
      });
    }

    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        message: "Event not found"
      });
    }

    await Event.findByIdAndDelete(req.params.id);

    res.json({
      message: "Event deleted"
    });

  } catch (err) {

    res.status(500).json({
      message: err.message
    });

  }

});

module.exports = router;
