const express = require("express");

const authRoutes = require("./auth/routes");
// add more customer feature routes here as you build them
// const profileRoutes  = require("./profile/routes");
// const bookingRoutes  = require("./booking/routes");

const router = express.Router();

router.use("/auth", authRoutes);
// router.use("/profile",  profileRoutes);
// router.use("/bookings", bookingRoutes);

module.exports = router;
