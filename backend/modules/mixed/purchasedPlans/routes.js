const express = require("express");
const { createPlanOrder, upgradePlanOrder, cancelPlanOrder, getActivePlans, purchasePlan, upgradePlan } = require("./controller");
const { userProtect } = require("../../../middleware/userAuth");

const router = express.Router();

router.use(userProtect);

router.get("/active-plans",            getActivePlans);
router.post("/purchase",               purchasePlan);
router.post("/change-plan",            upgradePlan);
router.post("/create-order",           createPlanOrder);
router.post("/change-plan-order",      upgradePlanOrder);
router.patch("/cancel/:transactionId", cancelPlanOrder);

module.exports = router;
