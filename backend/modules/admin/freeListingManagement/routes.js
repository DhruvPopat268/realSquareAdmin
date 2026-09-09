const express = require("express");
const { getConfig, upsertConfig } = require("./controller");
const { protect } = require("../../../middleware/auth");

const router = express.Router();

router.use(protect);

router.get("/",  getConfig);
router.put("/",  upsertConfig);

module.exports = router;
