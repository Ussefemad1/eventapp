const mongoose = require("mongoose");

const eventSchema = new mongoose.Schema({
  name:      String,
  category:  String,
  venue:     String,
  price:     Number,
  seats:     Number,
  available: Number,
});

module.exports = mongoose.model("Event", eventSchema);