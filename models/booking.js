const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema({
  user:    String,
  eventId: String,
  event:   String,
});

module.exports = mongoose.model("Booking", bookingSchema);