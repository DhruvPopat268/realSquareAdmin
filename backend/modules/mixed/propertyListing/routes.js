const express  = require("express");
const { canList, create, uploadMedia, appendMedia, updateListing, updateMedia, getActiveFurnishingsAndAmenities, getActivePropertyCategories, getActivePropertyPurposes, getActivePropertyTypes, getMyListings, getListingById, markInactive, markActive, markSold, markRented, get6MonthInactiveProperties, get1YearInactiveProperties } = require("./controller");
const { createListingValidator }        = require("./validator");
const { userProtect }                   = require("../../../middleware/userAuth");
const { uploadImage, handlePropertyMediaUpload } = require("../../../utils/upload");

const router = express.Router();

const cronProtect = (req, res, next) => {
  const secret = req.headers["x-cron-secret"];
  if (!secret || secret !== process.env.CRONJOB_SECRET) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }
  next();
};

// ── Protected routes (auth required) ─────────────────────────────────────────
// These must be declared before the /:id wildcard so they are not swallowed.
router.get("/can-list",                     userProtect, canList);
router.get("/active-furnishings-amenities", userProtect, getActiveFurnishingsAndAmenities);
router.get("/active-categories",            userProtect, getActivePropertyCategories);
router.get("/active-purposes",              userProtect, getActivePropertyPurposes);
router.get("/active-property-types",        userProtect, getActivePropertyTypes);
router.get("/my-listings",                  userProtect, getMyListings);
router.get("/cron-6-month-inactive",         cronProtect, get6MonthInactiveProperties);
router.get("/cron-1-year-inactive",          cronProtect, get1YearInactiveProperties);

router.post("/",      userProtect, createListingValidator, create);
router.patch("/",     userProtect, updateListing); // PATCH with ID in body
router.post("/media", userProtect, uploadImage.array("images", 20), uploadMedia);
router.patch("/media", userProtect, handlePropertyMediaUpload, updateMedia); // image, video, and reel media update

// ── Status transition routes (must be before /:id wildcard) ─────────────────
router.patch("/mark-inactive/:id", userProtect, markInactive);
router.patch("/mark-active/:id",   userProtect, markActive);
router.patch("/mark-sold/:id",     userProtect, markSold);
router.patch("/mark-rented/:id",   userProtect, markRented);

// ── Must be last to avoid swallowing named routes above ──────────────────────
router.get   ("/:id",        userProtect, getListingById);
router.post  ("/:id/media",  userProtect, uploadImage.array("images", 20), appendMedia);

module.exports = router;
