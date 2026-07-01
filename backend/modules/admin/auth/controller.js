const jwt    = require("jsonwebtoken");
const path   = require("path");
const crypto = require("crypto");
const { validationResult } = require("express-validator");
const SystemUser        = require("../../../modules/systemUsers.model");
const SystemUserSession = require("./session.model");
const SystemUserOtp     = require("./otp.model");
const { sendEmail }     = require("../../../utils/emailService");

const POPULATE_ROLE    = "name permissions isActive";
const EXCLUDE_PASSWORD = "-profile.password";

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure:   process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
  maxAge:   7 * 24 * 60 * 60 * 1000,
};

const TEMPLATES = {
  forgotPassword:  path.join(__dirname, "templates", "forgot-password.html"),
  passwordChanged: path.join(__dirname, "templates", "password-changed.html"),
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
  if (!errors.isEmpty()) {
    const grouped = {};
    errors.array().forEach(({ path, msg }) => {
      grouped[path] = grouped[path] ? `${grouped[path]}, ${msg}` : msg;
    });
    const message = Object.values(grouped).join(" | ");
    return res.status(400).json({ success: false, message });
  }

  const { name, email, password, role, isSuperAdmin } = req.body;

  try {
    const exists = await SystemUser.findOne({ "profile.email": email });
    if (exists)
      return res.status(409).json({ success: false, message: "Email already registered" });

    const admin = await SystemUser.create({
      profile:      { name, email, password },
      role:         role || undefined,
      isSuperAdmin: isSuperAdmin ?? false,
    });
    await admin.populate("role", "name permissions isActive");

    res.status(201).json({
      success: true,
      data: {
        userId:       admin._id,
        name:         admin.profile.name,
        email:        admin.profile.email,
        role:         admin.role,
        isSuperAdmin: admin.isSuperAdmin,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Login ─────────────────────────────────────────────────────────────────────
const login = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const grouped = {};
    errors.array().forEach(({ path, msg }) => {
      grouped[path] = grouped[path] ? `${grouped[path]}, ${msg}` : msg;
    });
    const message = Object.values(grouped).join(" | ");
    return res.status(400).json({ success: false, message });
  }

  const { email, password } = req.body;

  try {
    const admin = await SystemUser.findOne({ "profile.email": email }).populate("role", "name permissions isActive");
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
      data: {
        userId:       admin._id,
        name:         admin.profile.name,
        email:        admin.profile.email,
        role:         admin.role,
        isSuperAdmin: admin.isSuperAdmin,
      },
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
    const admin = await SystemUser.findOne({ "profile.email": email });
    if (!admin)
      return res.status(404).json({ success: false, message: "No account found with this email" });

    if (!admin.isActive)
      return res.status(403).json({ success: false, message: "Account is deactivated" });

    await SystemUserOtp.deleteMany({ userId: admin._id });

    const otp = generateOtp();
    await SystemUserOtp.create({ userId: admin._id, otp });

    await sendEmail({
      to:           admin.profile.email,
      subject:      "Your RealSquare Password Reset Code",
      templatePath: TEMPLATES.forgotPassword,
      variables:    { OTP: otp },
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
  if (!errors.isEmpty()) {
    const grouped = {};
    errors.array().forEach(({ path, msg }) => {
      grouped[path] = grouped[path] ? `${grouped[path]}, ${msg}` : msg;
    });
    const message = Object.values(grouped).join(" | ");
    return res.status(400).json({ success: false, message });
  }

  const { otp, newPassword } = req.body;

  try {
    const otpRecord = await SystemUserOtp.findOne({ otp });
    if (!otpRecord)
      return res.status(400).json({ success: false, message: "Invalid or expired OTP" });

    const admin = await SystemUser.findById(otpRecord.userId);
    if (!admin)
      return res.status(404).json({ success: false, message: "User not found" });

    admin.profile.password = newPassword;
    await admin.save();
    await otpRecord.deleteOne();

    await SystemUserSession.deleteMany({ userId: admin._id });

    await sendEmail({
      to:           admin.profile.email,
      subject:      "Your RealSquare Password Has Been Changed",
      templatePath: TEMPLATES.passwordChanged,
      variables: {
        NAME:       admin.profile.name,
        EMAIL:      admin.profile.email,
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
  if (!errors.isEmpty()) {
    const grouped = {};
    errors.array().forEach(({ path, msg }) => {
      grouped[path] = grouped[path] ? `${grouped[path]}, ${msg}` : msg;
    });
    const message = Object.values(grouped).join(" | ");
    return res.status(400).json({ success: false, message });
  }

  const { oldPassword, newPassword, confirmPassword } = req.body;

  if (newPassword !== confirmPassword)
    return res.status(400).json({ success: false, message: "New password and confirm password do not match" });

  try {
    const admin = await SystemUser.findById(req.user._id);

    if (!(await admin.matchPassword(oldPassword)))
      return res.status(401).json({ success: false, message: "Old password is incorrect" });

    if (oldPassword === newPassword)
      return res.status(400).json({ success: false, message: "New password must be different from old password" });

    admin.profile.password = newPassword;
    await admin.save();

    const currentToken = req.cookies?.admin_token || req.headers.authorization?.split(" ")[1];
    await SystemUserSession.deleteMany({ userId: admin._id, token: { $ne: currentToken } });

    await sendEmail({
      to:           admin.profile.email,
      subject:      "Your RealSquare Password Has Been Changed",
      templatePath: TEMPLATES.passwordChanged,
      variables: {
        NAME:       admin.profile.name,
        EMAIL:      admin.profile.email,
        CHANGED_AT: new Date().toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }),
        LOGIN_URL:  process.env.CLIENT_URL || "http://localhost:8080/login",
      },
    });

    res.json({ success: true, message: "Password changed successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Get All System Users ──────────────────────────────────────────────────────
const getUsers = async (req, res) => {
  try {
    const filter = {};
    if (req.query.isActive === "true")  filter.isActive = true;
    if (req.query.isActive === "false") filter.isActive = false;
    if (req.query.role)                filter.role = req.query.role;
    if (req.query.search) {
      filter.$or = [
        { "profile.name":  new RegExp(req.query.search.trim(), "i") },
        { "profile.email": new RegExp(req.query.search.trim(), "i") },
        { "profile.phone": new RegExp(req.query.search.trim(), "i") },
      ];
    }

    const users = await SystemUser.find(filter)
      .select(EXCLUDE_PASSWORD)
      .populate("role", POPULATE_ROLE)
      .sort({ createdAt: -1 });

    res.json({ success: true, data: users });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Get Single System User ────────────────────────────────────────────────────
const getUserById = async (req, res) => {
  try {
    const user = await SystemUser.findById(req.params.id)
      .select(EXCLUDE_PASSWORD)
      .populate("role", POPULATE_ROLE);

    if (!user)
      return res.status(404).json({ success: false, message: "User not found" });

    res.json({ success: true, data: user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Update System User ────────────────────────────────────────────────────────
const updateUser = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const grouped = {};
    errors.array().forEach(({ path, msg }) => {
      grouped[path] = grouped[path] ? `${grouped[path]}, ${msg}` : msg;
    });
    const message = Object.values(grouped).join(" | ");
    return res.status(400).json({ success: false, message });
  }

  try {
    if (req.body.profile?.email) {
      const exists = await SystemUser.findOne({ "profile.email": req.body.profile.email, _id: { $ne: req.params.id } });
      if (exists)
        return res.status(409).json({ success: false, message: "Email already in use" });
    }

    const user = await SystemUser.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).select(EXCLUDE_PASSWORD).populate("role", POPULATE_ROLE);

    if (!user)
      return res.status(404).json({ success: false, message: "User not found" });

    res.json({ success: true, data: user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Delete System User ────────────────────────────────────────────────────────
const deleteUser = async (req, res) => {
  try {
    if (req.params.id === req.user._id.toString())
      return res.status(400).json({ success: false, message: "You cannot delete your own account" });

    const user = await SystemUser.findByIdAndDelete(req.params.id);
    if (!user)
      return res.status(404).json({ success: false, message: "User not found" });

    await SystemUserSession.deleteMany({ userId: req.params.id });

    res.json({ success: true, message: "User deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Get Me (own profile) ──────────────────────────────────────────────────────
const getMyProfile = async (req, res) => {
  try {
    const user = await SystemUser.findById(req.user._id)
      .select(EXCLUDE_PASSWORD)
      .populate("role", POPULATE_ROLE);
    res.json({ success: true, data: user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Update My Profile ─────────────────────────────────────────────────────────
const updateMyProfile = async (req, res) => {
  try {
    // prevent role / isSuperAdmin escalation via this endpoint
    delete req.body.role;
    delete req.body.isSuperAdmin;
    if (req.body.profile) delete req.body.profile.password;

    if (req.body.profile?.email) {
      const exists = await SystemUser.findOne({ "profile.email": req.body.profile.email, _id: { $ne: req.user._id } });
      if (exists)
        return res.status(409).json({ success: false, message: "Email already in use" });
    }

    const user = await SystemUser.findByIdAndUpdate(
      req.user._id,
      req.body,
      { new: true, runValidators: true }
    ).select(EXCLUDE_PASSWORD).populate("role", POPULATE_ROLE);

    res.json({ success: true, data: user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Change My Password ────────────────────────────────────────────────────────
const changeMyPassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword)
    return res.status(400).json({ success: false, message: "currentPassword and newPassword are required" });

  if (newPassword.length < 6)
    return res.status(400).json({ success: false, message: "New password must be at least 6 characters" });

  if (currentPassword === newPassword)
    return res.status(400).json({ success: false, message: "New password must be different from current password" });

  try {
    const user = await SystemUser.findById(req.user._id);

    if (!(await user.matchPassword(currentPassword)))
      return res.status(401).json({ success: false, message: "Current password is incorrect" });

    user.profile.password = newPassword;
    await user.save();

    const currentToken = req.cookies?.admin_token || req.headers.authorization?.split(" ")[1];
    await SystemUserSession.deleteMany({ userId: user._id, token: { $ne: currentToken } });

    res.json({ success: true, message: "Password changed successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  register, login, logout, getMe, sendOtp, forgotPassword, changePassword,
  getUsers, getUserById, updateUser, deleteUser,
  getMyProfile, updateMyProfile, changeMyPassword,
};
