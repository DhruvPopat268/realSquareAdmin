const express  = require("express");
const { create, uploadMedia, getActiveFurnishingsAndAmenities, getActivePropertyCategories, getActivePropertyPurposes, getActivePropertyTypes } = require("./controller");
const { createListingValidator }        = require("./validator");
const { userProtect }                   = require("../../../middleware/userAuth");
const { uploadImage }                   = require("../../../utils/upload");

const router = express.Router();

router.use(userProtect);

router.get("/active-furnishings-amenities", getActiveFurnishingsAndAmenities);
router.get("/active-categories",     getActivePropertyCategories);
router.get("/active-purposes",       getActivePropertyPurposes);
router.get("/active-property-types", getActivePropertyTypes);

router.post("/",           createListingValidator, create);
router.post("/media",  uploadImage.array("images", 20), uploadMedia);

module.exports = router;
