const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema({
  user: {
    type: String,
    required: true,
  },

  eventId: {
    type: String,
    required: true,
  },

  event: {
    type: String,
    required: true,
  },

  paymentMethod: {
    type: String,
    enum: ["cash", "card"],
    required: true,
  },

  paymentStatus: {
    type: String,
    enum: ["pending", "paid"],
    default: "pending",
  },

  amount: {
    type: Number,
    default: 0,
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Booking", bookingSchema);