const express = require("express");
const { getOwners, createOwner, updateOwner, updateOwnerStatus, deleteOwner } = require("./controller");
const { protect } = require("../../../middleware/auth");
const { uploadImage } = require("../../../utils/upload");

const router = express.Router();

router.get("/",             protect, getOwners);
router.post("/",            protect, uploadImage.fields([{ name: "profilePhoto", maxCount: 1 }, { name: "businessLogo", maxCount: 1 }]), createOwner);
router.put("/:id",          protect, uploadImage.fields([{ name: "profilePhoto", maxCount: 1 }, { name: "businessLogo", maxCount: 1 }]), updateOwner);
router.patch("/:id/status", protect, updateOwnerStatus);
router.delete("/:id",       protect, deleteOwner);

module.exports = router;
