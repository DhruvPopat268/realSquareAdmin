const express = require("express");
const { getBrokers, createBroker, updateBroker, updateBrokerStatus, deleteBroker } = require("./controller");
const { protect } = require("../../../middleware/auth");
const { uploadImage } = require("../../../utils/upload");

const router = express.Router();

router.get("/",             protect, getBrokers);
router.post("/",            protect, uploadImage.array("profilePhoto", 1), createBroker);
router.put("/:id",          protect, uploadImage.array("profilePhoto", 1), updateBroker);
router.patch("/:id/status", protect, updateBrokerStatus);
router.delete("/:id",       protect, deleteBroker);

module.exports = router;
