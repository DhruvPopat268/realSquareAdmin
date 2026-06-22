const jwt    = require("jsonwebtoken");
const path   = require("path");
const crypto = require("crypto");
const { validationResult } = require("express-validator");
const SystemUser        = require("./model");
const SystemUserSession = require("./session.model");
const SystemUserOtp     = require("./otp.model");
const { sendEmail }     = require("../../../utils/emailService");

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure:   process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
  maxAge:   7 * 24 * 60 * 60 * 1000,
};

const TEMPLATES = {
  forgotPassword:   path.join(__dirname, "templates", "forgot-password.html"),
  passwordChanged:  path.join(__dirname, "templates", "password-changed.html"),
};

const generateToken = (id) =>
  jwt.sign({ id, type: "admin" }, process.env.ADMIN_JWT_SECRET, {
    expiresIn: process.env.ADMIN_JWT_EXPIRES_IN,
  });

const generateOtp = () =>
  crypto.randomInt(100000, 999999).toString();

// ── Register ──────────────────────────────────────────────────────────────────
const register = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(400).json({ success: false, errors: errors.array() });

  const { name, email, password } = req.body;

  try {
    const exists = await SystemUser.findOne({ email });
    if (exists)
      return res.status(409).json({ success: false, message: "Email already registered" });

    const admin = await SystemUser.create({ name, email, password });

    res.status(201).json({
      success: true,
      data: { userId: admin._id, name: admin.name, email: admin.email, role: admin.role },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Login ─────────────────────────────────────────────────────────────────────
const login = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(400).json({ success: false, errors: errors.array() });

  const { email, password } = req.body;

  try {
    const admin = await SystemUser.findOne({ email });
    if (!admin || !(await admin.matchPassword(password)))
      return res.status(401).json({ success: false, message: "Invalid email or password" });

    if (!admin.isActive)
      return res.status(403).json({ success: false, message: "Account is deactivated" });

    const maxSessions = parseInt(process.env.ADMIN_MAX_SESSIONS) || 3;
    const sessionCount = await SystemUserSession.countDocuments({ userId: admin._id });

    if (sessionCount >= maxSessions) {
      const oldest = await SystemUserSession.findOne({ userId: admin._id }).sort({ createdAt: 1 });
      if (oldest) await oldest.deleteOne();
    }

    const token = generateToken(admin._id);
    await SystemUserSession.create({ userId: admin._id, token });

    // update last login
    await SystemUser.findByIdAndUpdate(admin._id, { lastLogin: new Date() });

    res.cookie("admin_token", token, COOKIE_OPTIONS);

    res.json({
      success: true,
      data: { userId: admin._id, name: admin.name, email: admin.email, role: admin.role },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Logout ────────────────────────────────────────────────────────────────────
const logout = async (req, res) => {
  try {
    const token = req.cookies?.admin_token || req.headers.authorization?.split(" ")[1];
    if (token) await SystemUserSession.findOneAndDelete({ token });
    res.clearCookie("admin_token");
    res.json({ success: true, message: "Logged out successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Get Me ────────────────────────────────────────────────────────────────────
const getMe = async (req, res) => {
  res.json({ success: true, data: req.user });
};

// ── Send OTP ──────────────────────────────────────────────────────────────────
// POST /api/admin/auth/send-otp  { email }
const sendOtp = async (req, res) => {
  const { email } = req.body;
  if (!email)
    return res.status(400).json({ success: false, message: "Email is required" });

  try {
    const admin = await SystemUser.findOne({ email });
    if (!admin)
      return res.status(404).json({ success: false, message: "No account found with this email" });

    if (!admin.isActive)
      return res.status(403).json({ success: false, message: "Account is deactivated" });

    // delete any existing OTP for this user
    await SystemUserOtp.deleteMany({ userId: admin._id });

    const otp = generateOtp();
    await SystemUserOtp.create({ userId: admin._id, otp });

    await sendEmail({
      to: admin.email,
      subject: "Your RealSquare Password Reset Code",
      templatePath: TEMPLATES.forgotPassword,
      variables: { OTP: otp },
    });

    res.json({ success: true, message: "OTP sent to your email" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Forgot Password ───────────────────────────────────────────────────────────
// POST /api/admin/auth/forgot-password  { otp, newPassword }
const forgotPassword = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(400).json({ success: false, errors: errors.array() });

  const { otp, newPassword } = req.body;

  try {
    const otpRecord = await SystemUserOtp.findOne({ otp });
    if (!otpRecord)
      return res.status(400).json({ success: false, message: "Invalid or expired OTP" });

    const admin = await SystemUser.findById(otpRecord.userId);
    if (!admin)
      return res.status(404).json({ success: false, message: "User not found" });

    admin.password = newPassword;
    await admin.save();
    await otpRecord.deleteOne();

    // revoke all sessions
    await SystemUserSession.deleteMany({ userId: admin._id });

    // send confirmation email
    await sendEmail({
      to: admin.email,
      subject: "Your RealSquare Password Has Been Changed",
      templatePath: TEMPLATES.passwordChanged,
      variables: {
        NAME:       admin.name,
        EMAIL:      admin.email,
        CHANGED_AT: new Date().toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }),
        LOGIN_URL:  process.env.CLIENT_URL || "http://localhost:8080/login",
      },
    });

    res.json({ success: true, message: "Password reset successfully. Please login again." });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Change Password ───────────────────────────────────────────────────────────
// POST /api/admin/auth/change-password  { oldPassword, newPassword, confirmPassword }  (protected)
const changePassword = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(400).json({ success: false, errors: errors.array() });

  const { oldPassword, newPassword, confirmPassword } = req.body;

  if (newPassword !== confirmPassword)
    return res.status(400).json({ success: false, message: "New password and confirm password do not match" });

  try {
    const admin = await SystemUser.findById(req.user._id);

    if (!(await admin.matchPassword(oldPassword)))
      return res.status(401).json({ success: false, message: "Old password is incorrect" });

    if (oldPassword === newPassword)
      return res.status(400).json({ success: false, message: "New password must be different from old password" });

    admin.password = newPassword;
    await admin.save();

    // revoke all other sessions except current
    const currentToken = req.cookies?.admin_token || req.headers.authorization?.split(" ")[1];
    await SystemUserSession.deleteMany({ userId: admin._id, token: { $ne: currentToken } });

    // send confirmation email
    await sendEmail({
      to: admin.email,
      subject: "Your RealSquare Password Has Been Changed",
      templatePath: TEMPLATES.passwordChanged,
      variables: {
        NAME:       admin.name,
        EMAIL:      admin.email,
        CHANGED_AT: new Date().toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }),
        LOGIN_URL:  process.env.CLIENT_URL || "http://localhost:8080/login",
      },
    });

    res.json({ success: true, message: "Password changed successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { register, login, logout, getMe, sendOtp, forgotPassword, changePassword };
