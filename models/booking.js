const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    trim: true,
    index: true,
  },

  user: {
    type: String,
    required: true,
    trim: true,
  },

  eventId: {
    type: String,
    required: true,
    trim: true,
  },

  event: {
    type: String,
    required: true,
    trim: true,
  },
  
    tickets: {
  type: Number,
  required: true,
  min: 1,
  default: 1,
},

  paymentMethod: {
    type: String,
    enum: ["cash", "card"],
    required: true,
  },

  paymentStatus: {
    type: String,
    enum: ["pending", "paid", "cancelled", "refunded"],
    default: "pending",
  },

  bookingStatus: {
    type: String,
    enum: ["active", "cancelled"],
    default: "active",
  },

  cancelledAt: {
    type: Date,
    default: null,
  },

  amount: {
    type: Number,
    default: 0,
    min: 0,
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Booking", bookingSchema);