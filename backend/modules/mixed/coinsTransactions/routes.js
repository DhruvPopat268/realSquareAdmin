const express                = require("express");
const { getCoinsTransactions } = require("./controller");
const { userProtect }        = require("../../../middleware/userAuth");

const router = express.Router();

router.use(userProtect);

router.get("/", getCoinsTransactions);

module.exports = router;
