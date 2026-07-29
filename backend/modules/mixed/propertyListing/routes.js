const express  = require("express");
const { create, uploadMedia, getActivePropertyCategories, getActivePropertyPurposes, getActivePropertyTypes, getActiveCities } = require("./controller");
const { createListingValidator }        = require("./validator");
const { userProtect }                   = require("../../../middleware/userAuth");
const { uploadImage }                   = require("../../../utils/upload");

const router = express.Router();

router.get("/active-categories",     getActivePropertyCategories);
router.get("/active-purposes",       getActivePropertyPurposes);
router.get("/active-property-types", getActivePropertyTypes);
router.get("/active-cities",         getActiveCities);

router.use(userProtect);

router.post("/",           createListingValidator, create);
router.post("/:id/media",  uploadImage.array("images", 20), uploadMedia);

module.exports = router;
