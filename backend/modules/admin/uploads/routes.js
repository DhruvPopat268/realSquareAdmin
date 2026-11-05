const express = require("express");
const { protect } = require("../../../middleware/auth");
const { uploadImage, getUploadSizeErrorMessage } = require("../../../utils/upload");
const { uploadImageFile } = require("./controller");

const router = express.Router();
const parseSingleImage = uploadImage.single("image");

const handleSingleImageUpload = (req, res, next) => {
  parseSingleImage(req, res, (error) => {
    if (!error) return next();

    const tooLarge = error.code === "LIMIT_FILE_SIZE";
    return res.status(tooLarge ? 413 : 400).json({
      success: false,
      message: tooLarge ? getUploadSizeErrorMessage("image") : error.message,
    });
  });
};

router.post("/image", protect, handleSingleImageUpload, uploadImageFile);

module.exports = router;
