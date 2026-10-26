const express = require("express");
const { protect } = require("../../../middleware/auth");
const { uploadImage } = require("../../../utils/upload");
const { getAll, create, update, reorder, remove } = require("./controller");
const { createIdealForValidator, updateIdealForValidator } = require("./validator");

const router = express.Router();
router.use(protect);
router.get("/", getAll);
router.post("/", uploadImage.single("image"), createIdealForValidator, create);
router.put("/:id", uploadImage.single("image"), updateIdealForValidator, update);
router.patch("/:id/reorder", reorder);
router.delete("/:id", remove);

module.exports = router;
