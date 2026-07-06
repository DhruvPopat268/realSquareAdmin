const express = require("express");
const { getOwners, updateOwner, updateOwnerStatus, deleteOwner } = require("./controller");
const { protect } = require("../../../middleware/auth");
const { uploadImage } = require("../../../utils/upload");

const router = express.Router();

router.get("/",             protect, getOwners);
router.put("/:id",          protect, uploadImage.array("businessLogo", 1), updateOwner);
router.patch("/:id/status", protect, updateOwnerStatus);
router.delete("/:id",       protect, deleteOwner);

module.exports = router;
