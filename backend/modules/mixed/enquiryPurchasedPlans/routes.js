const express = require("express");
const {
  getActiveEnquiryPlans,
  createEnquiryPlanOrder,
  upgradeEnquiryPlanOrder,
  cancelEnquiryPlanOrder,
  purchaseEnquiryPlan,
  upgradeEnquiryPlan,
} = require("./controller");
const { userProtect } = require("../../../middleware/userAuth");

const router = express.Router();

router.use(userProtect);

router.get("/active-plans",            getActiveEnquiryPlans);
router.post("/purchase",               purchaseEnquiryPlan);
router.post("/change-plan",            upgradeEnquiryPlan);
router.post("/create-order",           createEnquiryPlanOrder);
router.post("/change-plan-order",      upgradeEnquiryPlanOrder);
router.patch("/cancel/:transactionId", cancelEnquiryPlanOrder);

module.exports = router;
