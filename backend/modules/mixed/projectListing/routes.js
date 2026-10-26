const express = require("express");
const { userProtect } = require("../../../middleware/userAuth");
const { uploadImage } = require("../../../utils/upload");
const { create, uploadMedia, getActiveIdealFor } = require("./controller");
const { projectListingValidator } = require("./validator");

const router = express.Router();

router.get("/ideal-for", userProtect, getActiveIdealFor);
router.post("/", userProtect, projectListingValidator, create);
router.post("/media", userProtect, uploadImage.array("images", 20), uploadMedia);

module.exports = router;

