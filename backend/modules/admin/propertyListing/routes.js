const express = require("express");
const { getAll, getById, getListingUserRoles, approve, reject, adminMarkInactive, adminMarkActive, adminMarkSold, adminMarkRented, getMapPins } = require("./controller");
const adminAuthMiddleware = require("../../../middleware/auth").protect;

const router = express.Router();

router.use(adminAuthMiddleware);

router.get("/listing-user-roles",      getListingUserRoles);
router.get("/map-pins",                getMapPins);
router.get("/",                        getAll);
router.get("/:id",                     getById);
router.patch("/:id/approve",           approve);
router.patch("/:id/reject",            reject);
router.patch("/mark-inactive/:id",     adminMarkInactive);
router.patch("/mark-active/:id",       adminMarkActive);
router.patch("/mark-sold/:id",         adminMarkSold);
router.patch("/mark-rented/:id",       adminMarkRented);

module.exports = router;
