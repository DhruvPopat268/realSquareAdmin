const express = require("express");
const {
  register, login, logout, getMe, sendOtp, forgotPassword, changePassword,
  getUsers, getUserById, updateUser, deleteUser,
  getMyProfile, updateMyProfile, changeMyPassword,
} = require("./controller");
const {
  registerValidator, loginValidator, forgotPasswordValidator,
  changePasswordValidator, updateUserValidator,
} = require("./validator");
const { protect } = require("../../../middleware/auth");

const router = express.Router();

// ── Auth ──────────────────────────────────────────────────────────────────────
router.post("/register",        registerValidator,       register);
router.post("/login",           loginValidator,          login);
router.post("/logout",          protect,                 logout);
router.get("/me",               protect,                 getMe);
router.post("/send-otp",                                 sendOtp);
router.post("/forgot-password", forgotPasswordValidator, forgotPassword);
router.post("/change-password", changePasswordValidator, protect, changePassword);

// ── Own profile ───────────────────────────────────────────────────────────────
router.get("/system-users/me",              protect, getMyProfile);
router.patch("/system-users/me",            protect, updateMyProfile);
router.patch("/system-users/me/change-password", protect, changeMyPassword);

// ── System users CRUD (admin) ─────────────────────────────────────────────────
router.get("/system-users",      protect, getUsers);
router.get("/system-users/:id",  protect, getUserById);
router.put("/system-users/:id",  protect, updateUserValidator, updateUser);
router.delete("/system-users/:id", protect, deleteUser);

module.exports = router;
