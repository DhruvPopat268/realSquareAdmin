const express             = require("express");
const purchaseCoinsRoutes = require("./purchaseCoins/routes");

const router = express.Router();

router.use("/purchase-coins", purchaseCoinsRoutes);

module.exports = router;
