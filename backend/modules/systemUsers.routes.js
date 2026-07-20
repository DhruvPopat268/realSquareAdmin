const express            = require("express");
const { completeProfile, sendOtp, verifyOtp, logout, updateProfile, deleteAccount, sendChangeMobileOtp, verifyChangeMobileOtp, getMe, getActiveUsers } = require("./systemUsers.controller");
const { uploadImage }    = require("../utils/upload");
const { userProtect } = require("../middleware/userAuth");

const router = express.Router();

router.get("/me",                        userProtect, getMe);
router.get("/active-users",              getActiveUsers);
router.post("/send-otp",                 sendOtp);

router.post("/verify-otp",           verifyOtp);
router.post("/logout",               logout);
router.post("/complete-profile",     userProtect, uploadImage.any(), completeProfile);
router.put("/update-profile",        userProtect, uploadImage.any(), updateProfile);
router.post("/send-change-mobile-otp",   userProtect, sendChangeMobileOtp);
router.post("/verify-change-mobile-otp", userProtect, verifyChangeMobileOtp);
router.delete("/delete-account",         userProtect, deleteAccount);

module.exports = router;
