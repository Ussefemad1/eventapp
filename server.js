require("dotenv").config();
const express = require("express");
const connectDB = require("./database/db.js");

const app = express();
connectDB();

app.use(express.json());
app.use(express.static("public"));

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/public/home/home.html");
});

app.use("/api/users",    require("./routes/userRoutes"));
app.use("/api/events",   require("./routes/eventRoutes"));
app.use("/api/bookings", require("./routes/bookingRoute"));

app.listen(3000, () => console.log("Server running on port 3000"));