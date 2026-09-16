const express = require("express");
const { getAll, getForSell, getForRent, getForPG } = require("./controller");
const adminAuthMiddleware = require("../../../middleware/auth").protect;

const router = express.Router();

router.use(adminAuthMiddleware);

router.get("/",         getAll);
router.get("/for-sell", getForSell);
router.get("/for-rent", getForRent);
router.get("/for-pg",   getForPG);

module.exports = router;
