const express = require("express");
const {
  getActivePropertyCategories,
  getActivePropertyPurposes,
  getActivePropertyTypes,
} = require("./controller");
const {
  getPublicProfile,
  getPublicPropertyQrDetail,
  getPublicProjectQrDetail,
  getProfilePropertyDetail,
  getProfileProjectDetail,
} = require("./profileController");

const router = express.Router();

router.get("/active-categories", getActivePropertyCategories);
router.get("/active-purposes", getActivePropertyPurposes);
router.get("/active-property-types", getActivePropertyTypes);
router.get("/profile/:encryptedId", getPublicProfile);
router.get("/profile/:profileToken/property/:listingId", getProfilePropertyDetail);
router.get("/profile/:profileToken/project/:listingId", getProfileProjectDetail);
router.get("/property/:encryptedId", getPublicPropertyQrDetail);
router.get("/project/:encryptedId", getPublicProjectQrDetail);

module.exports = router;
