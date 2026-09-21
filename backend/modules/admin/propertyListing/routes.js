const express = require("express");
const { getAll, getById, getListingUserRoles } = require("./controller");
const adminAuthMiddleware = require("../../../middleware/auth").protect;

const router = express.Router();

router.use(adminAuthMiddleware);

router.get("/listing-user-roles", getListingUserRoles);
router.get("/",                   getAll);
router.get("/:id",                getById);

module.exports = router;