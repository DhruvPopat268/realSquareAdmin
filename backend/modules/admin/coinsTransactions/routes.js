const express                  = require("express");
const { getCoinsTransactions } = require("./controller");
const { protect }              = require("../../../middleware/auth");

const router = express.Router();

router.use(protect);

router.get("/", getCoinsTransactions);

module.exports = router;
