const SystemUser        = require("./systemUsers.model");
const SystemUserSession = require("./systemUsers.session.model");
const SystemUserOtp     = require("./systemUsers.otp.model");
const UserCoinsWallet   = require("./mixed/userCoinsWallet/model");
const PurchasedPlan     = require("./mixed/purchasedPlans/model");
const { toIST }         = require("../utils/dateTime");
const jwt               = require("jsonwebtoken");

const DUMMY_OTP = "123456";

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure:   process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
  maxAge:   7 * 24 * 60 * 60 * 1000,
};

const ALLOWED_ROLES = {
  [process.env.CUSTOMER_ROLE_ID]: "customerProfile",
  [process.env.OWNER_ROLE_ID]:    "ownerProfile",
  [process.env.BROKER_ROLE_ID]:   "brokerProfile",
  [process.env.BUILDER_ROLE_ID]:  "builderProfile",
};

const GST_ROLES    = [process.env.OWNER_ROLE_ID, process.env.BUILDER_ROLE_ID];
const GST_REGEX    = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
const MOBILE_REGEX = /^[0-9]{10}$/;
const OTP_REGEX    = /^[0-9]{6}$/;

const REQUIRED_FIELDS = {
  [process.env.CUSTOMER_ROLE_ID]: ["fullName", "email", "location.name", "location.latitude", "location.longitude", "bio"],
  [process.env.OWNER_ROLE_ID]:    ["fullName", "email", "businessDetails.name", "businessDetails.type", "businessDetails.gstNumber", "businessDetails.email", "businessDetails.mobile", "businessDetails.website"],
  [process.env.BROKER_ROLE_ID]:   ["fullName", "email", "yearsOfExperience", "agencyName", "bio"],
  [process.env.BUILDER_ROLE_ID]:  ["name", "email", "gstNumber", "cinNumber", "foundedYear", "totalProjectsDelivered", "location.name", "location.latitude", "location.longitude"],
};

const getNestedValue = (obj, path) => {
  if (obj[path] !== undefined) return obj[path];
  return path.split(".").reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : undefined), obj);
};

const MOBILE_OR_QUERY = (mobile) => [
  { mobile },
  ...Object.values(ALLOWED_ROLES).map((field) => ({ [`${field}.mobile`]: mobile })),
];

const fileByField = (files, name) => (files || []).find((f) => f.fieldname === name);

const toUrl = (filePath) =>
  `${process.env.BACKEND_URL}${filePath.replace("/var/www/storage", "/storage")}`;

const issueToken = async (userId) => {
  const maxSessions = parseInt(process.env.USER_MAX_SESSIONS) || 3;
  const sessionCount = await SystemUserSession.countDocuments({ userId });
  if (sessionCount >= maxSessions) {
    const oldest = await SystemUserSession.findOne({ userId }).sort({ createdAt: 1 });
    if (oldest) await oldest.deleteOne();
  }
  const token = jwt.sign({ id: userId }, process.env.USER_JWT_SECRET, {
    expiresIn: process.env.USER_JWT_EXPIRES_IN,
  });
  await SystemUserSession.create({ userId, token });
  await SystemUser.findByIdAndUpdate(userId, { lastLogin: new Date() });
  return token;
};

// ── Send OTP ──────────────────────────────────────────────────────────────────
// POST /api/system-users/send-otp  { mobile }
const sendOtp = async (req, res) => {
  const { mobile } = req.body;

  if (!mobile)
    return res.status(400).json({ success: false, message: "mobile is required" });

  if (!MOBILE_REGEX.test(mobile))
    return res.status(400).json({ success: false, message: "mobile must be exactly 10 digits" });

  try {
    let user = await SystemUser.findOne({ $or: MOBILE_OR_QUERY(mobile) });

    if (user && !user.isActive)
      return res.status(403).json({ success: false, message: "Account is deactivated" });

    if (!user)
      user = await SystemUser.create({ mobile, isActive: true });

    await SystemUserOtp.deleteMany({ userId: user._id });
    await SystemUserOtp.create({ userId: user._id, mobile, otp: DUMMY_OTP });

    // TODO: replace with real SMS OTP delivery
    res.json({ success: true, message: "OTP sent successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Verify OTP ────────────────────────────────────────────────────────────────
// POST /api/system-users/verify-otp  { mobile, otp }
const verifyOtp = async (req, res) => {
  const { mobile, otp } = req.body;

  if (!mobile || !otp)
    return res.status(400).json({ success: false, message: "mobile and otp are required" });

  if (!MOBILE_REGEX.test(mobile))
    return res.status(400).json({ success: false, message: "mobile must be exactly 10 digits" });

  if (!OTP_REGEX.test(otp))
    return res.status(400).json({ success: false, message: "otp must be exactly 6 digits" });

  try {
    const user = await SystemUser.findOne({ $or: MOBILE_OR_QUERY(mobile) })
      .populate("role", "name permissions isActive");

    if (!user)
      return res.status(404).json({ success: false, message: "No account found for this mobile" });

    if (!user.isActive)
      return res.status(403).json({ success: false, message: "Account is deactivated" });

    const otpRecord = await SystemUserOtp.findOne({ userId: user._id, otp });
    if (!otpRecord)
      return res.status(400).json({ success: false, message: "Invalid or expired OTP" });

    await otpRecord.deleteOne();

    const token = await issueToken(user._id);

    console.log("[VerifyOtp] Setting user_token cookie:", {
      userId:  user._id,
      env:     process.env.NODE_ENV,
      options: COOKIE_OPTIONS,
    });
    res.cookie("user_token", token, COOKIE_OPTIONS);
    console.log("[VerifyOtp] Cookie set successfully for userId:", user._id);

    res.json({ success: true, data: { token, isNew: !user.role } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Complete Profile (protected) ──────────────────────────────────────────────
// POST /api/system-users/complete-profile  (multipart/form-data)
const completeProfile = async (req, res) => {
  try {
    const { role, ...profileData } = req.body;

    if (!role)
      return res.status(400).json({ success: false, message: "role is required" });

    const profileField = ALLOWED_ROLES[role];
    if (!profileField)
      return res.status(403).json({ success: false, message: "This role is not allowed to self-register" });

    const existingProfile = Object.values(ALLOWED_ROLES).find((field) => req.user[field]?.mobile);
    if (existingProfile)
      return res.status(409).json({ success: false, message: "Profile already completed. Each user can only have one role profile." });

    const profilePhotoFile = fileByField(req.files, "profilePhoto");
    if (profilePhotoFile)
      profileData.profilePhoto = toUrl(profilePhotoFile.path);

    const businessLogoFile = fileByField(req.files, "businessLogo");
    if (businessLogoFile) {
      const existing = typeof profileData.businessDetails === "object" ? profileData.businessDetails : {};
      profileData.businessDetails = { ...existing, logo: toUrl(businessLogoFile.path) };
    }

    const requiredFields = REQUIRED_FIELDS[role] || [];
    const missingFields = requiredFields.filter((field) => {
      const val = getNestedValue(profileData, field);
      return val === undefined || val === null || val === "";
    });
    if (missingFields.length > 0)
      return res.status(400).json({ success: false, message: `Missing required fields: ${missingFields.join(", ")}` });

    if (!profileData.profilePhoto)
      return res.status(400).json({ success: false, message: "profilePhoto image is required" });

    if (profileData.email) {
      const exists = await SystemUser.findOne({ [`${profileField}.email`]: profileData.email, _id: { $ne: req.user._id } });
      if (exists)
        return res.status(409).json({ success: false, message: "Email already registered" });
    }

    if (GST_ROLES.includes(role) && profileData.gstNumber) {
      if (!GST_REGEX.test(profileData.gstNumber))
        return res.status(400).json({ success: false, message: "Invalid GST number format" });

      const exists = await SystemUser.findOne({ [`${profileField}.gstNumber`]: profileData.gstNumber, _id: { $ne: req.user._id } });
      if (exists)
        return res.status(409).json({ success: false, message: "GST number already registered" });
    }

    profileData.mobile = req.user.mobile;

    const user = await SystemUser.findByIdAndUpdate(
      req.user._id,
      { role, isActive: true, isSuperAdmin: false, [profileField]: profileData },
      { new: true, runValidators: true }
    ).populate("role", "name permissions isActive");

    res.status(201).json({ success: true, data: user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Send Change Mobile OTP (protected) ────────────────────────────────────────
// POST /api/system-users/send-change-mobile-otp  { mobile }
const sendChangeMobileOtp = async (req, res) => {
  const { newMobile } = req.body;

  if (!newMobile)
    return res.status(400).json({ success: false, message: "newMobile is required" });

  if (!MOBILE_REGEX.test(newMobile))
    return res.status(400).json({ success: false, message: "newMobile must be exactly 10 digits" });

  try {
    if (newMobile === req.user.mobile)
      return res.status(400).json({ success: false, message: "New mobile must be different from old mobile" });

    const existing = await SystemUser.findOne({ $or: MOBILE_OR_QUERY(newMobile), _id: { $ne: req.user._id } });
    if (existing)
      return res.status(409).json({ success: false, message: "Mobile already in use" });

    await SystemUserOtp.deleteMany({ userId: req.user._id });

    // OTP for old mobile verification
    await SystemUserOtp.create({ userId: req.user._id, mobile: req.user.mobile, otp: DUMMY_OTP });
    // OTP for new mobile verification
    await SystemUserOtp.create({ userId: req.user._id, mobile: newMobile, otp: DUMMY_OTP });

    // TODO: replace with real SMS OTP delivery
    // send DUMMY_OTP to req.user.mobile (old)
    // send DUMMY_OTP to mobile (new)
    res.json({ success: true, message: "OTP sent to both old and new mobile" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Verify Change Mobile OTP (protected) ──────────────────────────────────────
// POST /api/system-users/verify-change-mobile-otp  { newMobile, oldOtp, newOtp }
const verifyChangeMobileOtp = async (req, res) => {
  const { newMobile, oldOtp, newOtp } = req.body;

  if (!newMobile || !oldOtp || !newOtp)
    return res.status(400).json({ success: false, message: "newMobile, oldOtp and newOtp are required" });

  if (!MOBILE_REGEX.test(newMobile))
    return res.status(400).json({ success: false, message: "newMobile must be exactly 10 digits" });

  if (!OTP_REGEX.test(oldOtp) || !OTP_REGEX.test(newOtp))
    return res.status(400).json({ success: false, message: "OTPs must be exactly 6 digits" });

  try {
    const oldOtpRecord = await SystemUserOtp.findOne({ userId: req.user._id, mobile: req.user.mobile, otp: oldOtp });
    if (!oldOtpRecord)
      return res.status(400).json({ success: false, message: "Invalid or expired OTP for old mobile" });

    const newOtpRecord = await SystemUserOtp.findOne({ userId: req.user._id, mobile: newMobile, otp: newOtp });
    if (!newOtpRecord)
      return res.status(400).json({ success: false, message: "Invalid or expired OTP for new mobile" });

    await oldOtpRecord.deleteOne();
    await newOtpRecord.deleteOne();

    const currentUser = await SystemUser.findById(req.user._id);
    const profileField = Object.values(ALLOWED_ROLES).find((field) => currentUser[field]?.mobile);

    const updateData = { mobile: newMobile };
    if (profileField) updateData[`${profileField}.mobile`] = newMobile;

    await SystemUser.findByIdAndUpdate(req.user._id, { $set: updateData });

    res.json({ success: true, message: "Mobile updated successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Update Profile (protected) ────────────────────────────────────────────────
// PUT /api/system-users/update-profile  (multipart/form-data)
const updateProfile = async (req, res) => {
  try {
    const roleId = req.userRole || req.body.role;
    const profileField = roleId ? ALLOWED_ROLES[roleId] : null;
    if (!profileField)
      return res.status(400).json({ success: false, message: "role is required" });

    delete req.body.role;
    delete req.body.mobile;

    const profilePhotoFile = fileByField(req.files, "profilePhoto");
    if (profilePhotoFile)
      req.body.profilePhoto = toUrl(profilePhotoFile.path);

    const updateData = {};
    if (!req.userRole) updateData.role = roleId;
    Object.keys(req.body).forEach((key) => {
      updateData[`${profileField}.${key}`] = req.body[key];
    });

    const user = await SystemUser.findByIdAndUpdate(
      req.user._id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).populate("role", "name permissions isActive");

    res.json({ success: true, data: user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Delete Account (protected) ────────────────────────────────────────────────
// DELETE /api/system-users/delete-account
const deleteAccount = async (req, res) => {
  try {
    await SystemUserSession.deleteMany({ userId: req.user._id });
    await SystemUser.findByIdAndDelete(req.user._id);
    res.clearCookie("user_token");
    res.json({ success: true, message: "Account deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Get Active Users (Owner / Broker / Builder) ─────────────────────────────
// GET /api/system-users/active-users
const getActiveUsers = async (req, res) => {
  try {
    const allowedRoleIds = [
      process.env.OWNER_ROLE_ID,
      process.env.BROKER_ROLE_ID,
      process.env.BUILDER_ROLE_ID,
    ];

    const users = await SystemUser.find(
      { role: { $in: allowedRoleIds } },
      { mobile: 1, role: 1, ownerProfile: 1, brokerProfile: 1, builderProfile: 1 }
    ).populate("role", "name").lean();

    const data = users.map((u) => ({
      _id:    u._id,
      mobile: u.mobile,
      name:
        u.ownerProfile?.fullName ??
        u.brokerProfile?.fullName ??
        u.builderProfile?.name ??
        null,
      role:     u.role?._id,
      roleName: u.role?.name ?? null,
    }));

    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Get Me (protected) ───────────────────────────────────────────────────────
// GET /api/system-users/me
const getMe = async (req, res) => {
  try {
    const role = req.user.role;
    const roleId = req.userRole;

    console.log("[GetMe] Accessed by userId:", req.user._id);
    console.log("[GetMe] Role:", role ? `${role.name} (${roleId})` : "No role assigned");

    const allowedRoles = Object.keys(ALLOWED_ROLES);
    if (roleId && !allowedRoles.includes(roleId)) {
      console.log("[GetMe] Access denied — role not in allowed list:", roleId);
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    console.log("[GetMe] Access granted for userId:", req.user._id);
    const [wallet, purchased] = await Promise.all([
      UserCoinsWallet.findOne({ user: req.user._id }).select("currentBalance"),
      PurchasedPlan.findOne({ user: req.user._id, status: "Active" }),
    ]);

    let activePlan = null;
    if (purchased) {
      activePlan = {
        name:                    purchased.plan.name,
        numberOfPropertiesGiven: purchased.plan.numberOfPropertiesGiven,
        propertiesUsed:          purchased.propertiesUsed,
        expiryDate:              toIST(purchased.expiryDate),
      };
    }

    res.json({ success: true, data: { ...req.user.toObject(), coinsBalance: wallet?.currentBalance ?? 0, activePlan } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Logout ────────────────────────────────────────────────────────────────────
// POST /api/system-users/logout
const logout = async (req, res) => {
  try {
    const token = req.cookies?.user_token || req.headers.authorization?.split(" ")[1];
    if (token) await SystemUserSession.findOneAndDelete({ token });
    res.clearCookie("user_token");
    res.json({ success: true, message: "Logged out successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  sendOtp, verifyOtp, completeProfile,
  sendChangeMobileOtp, verifyChangeMobileOtp,
  updateProfile, deleteAccount, logout, getMe, getActiveUsers,
};
