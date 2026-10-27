const express            = require("express");
const { completeProfile, assignCustomerRole, sendEmailOtp, verifyEmailOtp, sendOtp, verifyOtp, logout, updateProfile, switchRole, getMe, getActiveUsers, expirePurchasedPlans, consumePurchasedPlans } = require("./systemUsers.controller");
const { uploadImage }    = require("../utils/upload");
const cronProtect = require("../utils/cronProtect");
const { userProtect } = require("../middleware/userAuth");

const router = express.Router();

router.get("/me",                        userProtect, getMe);
router.get("/cron-expire-plans",         cronProtect, expirePurchasedPlans);
router.get("/cron-consume-plans",        cronProtect, consumePurchasedPlans);
router.get("/active-users",              getActiveUsers);
router.post("/send-otp",                 sendOtp);

router.post("/verify-otp",           verifyOtp);
router.post("/logout",               logout);
router.post("/complete-profile",     userProtect, uploadImage.any(), completeProfile);
router.post("/assign-customer-role", userProtect, assignCustomerRole);
router.post("/send-email-otp",       userProtect, sendEmailOtp);
router.post("/verify-email-otp",     userProtect, verifyEmailOtp);
router.put("/update-profile",        userProtect, uploadImage.any(), updateProfile);
router.post("/switch-role",               userProtect, switchRole);

module.exports = router;
