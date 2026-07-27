const express  = require("express");
const { create, uploadMedia, getActivePropertyCategories } = require("./controller");
const { createListingValidator }        = require("./validator");
const { userProtect }                   = require("../../../middleware/userAuth");
const { uploadImage }                   = require("../../../utils/upload");

const router = express.Router();

router.get("/active-categories", getActivePropertyCategories);

router.use(userProtect);

router.post("/",           createListingValidator, create);
router.post("/:id/media",  uploadImage.array("images", 20), uploadMedia);

module.exports = router;
