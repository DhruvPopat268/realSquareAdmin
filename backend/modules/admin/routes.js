const express = require("express");

const authRoutes                = require("./auth/routes");
const statesRoutes              = require("./states/routes");
const citiesRoutes              = require("./cities/routes");
const propertyPurposesRoutes    = require("./propertyPurposes/routes");
const propertyCategoriesRoutes  = require("./propertyCategories/routes");
const propertyTypesRoutes       = require("./propertyTypes/routes");
const systemUsersRolesRoutes    = require("./systemUsersRoles/routes");
const plansManagementRoutes     = require("./plansManagement/routes");
const coinsOffersRoutes          = require("./coinsOffersManagement/routes");
const coinsTransactionsRoutes    = require("./coinsTransactions/routes");
const purchasedPlansRoutes       = require("./purchasedPlans/routes");
const walletManagementRoutes     = require("./walletManagement/routes");
// add more admin feature routes here as you build them
// const propertyRoutes = require("./property/routes");
// const leadRoutes     = require("./lead/routes");

const router = express.Router();

router.use("/auth",                authRoutes);
router.use("/states",              statesRoutes);
router.use("/cities",              citiesRoutes);
router.use("/property-purposes",   propertyPurposesRoutes);
router.use("/property-categories", propertyCategoriesRoutes);
router.use("/property-types",      propertyTypesRoutes);
router.use("/system-users-roles",  systemUsersRolesRoutes);
router.use("/plans",               plansManagementRoutes);
router.use("/coins-offers",        coinsOffersRoutes);
router.use("/coins-transactions",  coinsTransactionsRoutes);
router.use("/purchased-plans",     purchasedPlansRoutes);
router.use("/wallet",              walletManagementRoutes);
// router.use("/properties", propertyRoutes);
// router.use("/leads",      leadRoutes);

module.exports = router;
