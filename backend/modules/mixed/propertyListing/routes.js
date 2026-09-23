const express  = require("express");
const { canList, create, uploadMedia, appendMedia, updateListing, getActiveFurnishingsAndAmenities, getActivePropertyCategories, getActivePropertyPurposes, getActivePropertyTypes, getMyListings, getListingById, markInactive, markActive, markSold, markRented } = require("./controller");
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
router.patch("/",     userProtect, updateListing); // PATCH with ID in body
router.post("/media", userProtect, uploadImage.array("images", 20), uploadMedia);
router.patch("/media", userProtect, uploadImage.array("images", 20), appendMedia); // PATCH with ID in body for media upload

// ── Status transition routes (must be before /:id wildcard) ─────────────────
router.patch("/mark-inactive/:id", userProtect, markInactive);
router.patch("/mark-active/:id",   userProtect, markActive);
router.patch("/mark-sold/:id",     userProtect, markSold);
router.patch("/mark-rented/:id",   userProtect, markRented);

// ── Must be last to avoid swallowing named routes above ──────────────────────
router.get   ("/:id",        userProtect, getListingById);
router.post  ("/:id/media",  userProtect, uploadImage.array("images", 20), appendMedia);

module.exports = router;
