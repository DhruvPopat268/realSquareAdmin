const express = require("express");
const { userProtect } = require("../../../middleware/userAuth");
const { uploadImage, handleProjectMediaUpload } = require("../../../utils/upload");
const { create, uploadMedia, updateProject, updateProjectStatus, updateProjectAvailableUnits, updateMedia, getActiveIdealFor, getMyListings, getProjectById, downloadOwnProjectQrImage } = require("./controller");
const { projectListingValidator } = require("./validator");

const router = express.Router();

router.get("/ideal-for", userProtect, getActiveIdealFor);
router.get("/my-listings", userProtect, getMyListings);
router.get("/:id/qr-image", userProtect, downloadOwnProjectQrImage);
router.patch("/status/:id", userProtect, updateProjectStatus);
router.patch("/available-units/:id", userProtect, updateProjectAvailableUnits);
router.get("/:id", userProtect, getProjectById);
router.post("/", userProtect, projectListingValidator, create);
router.patch("/", userProtect, updateProject);
router.post("/media", userProtect, uploadImage.array("images", 20), uploadMedia);
router.patch("/media", userProtect, handleProjectMediaUpload, updateMedia);

module.exports = router;

