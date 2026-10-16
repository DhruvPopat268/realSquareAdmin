const express = require("express");
const {
  getActivePropertyCategories,
  getActivePropertyPurposes,
  getActivePropertyTypes,
} = require("./controller");

const router = express.Router();

router.get("/active-categories", getActivePropertyCategories);
router.get("/active-purposes", getActivePropertyPurposes);
router.get("/active-property-types", getActivePropertyTypes);

module.exports = router;
