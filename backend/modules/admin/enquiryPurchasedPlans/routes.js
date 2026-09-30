const express                       = require("express");
const { getEnquiryPurchasedPlans }  = require("./controller");
const { protect }                   = require("../../../middleware/auth");

const router = express.Router();

router.use(protect);

router.get("/", getEnquiryPurchasedPlans);

module.exports = router;
