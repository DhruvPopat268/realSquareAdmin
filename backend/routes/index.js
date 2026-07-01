const express = require("express");

const adminRoutes       = require("../modules/admin/routes");
const customerRoutes    = require("../modules/customer/routes");
const systemUserRoutes  = require("../modules/systemUsers.routes");

const router = express.Router();

router.use("/admin",        adminRoutes);
router.use("/customer",     customerRoutes);
router.use("/system-users", systemUserRoutes);

module.exports = router;
