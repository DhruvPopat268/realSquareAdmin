const express = require("express");
const { getAll, getById, getListingUserRoles, approve, reject } = require("./controller");
const adminAuthMiddleware = require("../../../middleware/auth").protect;

const router = express.Router();

router.use(adminAuthMiddleware);

router.get("/listing-user-roles",    getListingUserRoles);
router.get("/",                      getAll);
router.get("/:id",                   getById);
router.patch("/:id/approve",         approve);
router.patch("/:id/reject",          reject);

module.exports = router;
