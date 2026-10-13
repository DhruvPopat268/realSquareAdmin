const express                        = require("express");
const { getPaymentTransactions,
        generateInvoiceController }  = require("./controller");
const { generateInvoiceValidator }   = require("./validator");
const { userProtect }                = require("../../../middleware/userAuth");

const router = express.Router();

router.use(userProtect);

router.get("/",                getPaymentTransactions);
router.post("/generate-invoice", generateInvoiceValidator, generateInvoiceController);

module.exports = router;
