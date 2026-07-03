const express            = require("express");
const { completeProfile, sendOtp, verifyOtp, logout, updateProfile, deleteAccount, sendChangeMobileOtp, verifyChangeMobileOtp, getMe } = require("./systemUsers.controller");
const { uploadImage }    = require("../utils/upload");
const { protect }        = require("../middleware/auth");

const router = express.Router();

router.get("/me",                        protect, getMe);
router.post("/send-otp",                 sendOtp);

router.post("/verify-otp",           verifyOtp);
router.post("/logout",               logout);
router.post("/complete-profile",     protect, uploadImage.any(), completeProfile);
router.put("/update-profile",        protect, uploadImage.any(), updateProfile);
router.post("/send-change-mobile-otp",   protect, sendChangeMobileOtp);
router.post("/verify-change-mobile-otp", protect, verifyChangeMobileOtp);
router.delete("/delete-account",         protect, deleteAccount);

module.exports = router;
