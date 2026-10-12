const express                          = require("express");
const { getGstConfig, updateGstConfig } = require("./controller");
const { protect }                      = require("../../../middleware/auth");

const router = express.Router();

router.use(protect);

router.get("/",   getGstConfig);
router.patch("/", updateGstConfig);

module.exports = router;
