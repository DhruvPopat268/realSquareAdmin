const express = require("express");
const { register, login, logout, getMe, sendOtp, forgotPassword, changePassword } = require("./controller");
const { registerValidator, loginValidator, forgotPasswordValidator, changePasswordValidator } = require("./validator");
const { protect } = require("../../../middleware/auth");

const router = express.Router();

router.post("/register",         registerValidator,       register);
router.post("/login",            loginValidator,          login);
router.post("/logout",           protect,                 logout);
router.get("/me",                protect,                 getMe);
router.post("/send-otp",                                  sendOtp);
router.post("/forgot-password",  forgotPasswordValidator, forgotPassword);
router.post("/change-password",  changePasswordValidator, protect, changePassword);

module.exports = router;
