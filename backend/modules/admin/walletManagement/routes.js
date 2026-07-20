const express                      = require("express");
const { getPaymentTransactions }   = require("./controller");
const { protect }                  = require("../../../middleware/auth");

const router = express.Router();

router.use(protect);

router.get("/transactions", getPaymentTransactions);

module.exports = router;
