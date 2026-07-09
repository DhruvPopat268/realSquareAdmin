const express                  = require("express");
const purchaseCoinsRoutes      = require("./purchaseCoins/routes");
const coinsTransactionsRoutes  = require("./coinsTransactions/routes");

const router = express.Router();

router.use("/purchase-coins",      purchaseCoinsRoutes);
router.use("/coins-transactions",  coinsTransactionsRoutes);

module.exports = router;
