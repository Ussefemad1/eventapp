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

  image: {
    type: String,
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

module.exports = mongoose.model("Event", eventSchema);
