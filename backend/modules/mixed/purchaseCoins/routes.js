const express = require("express");
const { createCoinsOrder, cancelCoinsOrder, getActiveCoinsOffers } = require("./controller");
const { userProtect } = require("../../../middleware/userAuth");

const router = express.Router();

router.use(userProtect);

router.get("/offers",                           getActiveCoinsOffers);
router.post("/create-order",                    createCoinsOrder);
router.patch("/cancel/:transactionId",          cancelCoinsOrder);

module.exports = router;
