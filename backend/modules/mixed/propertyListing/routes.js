const express  = require("express");
const { canList, create, uploadMedia, getActiveFurnishingsAndAmenities, getActivePropertyCategories, getActivePropertyPurposes, getActivePropertyTypes, getMyListings, getListingById } = require("./controller");
const { createListingValidator }        = require("./validator");
const { userProtect }                   = require("../../../middleware/userAuth");
const { uploadImage }                   = require("../../../utils/upload");

const router = express.Router();

// ── Protected routes (auth required) ─────────────────────────────────────────
// These must be declared before the /:id wildcard so they are not swallowed.
router.get("/can-list",                     userProtect, canList);
router.get("/active-furnishings-amenities", userProtect, getActiveFurnishingsAndAmenities);
router.get("/active-categories",            userProtect, getActivePropertyCategories);
router.get("/active-purposes",              userProtect, getActivePropertyPurposes);
router.get("/active-property-types",        userProtect, getActivePropertyTypes);
router.get("/my-listings",                  userProtect, getMyListings);

router.post("/",      userProtect, createListingValidator, create);
router.post("/media", userProtect, uploadImage.array("images", 20), uploadMedia);

// ── Must be last to avoid swallowing named routes above ──────────────────────
router.get("/:id", userProtect, getListingById);

module.exports = router;
