const express                  = require("express");
const purchaseCoinsRoutes      = require("./purchaseCoins/routes");
const purchasedPlansRoutes     = require("./purchasedPlans/routes");
const coinsTransactionsRoutes  = require("./coinsTransactions/routes");
const transactionsRoutes       = require("./transactions/routes");
const propertyListingRoutes    = require("./propertyListing/routes");

const router = express.Router();

router.use("/purchase-coins",      purchaseCoinsRoutes);
router.use("/purchased-plans",     purchasedPlansRoutes);
router.use("/coins-transactions",  coinsTransactionsRoutes);
router.use("/transactions",        transactionsRoutes);
router.use("/property-listings",   propertyListingRoutes);

module.exports = router;
