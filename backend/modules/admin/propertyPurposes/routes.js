const express = require("express");
const { getPurposes, createPurpose, updatePurpose, deletePurpose, reorderPurpose } = require("./controller");
const { createPurposeValidator, updatePurposeValidator } = require("./validator");
const { protect } = require("../../../middleware/auth");

const router = express.Router();

router.use(protect);

router.get("/",       getPurposes);
router.post("/",      createPurposeValidator, createPurpose);
router.put("/:id",          updatePurposeValidator, updatePurpose);
router.patch("/:id/reorder", reorderPurpose);
router.delete("/:id",       deletePurpose);

module.exports = router;
