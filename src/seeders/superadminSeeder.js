require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../models/User");
const { connectDB } = require("../config");

const seedSuperadmin = async () => {
  try {
    await connectDB();

    // Check if superadmin already exists
    const existingSuperadmin = await User.findOne({ role: "SUPERADMIN" });
    if (existingSuperadmin) {
      console.log("Superadmin already exists!");
      process.exit(0);
    }

    // Create new superadmin
    const superadmin = new User({
      representativeName: "Super Admin",
      companyName: "LR License Management",
      phone: "1234567890",
      email: "superadmin@cloudedata.com",
      passwordHash: "Superadmin@123",
      role: "SUPERADMIN",
      status: "active",
    });

    await superadmin.save();
    console.log("Superadmin created successfully!");
    console.log("Email: superadmin@cloudedata.com");
    console.log("Password: Superadmin@123");
    process.exit(0);
  } catch (err) {
    console.error("Error seeding superadmin:", err);
    process.exit(1);
  }
};

seedSuperadmin();
