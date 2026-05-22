const express = require("express");
const router  = express.Router();
const Booking = require("../models/booking");
const Event   = require("../models/event");
const auth = require("../middleware/auth");

// fetch bookings
router.get("/", auth, async (req, res) => {

  try {

    const filter =
      req.user.isAdmin
        ? {}
        : { user: req.user.email };

    const bookings = await Booking.find(filter);

    res.json(bookings);

  } catch (err) {

    res.status(500).json({
      message: err.message
    });

  }

});

// fetch booking by id
router.get("/:id", auth, async (req, res) => {

  try {

    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        message: "Booking not found"
      });
    }

    if (
      !req.user.isAdmin &&
      booking.user !== req.user.email
    ) {
      return res.status(403).json({
        message: "Unauthorized"
      });
    }

    res.json(booking);

  } catch (err) {

    res.status(500).json({
      message: err.message
    });

  }

});

// create booking
router.post("/", auth, async (req, res) => {

  try {

    const {
      eventId,
      event,
      tickets,
      paymentMethod,
      paymentStatus,
      amount
    } = req.body;

    // find event
    const existingEvent = await Event.findById(eventId);

    if (!existingEvent) {
      return res.status(404).json({
        message: "Event not found"
      });
    }

    // validate tickets
    if (!tickets || tickets < 1) {
      return res.status(400).json({
        message: "Invalid number of tickets"
      });
    }

    // check available seats
    if (existingEvent.available < tickets) {
      return res.status(400).json({
        message: "Not enough available seats"
      });
    }

    // decrease available seats
    existingEvent.available -= tickets;

    await existingEvent.save();

    // create booking
    const booking = new Booking({
      user: req.user.email,
      eventId,
      event,
      tickets,
      paymentMethod,
      paymentStatus,
      amount,
    });

    await booking.save();

    res.status(201).json(booking);

  } catch (err) {

    res.status(500).json({
      message: err.message
    });

  }

});

// edit booking
router.put("/:id", auth, async (req, res) => {

  try {

    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        message: "Booking not found"
      });
    }

    if (
      !req.user.isAdmin &&
      booking.user !== req.user.email
    ) {
      return res.status(403).json({
        message: "Unauthorized"
      });
    }

    const updated = await Booking.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    res.json(updated);

  } catch (err) {

    res.status(500).json({
      message: err.message
    });

  }

});

// delete booking
router.delete("/:id", auth, async (req, res) => {

  try {

    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        message: "Booking not found"
      });
    }

    if (
      !req.user.isAdmin &&
      booking.user !== req.user.email
    ) {
      return res.status(403).json({
        message: "Unauthorized"
      });
    }

    // restore seats
    const event = await Event.findById(booking.eventId);

    if (event) {
      event.available += booking.tickets;
      await event.save();
    }

    // delete booking
    await Booking.findByIdAndDelete(req.params.id);

    res.json({
      message: "Booking deleted"
    });

  } catch (err) {

    res.status(500).json({
      message: err.message
    });

  }

});

module.exports = router;