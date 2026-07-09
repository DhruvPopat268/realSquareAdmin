const express                    = require("express");
const { getPaymentTransactions } = require("./controller");
const { userProtect }            = require("../../../middleware/userAuth");

const router = express.Router();

router.use(userProtect);

router.get("/", getPaymentTransactions);

module.exports = router;
