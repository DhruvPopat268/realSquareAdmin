const express = require("express");
const { createPlanOrder, cancelPlanOrder, getActivePlans, purchasePlan } = require("./controller");
const { userProtect } = require("../../../middleware/userAuth");

const router = express.Router();

router.use(userProtect);

router.get("/active-plans",                 getActivePlans);
router.post("/purchase",                     purchasePlan);
router.post("/create-order",                createPlanOrder);
router.patch("/cancel/:transactionId",      cancelPlanOrder);

module.exports = router;
