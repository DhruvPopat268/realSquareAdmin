const express                  = require("express");
const purchaseCoinsRoutes      = require("./purchaseCoins/routes");
const purchasedPlansRoutes     = require("./purchasedPlans/routes");
const coinsTransactionsRoutes  = require("./coinsTransactions/routes");
const transactionsRoutes       = require("./transactions/routes");

const router = express.Router();

router.use("/purchase-coins",      purchaseCoinsRoutes);
router.use("/purchased-plans",     purchasedPlansRoutes);
router.use("/coins-transactions",  coinsTransactionsRoutes);
router.use("/transactions",        transactionsRoutes);

module.exports = router;
