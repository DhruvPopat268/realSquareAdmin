const express                  = require("express");
const { getListingPurchasedPlans }    = require("./controller");
const { protect }              = require("../../../middleware/auth");

const router = express.Router();

router.use(protect);

router.get("/", getListingPurchasedPlans);

module.exports = router;
