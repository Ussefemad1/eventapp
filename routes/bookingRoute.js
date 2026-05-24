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
      tickets,
      paymentMethod,
    } = req.body;

    const ticketCount = Number(tickets);

    // validate tickets
    if (!Number.isInteger(ticketCount) || ticketCount < 1) {
      return res.status(400).json({
        message: "Invalid number of tickets"
      });
    }

    if (!["cash", "card"].includes(paymentMethod)) {
      return res.status(400).json({
        message: "Invalid payment method"
      });
    }

    const existingEvent = await Event.findOneAndUpdate(
      {
        _id: eventId,
        available: { $gte: ticketCount }
      },
      {
        $inc: { available: -ticketCount }
      },
      {
        returnDocument: "after"
      }
    );

    if (!existingEvent) {
      const eventExists = await Event.exists({ _id: eventId });

      return res.status(eventExists ? 400 : 404).json({
        message: eventExists ? "Not enough available seats" : "Event not found"
      });
    }

    // create booking
    const booking = new Booking({
      user: req.user.email,
      eventId,
      event: existingEvent.name,
      tickets: ticketCount,
      paymentMethod,
      paymentStatus: paymentMethod === "card" ? "paid" : "pending",
      amount: existingEvent.price * ticketCount,
    });

    try {
      await booking.save();
    } catch (err) {
      await Event.findByIdAndUpdate(eventId, {
        $inc: { available: ticketCount }
      });
      throw err;
    }

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

    if (!req.user.isAdmin) {
      return res.status(403).json({
        message: "Unauthorized"
      });
    }

    const allowedUpdates = ["paymentMethod"];
    const updates = {};

    for (const field of allowedUpdates) {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) {
        updates[field] = req.body[field];
      }
    }

    if (updates.paymentMethod) {
      updates.paymentStatus = updates.paymentMethod === "card" ? "paid" : "pending";
    }

    const updated = await Booking.findByIdAndUpdate(
      req.params.id,
      updates,
      { returnDocument: "after", runValidators: true }
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
