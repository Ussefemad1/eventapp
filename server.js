require("dotenv").config();
const express = require("express");
const connectDB = require("./database/db.js");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
//const mongoSanitize = require("express-mongo-sanitize");

const app = express();
connectDB();

app.use(express.json());
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  })
);
//app.use(mongoSanitize());
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
}));
app.use(express.static("public"));

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/public/home/home.html");
});

app.use("/api/users",    require("./routes/userRoutes"));
app.use("/api/events",   require("./routes/eventRoutes"));
app.use("/api/bookings", require("./routes/bookingRoute"));

app.listen(3000, () => console.log("Server running on port 3000"));