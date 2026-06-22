const express = require("express");

const authRoutes = require("./auth/routes");
// add more admin feature routes here as you build them
// const propertyRoutes = require("./property/routes");
// const leadRoutes     = require("./lead/routes");

const router = express.Router();

router.use("/auth", authRoutes);
// router.use("/properties", propertyRoutes);
// router.use("/leads",      leadRoutes);

module.exports = router;
