const express = require("express");
const { getConfig, updateConfig } = require("./controller");
const { protect } = require("../../../middleware/auth");

const router = express.Router();

router.use(protect);

router.get("/",  getConfig);
router.put("/",  updateConfig);

module.exports = router;
