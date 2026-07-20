const express                  = require("express");
const { getPurchasedPlans }    = require("./controller");
const { protect }              = require("../../../middleware/auth");

const router = express.Router();

router.use(protect);

router.get("/", getPurchasedPlans);

module.exports = router;
