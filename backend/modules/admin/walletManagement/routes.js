const express                      = require("express");
const { getPaymentTransactions, generateAdminInvoice } = require("./controller");
const { protect }                  = require("../../../middleware/auth");

const router = express.Router();

router.use(protect);

router.get("/transactions", getPaymentTransactions);
router.post("/transactions/:transactionId/generate-invoice", generateAdminInvoice);

module.exports = router;
