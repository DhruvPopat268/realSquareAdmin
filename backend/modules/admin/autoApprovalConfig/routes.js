const express = require("express");
const { getAll, upsertConfig } = require("./controller");
const { protect } = require("../../../middleware/auth");

const router = express.Router();

router.use(protect);

router.get("/",   getAll);
router.patch("/", upsertConfig);

module.exports = router;
