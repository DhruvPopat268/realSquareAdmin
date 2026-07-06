const express = require("express");
const { getBuilders, createBuilder, updateBuilder, updateBuilderStatus, deleteBuilder } = require("./controller");
const { protect } = require("../../../middleware/auth");
const { uploadImage } = require("../../../utils/upload");

const router = express.Router();

router.get("/",             protect, getBuilders);
router.post("/",            protect, uploadImage.array("profilePhoto", 1), createBuilder);
router.put("/:id",          protect, uploadImage.array("profilePhoto", 1), updateBuilder);
router.patch("/:id/status", protect, updateBuilderStatus);
router.delete("/:id",       protect, deleteBuilder);

module.exports = router;
