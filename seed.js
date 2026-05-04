// seed.js
require("dotenv").config();
const connectDB = require("./database/db.js");
const User = require("./models/user");
const users = require("./public/home/aa.json");

async function seed() {
  await connectDB();
  await User.deleteMany();
  for (const u of users) {
    await new User(u).save();
  }
  console.log("Admin seeded successfully");
  process.exit();
}

seed();