const express                  = require("express");
const purchaseCoinsRoutes      = require("./purchaseCoins/routes");
const coinsTransactionsRoutes  = require("./coinsTransactions/routes");
const transactionsRoutes       = require("./transactions/routes");

const router = express.Router();

router.use("/purchase-coins",      purchaseCoinsRoutes);
router.use("/coins-transactions",  coinsTransactionsRoutes);
router.use("/transactions",        transactionsRoutes);

module.exports = router;
