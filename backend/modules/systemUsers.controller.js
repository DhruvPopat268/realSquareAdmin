const SystemUser        = require("./systemUsers.model");
const SystemUserSession = require("./systemUsers.session.model");
const SystemUserOtp     = require("./systemUsers.otp.model");
const UserCoinsWallet   = require("./mixed/userCoinsWallet/model");
const ListingPurchasedPlan     = require("./mixed/purchasedPlans/model");
const PropertyListing   = require("./mixed/propertyListing/model");
const FreeListingConfig = require("./admin/freeListingManagement/model");
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
  [process.env.CUSTOMER_ROLE_ID]: ["fullName"],
  [process.env.OWNER_ROLE_ID]:    ["fullName"],
  [process.env.BROKER_ROLE_ID]:   ["fullName"],
  [process.env.BUILDER_ROLE_ID]:  ["name"],
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

// ── Helper: Find valid active plan for user ──────────────────────────────────
function nowIST() {
  const now = new Date();
  const IST_OFFSET = 5.5 * 60 * 60 * 1000; // +05:30 in ms
  return new Date(now.getTime() + IST_OFFSET);
}

async function findValidPlan(userId) {
  const now = nowIST();
  const plans = await ListingPurchasedPlan.find({ user: userId, status: "Active" });
  return plans.find((p) => {
    const isUnlimited = p.plan.numberOfPropertiesGiven === -1;
    if (!isUnlimited && p.propertiesUsed >= p.plan.numberOfPropertiesGiven) return false;
    if (p.expiryDate === null || p.expiryDate === undefined) return true; // null = never expires
    const expiry = toIST(p.expiryDate);
    return expiry >= now;
  }) ?? null;
}

// ── Helper: Check if user can list property ─────────────────────────────────
async function checkCanListProperty(userId) {
  try {
    // 1. Check active plan credits
    const validPlan = await findValidPlan(userId);
    if (validPlan) {
      const isUnlimited = validPlan.plan.numberOfPropertiesGiven === -1;
      return {
        canList: true,
        source: "plan",
        remaining: isUnlimited ? -1 : validPlan.plan.numberOfPropertiesGiven - validPlan.propertiesUsed,
        message: null,
      };
    }

    // 2. Check free listing credits
    const [config, user] = await Promise.all([
      FreeListingConfig.findOne().sort({ createdAt: -1 }),
      SystemUser.findById(userId).select("freeListedProperties"),
    ]);

    const noOfListings = config?.noOfListings ?? 0;
    const freeListedSoFar = user?.freeListedProperties ?? 0;

    if (noOfListings === -1) {
      // unlimited free listings
      return { canList: true, source: "free", remaining: -1, message: null };
    }

    if (freeListedSoFar < noOfListings) {
      return {
        canList: true,
        source: "free",
        remaining: noOfListings - freeListedSoFar,
        message: null,
      };
    }

    // 3. Not eligible
    return {
      canList: false,
      source: null,
      remaining: 0,
      message: "You have no listing credits remaining. Please purchase a plan to list more properties.",
    };
  } catch (err) {
    return {
      canList: false,
      source: null,
      remaining: 0,
      message: "Error checking listing eligibility",
    };
  }
}

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


    res.cookie("user_token", token, COOKIE_OPTIONS);


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

    // Validate email format and uniqueness (if provided)
    if (profileData.email) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profileData.email))
        return res.status(400).json({ success: false, message: "Invalid email format" });
      
      const exists = await SystemUser.findOne({ email: profileData.email, _id: { $ne: req.user._id } });
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

    // Extract root-level fields
    const rootLevelData = {
      role,
      isActive: true,
      isSuperAdmin: false,
    };

    // Store name at root level
    if (profileField === "builderProfile" && profileData.name) {
      rootLevelData.name = profileData.name;
      delete profileData.name; // Remove from nested profile
    } else if (profileData.fullName) {
      rootLevelData.name = profileData.fullName;
      delete profileData.fullName; // Remove from nested profile
    }

    // Store email at root level (if provided)
    if (profileData.email) {
      rootLevelData.email = profileData.email;
      delete profileData.email; // Remove from nested profile
    }

    // Store profilePhoto at root level (if provided)
    if (profileData.profilePhoto) {
      rootLevelData.profilePhoto = profileData.profilePhoto;
      delete profileData.profilePhoto; // Remove from nested profile
    }

    // Store remaining fields in nested profile
    rootLevelData[profileField] = profileData;

    const user = await SystemUser.findByIdAndUpdate(
      req.user._id,
      rootLevelData,
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
    const businessLogoFile = fileByField(req.files, "businessLogo");

    const updateData = {};
    if (!req.userRole) updateData.role = roleId;

    // Root-level fields (name, email, profilePhoto)
    const rootFields = ["name", "email", "profilePhoto"];
    
    // Handle profilePhoto upload
    if (profilePhotoFile) {
      updateData.profilePhoto = toUrl(profilePhotoFile.path);
    }
    
    // Handle business logo for owners (goes into nested businessDetails)
    if (businessLogoFile && profileField === "ownerProfile") {
      updateData[`${profileField}.businessDetails.logo`] = toUrl(businessLogoFile.path);
    }

    // Separate root-level fields from profile-specific fields
    Object.keys(req.body).forEach((key) => {
      const value = req.body[key];
      
      // Special handling for fullName -> name at root level
      if (key === "fullName" && profileField !== "builderProfile") {
        updateData.name = value;
      }
      // For builder, "name" goes to root
      else if (key === "name" && profileField === "builderProfile") {
        updateData.name = value;
      }
      // email and profilePhoto go to root
      else if (key === "email") {
        updateData.email = value;
      }
      // enquiryCities goes to root — parse JSON array from FormData string
      else if (key === "enquiryCities") {
        try {
          const parsed = typeof value === "string" ? JSON.parse(value) : value;
          updateData.enquiryCities = Array.isArray(parsed)
            ? parsed.map((c) => String(c).trim()).filter(Boolean)
            : [];
        } catch {
          updateData.enquiryCities = [];
        }
      }
      // All other fields go into the nested profile
      else {
        updateData[`${profileField}.${key}`] = value;
      }
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

    const filter = { role: { $in: allowedRoleIds } };

    if (req.query.search) {
      const s = req.query.search.trim().slice(0, 100);
      if (s) filter.name = { $regex: s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" };
    }

    const limit = Math.min(parseInt(req.query.limit) || 50, 200);

    const users = await SystemUser.find(filter, { mobile: 1, role: 1, name: 1 })
      .populate("role", "name")
      .limit(limit)
      .lean();

    const data = users.map((u) => ({
      _id:      u._id,
      mobile:   u.mobile,
      name:     u.name ?? null,
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

    const allowedRoles = Object.keys(ALLOWED_ROLES);
    if (roleId && !allowedRoles.includes(roleId)) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const [wallet, purchased, hasListings, rejectedPropertiesCount] = await Promise.all([
      UserCoinsWallet.findOne({ user: req.user._id }).select("currentBalance"),
      ListingPurchasedPlan.findOne({ user: req.user._id, status: "Active" }),
      PropertyListing.exists({ "listedBy.id": req.user._id }),
      PropertyListing.countDocuments({ "listedBy.id": req.user._id, status: "Rejected" }),
    ]);

    let activePlan = null;
    if (purchased) {
      activePlan = {
        name:                    purchased.plan.name,
        numberOfPropertiesGiven: purchased.plan.numberOfPropertiesGiven,
        propertiesUsed:          purchased.propertiesUsed,
        expiryDate:              purchased.expiryDate ? toIST(purchased.expiryDate) : null,
      };
    }

    // Check if profile is completed: mobile, name, and role must all be present
    const profile = req.user.customerProfile || req.user.ownerProfile || req.user.brokerProfile || req.user.builderProfile;
    const displayName = req.user.name || profile?.fullName || profile?.name || "";
    const isProfileCompleted = !!(req.user.mobile && displayName && req.user.role);

    // Check if user can list property (includes profile completion, role check, and credits check)
    const LISTING_ALLOWED_ROLES = [
      process.env.OWNER_ROLE_ID,
      process.env.BROKER_ROLE_ID,
      process.env.BUILDER_ROLE_ID,
    ];
    
    let canListProperty = { canList: false, message: null };
    
    if (!isProfileCompleted) {
      canListProperty = {
        canList: false,
        message: "Please complete your profile to list properties.",
      };
    } else if (!LISTING_ALLOWED_ROLES.includes(req.user.role?._id?.toString())) {
      canListProperty = {
        canList: false,
        message: "Only Owners, Brokers, and Builders can list properties.",
      };
    } else if (!req.user.myPropertyListingAllowed && !hasListings) {
      canListProperty = {
        canList: false,
        message: "You don't have permission to list properties.",
      };
    } else {
      // Check credits (plan or free listing)
      canListProperty = await checkCanListProperty(req.user._id);
    }

    res.json({ 
      success: true, 
      data: { 
        _id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        mobile: req.user.mobile,
        profilePhoto: req.user.profilePhoto,
        role: req.user.role,
        customerProfile: req.user.customerProfile,
        ownerProfile: req.user.ownerProfile,
        brokerProfile: req.user.brokerProfile,
        builderProfile: req.user.builderProfile,
        enquiryCities: req.user.enquiryCities ?? [],
        coinsBalance: wallet?.currentBalance ?? 0, 
        activePlan,
        myPropertyListingAllowed: !!hasListings,
        isProfileCompleted,
        canListProperty,
        rejectedPropertiesCount,
      } 
    });
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
