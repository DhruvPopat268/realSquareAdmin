const express = require("express");

const adminRoutes    = require("../modules/admin/routes");
const customerRoutes = require("../modules/customer/routes");
// add more entity routes here as you build them
// const agentRoutes = require("../modules/agent/routes");

const router = express.Router();

router.use("/admin",    adminRoutes);
router.use("/customer", customerRoutes);
// router.use("/agent", agentRoutes);

module.exports = router;
