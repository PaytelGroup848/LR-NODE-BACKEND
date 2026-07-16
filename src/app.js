require("dotenv").config();
const express = require("express");
const cors = require("cors");
const errorHandler = require("./middleware/errorHandler");

const authRoutes = require("./routes/auth");
const superadminRoutes = require("./routes/superadmin");
const partnerRoutes = require("./routes/partner");
const licenseClientRoutes = require("./routes/licenseClient");
const publicRoutes = require("./routes/public");

const app = express();

const allowedOrigins = ["http://localhost:5173", "http://localhost:5174"];

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  }),
);

app.use(express.json());

app.use("/auth", authRoutes);
app.use("/superadmin", superadminRoutes);
app.use("/partner", partnerRoutes);
app.use("/license-client", licenseClientRoutes);
app.use("/public", publicRoutes);

app.use(errorHandler);

module.exports = app;
