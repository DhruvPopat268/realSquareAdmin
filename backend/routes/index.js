const express = require("express");

const adminRoutes       = require("../modules/admin/routes");
const customerRoutes    = require("../modules/customers/routes");
const ownerRoutes       = require("../modules/owners/routes");
const brokerRoutes      = require("../modules/brokers/routes");
const builderRoutes     = require("../modules/builders/routes");
const systemUserRoutes  = require("../modules/systemUsers.routes");
const mixedRoutes       = require("../modules/mixed/routes");

const router = express.Router();

router.use("/admin",        adminRoutes);
router.use("/customer",     customerRoutes);
router.use("/owner",        ownerRoutes);
router.use("/broker",       brokerRoutes);
router.use("/builder",      builderRoutes);
router.use("/system-users", systemUserRoutes);
router.use("/mixed",        mixedRoutes);

module.exports = router;
