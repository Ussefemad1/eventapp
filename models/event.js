const mongoose = require("mongoose");

const eventSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },

  category: {
    type: String,
    required: true,
    trim: true,
  },

  venue: {
    type: String,
    required: true,
    trim: true,
  },

  locationUrl: {
    type: String,
    trim: true,
  },

  image: {
    type: String,
  },

  startDate: {
    type: Date,
  },

  status: {
    type: String,
    enum: ["draft", "upcoming", "completed", "cancelled"],
    default: "upcoming",
  },

  price: {
    type: Number,
    required: true,
    min: 0,
  },

  seats: {
    type: Number,
    required: true,
    min: 0,
  },

  available: {
    type: Number,
    required: true,
    min: 0,
  },
});

eventSchema.pre("validate", function () {
  if (this.available > this.seats) {
    this.available = this.seats;
  }
});

module.exports = mongoose.model("Event", eventSchema);
