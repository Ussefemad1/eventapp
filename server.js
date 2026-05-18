require("dotenv").config();
const express = require("express");
const connectDB = require("./database/db.js");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const app = express();
app.set('trust proxy', 1);
connectDB();

app.use(express.json());
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  })
);

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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));