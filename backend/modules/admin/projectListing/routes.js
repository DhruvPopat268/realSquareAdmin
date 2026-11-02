const express = require("express");
const { getAll, getMapPins, getById, approve, reject, updateStatus, updateAvailableUnits } = require("./controller");
const adminAuthMiddleware = require("../../../middleware/auth").protect;

const router = express.Router();
router.use(adminAuthMiddleware);

router.get("/", getAll);
router.get("/map-pins", getMapPins);
router.get("/:id", getById);
router.patch("/:id/approve", approve);
router.patch("/:id/reject", reject);
router.patch("/:id/status", updateStatus);
router.patch("/:id/available-units", updateAvailableUnits);

module.exports = router;
