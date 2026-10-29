const express = require("express");
const { getAll, getById, approve, reject, updateStatus } = require("./controller");
const adminAuthMiddleware = require("../../../middleware/auth").protect;

const router = express.Router();
router.use(adminAuthMiddleware);

router.get("/", getAll);
router.get("/:id", getById);
router.patch("/:id/approve", approve);
router.patch("/:id/reject", reject);
router.patch("/:id/status", updateStatus);

module.exports = router;
