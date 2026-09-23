const express          = require("express");
const { verifyReraId } = require("./controller");
const { userProtect }  = require("../../../middleware/userAuth");

const router = express.Router();

// POST /api/mixed/rera/verify
router.post("/verify", userProtect, verifyReraId);

module.exports = router;
