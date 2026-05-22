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

    const event = new Event(req.body);

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

    const event = await Event.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
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