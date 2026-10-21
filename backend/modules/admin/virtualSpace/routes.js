const express = require("express");
const {
  getVirtualSpaces,
  createVirtualSpace,
  updateVirtualSpace,
  deleteVirtualSpace,
} = require("./controller");
const {
  createVirtualSpaceValidator,
  updateVirtualSpaceValidator,
} = require("./validator");
const { protect } = require("../../../middleware/auth");

const router = express.Router();

router.use(protect);

router.get("/", getVirtualSpaces);
router.post("/", createVirtualSpaceValidator, createVirtualSpace);
router.put("/:id", updateVirtualSpaceValidator, updateVirtualSpace);
router.delete("/:id", deleteVirtualSpace);

module.exports = router;
