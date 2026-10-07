const SystemUser               = require("./systemUsers.model");
const SystemUserSession        = require("./systemUsers.session.model");
const SystemUserOtp            = require("./systemUsers.otp.model");
const UserCoinsWallet          = require("./mixed/userCoinsWallet/model");
const ListingPurchasedPlan     = require("./mixed/purchasedPlans/model");
const EnquiryPurchasedPlan     = require("./mixed/enquiryPurchasedPlans/model");
const PropertyListing          = require("./mixed/propertyListing/model");
const FreeListingConfig        = require("./admin/freeListingManagement/model");
const LeadEnquiryCoinsConfig   = require("./admin/leadEnquiryCoinsConfig/model");
const { toIST }         = require("../utils/dateTime");
const jwt               = require("jsonwebtoken");
const mongoose          = require("mongoose");
const crypto            = require("crypto");
const path              = require("path");
const { runReraVerification } = require("./mixed/reraVerification/controller");
const { sendEmail }     = require("../utils/emailService");

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
const EMAIL_REGEX  = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EMAIL_OTP_TEMPLATE = path.join(__dirname, "systemUsers.sendOtp.emailTemplate.html");
const escapeHtml = (value) => value.replace(/[&<>"']/g, (char) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
}[char]));

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

const verifyBrokerRera = async (reraId, context) => {
  try {
    return { reraId, ...(await runReraVerification(reraId)) };
  } catch (err) {
    console.error(`[${context}] RERA verification failed for broker ID ${reraId}:`, err.message);
    return {
      reraId,
      verified: false,
      reason: "RERA verification could not be completed",
      projectDetails: null,
      sources: [],
    };
  }
};

const toUrl = (filePath) =>
  `${process.env.BACKEND_URL}${filePath.replace("/var/www/storage", "/storage")}`;

const issueToken = async (userId) => {
  const user = await SystemUser.findOne({ _id: userId, isDeleted: { $ne: true } }).select("_id");
  if (!user) throw new Error("Account is deleted");

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
  await SystemUser.findOneAndUpdate(
    { _id: userId, isDeleted: { $ne: true } },
    { lastLogin: new Date() }
  );
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

    if (user?.isDeleted)
      return res.status(403).json({ success: false, message: "Account is deleted" });

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

    if (user.isDeleted)
      return res.status(403).json({ success: false, message: "Account is deleted" });

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

// ── Send profile email verification OTP (protected) ──────────────────────────
// POST /api/system-users/send-email-otp { email }
const sendEmailOtp = async (req, res) => {
  const email = typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
  if (!email || !EMAIL_REGEX.test(email)) {
    return res.status(400).json({ success: false, message: "A valid email is required" });
  }

  try {
    const user = await SystemUser.findById(req.user._id).select("email emailVerified");
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    if (user.email?.toLowerCase() === email && user.emailVerified) {
      return res.json({ success: true, verified: true, email, message: "Email is already verified" });
    }

    const existing = await SystemUser.findOne({ email, _id: { $ne: req.user._id } }).select("_id");
    if (existing) return res.status(409).json({ success: false, message: "Email is already registered" });

    const otp = crypto.randomInt(100000, 1000000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await SystemUser.findByIdAndUpdate(req.user._id, {
      $set: { emailOtp: otp, emailOtpEmail: email, emailOtpExpiresAt: expiresAt },
    });

    try {
      await sendEmail({
        to: email,
        subject: "Verify your RealSquare email address",
        templatePath: EMAIL_OTP_TEMPLATE,
        variables: { OTP: otp, EMAIL: escapeHtml(email) },
      });
    } catch (mailError) {
      await SystemUser.findOneAndUpdate(
        { _id: req.user._id, emailOtp: otp },
        { $unset: { emailOtp: 1, emailOtpEmail: 1, emailOtpExpiresAt: 1 } }
      );
      throw mailError;
    }

    return res.json({ success: true, verified: false, email, message: "Verification code sent to your email" });
  } catch (err) {
    console.error("Error sending profile email verification code:", err.message);
    return res.status(500).json({ success: false, message: "Failed to send email verification code" });
  }
};

// ── Verify profile email OTP (protected) ─────────────────────────────────────
// POST /api/system-users/verify-email-otp { email, otp }
const verifyEmailOtp = async (req, res) => {
  const email = typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
  const { otp } = req.body;

  if (!email || !EMAIL_REGEX.test(email) || !otp) {
    return res.status(400).json({ success: false, verified: false, message: "A valid email and OTP are required" });
  }
  if (!OTP_REGEX.test(String(otp))) {
    return res.status(400).json({ success: false, verified: false, message: "OTP must be exactly 6 digits" });
  }

  try {
    const user = await SystemUser.findById(req.user._id)
      .select("+emailOtp +emailOtpEmail +emailOtpExpiresAt email emailVerified");
    if (!user) return res.status(404).json({ success: false, verified: false, message: "User not found" });

    if (user.emailOtp !== String(otp) || user.emailOtpEmail !== email || !user.emailOtpExpiresAt || user.emailOtpExpiresAt <= new Date()) {
      return res.status(400).json({ success: false, verified: false, message: "Invalid or expired verification code" });
    }

    const existing = await SystemUser.findOne({ email, _id: { $ne: req.user._id } }).select("_id");
    if (existing) return res.status(409).json({ success: false, verified: false, message: "Email is already registered" });

    const updated = await SystemUser.findOneAndUpdate(
      { _id: req.user._id, emailOtp: String(otp), emailOtpEmail: email, emailOtpExpiresAt: { $gt: new Date() } },
      {
        $set: { email, emailVerified: true },
        $unset: { emailOtp: 1, emailOtpEmail: 1, emailOtpExpiresAt: 1 },
      },
      { new: true, runValidators: true }
    ).select("email emailVerified");

    if (!updated) return res.status(400).json({ success: false, verified: false, message: "Invalid or expired verification code" });
    return res.json({ success: true, verified: true, email: updated.email, message: "Email verified successfully" });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ success: false, verified: false, message: "Email is already registered" });
    }
    return res.status(500).json({ success: false, verified: false, message: err.message });
  }
};

// ── Complete Profile (protected) ──────────────────────────────────────────────
// POST /api/system-users/complete-profile  (multipart/form-data)
const completeProfile = async (req, res) => {
  try {
    const { role, ...profileData } = req.body;
    const submittedReraId = profileData.reraId;
    delete profileData.reraId;
    const rawEnquiryCities = profileData.enquiryCities;
    delete profileData.enquiryCities;

    if (!role)
      return res.status(400).json({ success: false, message: "role is required" });

    const profileField = ALLOWED_ROLES[role];
    if (!profileField)
      return res.status(403).json({ success: false, message: "This role is not allowed to self-register" });

    if (profileField === "brokerProfile" && typeof submittedReraId === "string" && submittedReraId.trim()) {
      profileData.reraVerification = await verifyBrokerRera(submittedReraId.trim(), "completeProfile");
    }

    let enquiryCities;
    if (rawEnquiryCities !== undefined) {
      try {
        const parsedCities = typeof rawEnquiryCities === "string"
          ? JSON.parse(rawEnquiryCities)
          : rawEnquiryCities;
        if (!Array.isArray(parsedCities)) {
          return res.status(400).json({ success: false, message: "enquiryCities must be an array" });
        }
        enquiryCities = parsedCities.map((city) => String(city).trim()).filter(Boolean);
      } catch {
        return res.status(400).json({ success: false, message: "enquiryCities must be a valid JSON array" });
      }
    }

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

    // Email must be verified before it can be added to a profile.
    if (profileData.email !== undefined) {
      const submittedEmail = typeof profileData.email === "string" ? profileData.email.trim().toLowerCase() : "";
      if (!submittedEmail) {
        delete profileData.email;
      } else {
        if (!EMAIL_REGEX.test(submittedEmail))
          return res.status(400).json({ success: false, message: "Invalid email format" });

        if (req.user.email?.toLowerCase() !== submittedEmail || req.user.emailVerified !== true) {
          return res.status(400).json({ success: false, message: "Please verify this email before saving your profile" });
        }

        const exists = await SystemUser.findOne({ email: submittedEmail, _id: { $ne: req.user._id } });
        if (exists) return res.status(409).json({ success: false, message: "Email already registered" });
        profileData.email = submittedEmail;
      }
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
    if (enquiryCities !== undefined) rootLevelData.enquiryCities = enquiryCities;

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

// ── Assign customer role without profile details (protected) ─────────────────
// POST /api/system-users/assign-customer-role
const assignCustomerRole = async (req, res) => {
  try {
    const customerRoleId = process.env.CUSTOMER_ROLE_ID;
    if (!customerRoleId || !ALLOWED_ROLES[customerRoleId]) {
      return res.status(500).json({ success: false, message: "Customer role is not configured" });
    }

    const currentRoleId = req.userRole?.toString();
    if (currentRoleId === customerRoleId) {
      const user = await SystemUser.findById(req.user._id).populate("role", "name permissions isActive");
      return res.json({ success: true, message: "Customer role is already assigned", data: user });
    }
    if (currentRoleId) {
      return res.status(409).json({ success: false, message: "A role is already assigned to this account" });
    }

    const existingProfile = Object.values(ALLOWED_ROLES).find((field) => req.user[field]?.mobile);
    if (existingProfile) {
      return res.status(409).json({ success: false, message: "A role profile already exists for this account" });
    }

    const user = await SystemUser.findByIdAndUpdate(
      req.user._id,
      { $set: { role: customerRoleId, isActive: true, isSuperAdmin: false } },
      { new: true, runValidators: true }
    ).populate("role", "name permissions isActive");

    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    return res.json({ success: true, message: "Customer role assigned successfully", data: user });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
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

    const submittedReraId = req.body.reraId;
    delete req.body.reraId;

    const profilePhotoFile = fileByField(req.files, "profilePhoto");
    const businessLogoFile = fileByField(req.files, "businessLogo");

    const updateData = {};
    const unsetData = {};
    if (!req.userRole) updateData.role = roleId;

    if (req.body.email !== undefined) {
      const rawEmail = req.body.email;
      const clearEmail = rawEmail === null || (typeof rawEmail === "string" && (!rawEmail.trim() || rawEmail.trim().toLowerCase() === "null"));
      if (clearEmail) {
        updateData.emailVerified = false;
        unsetData.email = 1;
        unsetData.emailOtp = 1;
        unsetData.emailOtpEmail = 1;
        unsetData.emailOtpExpiresAt = 1;
      } else {
        const submittedEmail = typeof rawEmail === "string" ? rawEmail.trim().toLowerCase() : "";
        if (!EMAIL_REGEX.test(submittedEmail)) {
          return res.status(400).json({ success: false, message: "Invalid email format" });
        }
        if (req.user.email?.toLowerCase() !== submittedEmail || req.user.emailVerified !== true) {
          return res.status(400).json({ success: false, message: "Please verify this email before saving your profile" });
        }
        const existing = await SystemUser.findOne({ email: submittedEmail, _id: { $ne: req.user._id } }).select("_id");
        if (existing) return res.status(409).json({ success: false, message: "Email already registered" });
        req.body.email = submittedEmail;
      }
    }

    if (profileField === "brokerProfile" && submittedReraId !== undefined) {
      const cleanedReraId = typeof submittedReraId === "string" ? submittedReraId.trim() : "";
      if (!cleanedReraId || cleanedReraId.toLowerCase() === "null") {
        unsetData["brokerProfile.reraVerification"] = 1;
      } else if (cleanedReraId !== req.user.brokerProfile?.reraVerification?.reraId) {
        updateData["brokerProfile.reraVerification"] = await verifyBrokerRera(cleanedReraId, "updateProfile");
      }
    }

    const addUpdateField = (path, value) => {
      // FormData serializes null as the literal string "null".
      if (value === null || (typeof value === "string" && value.trim().toLowerCase() === "null")) {
        unsetData[path] = 1;
      } else {
        updateData[path] = value;
      }
    };
    
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
        addUpdateField("name", value);
      }
      // For builder, "name" goes to root
      else if (key === "name" && profileField === "builderProfile") {
        addUpdateField("name", value);
      }
      // email and profilePhoto go to root
      else if (key === "email") {
        addUpdateField("email", value);
      } else if (key === "profilePhoto") {
        addUpdateField("profilePhoto", value);
      }
      // enquiryCities goes to root — parse JSON array from FormData string
      else if (key === "enquiryCities") {
        if (value === null || (typeof value === "string" && value.trim().toLowerCase() === "null")) {
          unsetData.enquiryCities = 1;
          return;
        }
        try {
          const parsed = typeof value === "string" ? JSON.parse(value) : value;
          addUpdateField("enquiryCities", Array.isArray(parsed)
            ? parsed.map((c) => String(c).trim()).filter(Boolean)
            : []);
        } catch {
          updateData.enquiryCities = [];
        }
      }
      // All other fields go into the nested profile
      else {
        addUpdateField(`${profileField}.${key}`, value);
      }
    });

    const updateOperation = {};
    if (Object.keys(updateData).length) updateOperation.$set = updateData;
    if (Object.keys(unsetData).length) updateOperation.$unset = unsetData;

    if (!Object.keys(updateOperation).length) {
      const user = await SystemUser.findById(req.user._id)
        .populate("role", "name permissions isActive");
      return res.json({ success: true, data: user });
    }

    const user = await SystemUser.findByIdAndUpdate(
      req.user._id,
      updateOperation,
      { new: true, runValidators: true }
    ).populate("role", "name permissions isActive");

    res.json({ success: true, data: user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Reset Role Profile for Role Switch (protected) ────────────────────────────
// POST /api/system-users/switch-role
const switchRole = async (req, res) => {
  let session;
  try {
    session = await mongoose.startSession();
    session.startTransaction();
    await ListingPurchasedPlan.updateMany(
      { user: req.user._id, status: "Active" },
      { $set: { status: "Cancelled", cancellationReason: "User switched role" } },
      { session }
    );
    await EnquiryPurchasedPlan.updateMany(
      { user: req.user._id, status: "Active" },
      { $set: { status: "Cancelled", cancellationReason: "User switched role" } },
      { session }
    );
    await SystemUser.findByIdAndUpdate(
      req.user._id,
      {
        $unset: {
          role: 1,
          customerProfile: 1,
          ownerProfile: 1,
          brokerProfile: 1,
          builderProfile: 1,
          enquiryCities: 1,
          lastLogin: 1,
          lastActivity: 1,
        },
      },
      { runValidators: true, session }
    );
    await SystemUserSession.deleteMany({ userId: req.user._id }, { session });
    await session.commitTransaction();
    res.clearCookie("user_token");
    res.json({ success: true, message: "Profile reset for role switch successfully" });
  } catch (err) {
    if (session?.inTransaction()) await session.abortTransaction();
    res.status(500).json({ success: false, message: err.message });
  } finally {
    if (session) await session.endSession();
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

    const [wallet, purchased, purchasedEnquiry, hasListings, rejectedPropertiesCount, leadEnquiryCoinsConfig] = await Promise.all([
      UserCoinsWallet.findOne({ user: req.user._id }).select("currentBalance"),
      ListingPurchasedPlan.findOne({ user: req.user._id, status: "Active" }),
      EnquiryPurchasedPlan.findOne({ user: req.user._id, status: "Active" }),
      PropertyListing.exists({ "listedBy.id": req.user._id }),
      PropertyListing.countDocuments({ "listedBy.id": req.user._id, status: "Rejected" }),
      LeadEnquiryCoinsConfig.findOne({ _configKey: "singleton" }).select("coinsPerEnquiry").lean(),
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

    let activeEnquiryPlan = null;
    if (purchasedEnquiry) {
      activeEnquiryPlan = {
        name:                   purchasedEnquiry.plan.name,
        numberOfEnquiriesGiven: purchasedEnquiry.plan.numberOfEnquiriesGiven,
        enquiriesUsed:          purchasedEnquiry.enquiriesUsed,
        expiryDate:             purchasedEnquiry.expiryDate ? toIST(purchasedEnquiry.expiryDate) : null,
      };
    }

    // Check if profile is completed: mobile, name, and role must all be present
    const profile = req.user.customerProfile || req.user.ownerProfile || req.user.brokerProfile || req.user.builderProfile;
    const displayName = req.user.name || profile?.fullName || profile?.name || "";
    const isProfileCompleted = !!(req.user.mobile && displayName && req.user.role);
    let brokerProfile = req.user.brokerProfile?.toObject
      ? req.user.brokerProfile.toObject()
      : req.user.brokerProfile;
    if (roleId === process.env.BROKER_ROLE_ID) {
      brokerProfile = brokerProfile || {};
      const reraId = brokerProfile.reraVerification?.reraId;
      brokerProfile.reraVerification = {
        ...(reraId ? { reraId } : {}),
        verified: Boolean(reraId && brokerProfile.reraVerification?.verified === true),
      };
    }

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
    } else {
      // Check credits (plan or free listing)
      canListProperty = await checkCanListProperty(req.user._id);
    }

    const ASSIGNED_INQUIRY_ROLES = [
      process.env.OWNER_ROLE_ID,
      process.env.BROKER_ROLE_ID,
      process.env.BUILDER_ROLE_ID,
    ];
    const haveAssignedInquiries = ASSIGNED_INQUIRY_ROLES.includes(req.user.role?._id?.toString());

    const PLAN_ROLES = [
      process.env.OWNER_ROLE_ID,
      process.env.BROKER_ROLE_ID,
      process.env.BUILDER_ROLE_ID,
    ];
    const userRoleId = req.user.role?._id?.toString();
    const showListingPlan  = PLAN_ROLES.includes(userRoleId);
    const showEnquiryPlan  = PLAN_ROLES.includes(userRoleId);

    res.json({ 
      success: true, 
      data: { 
        _id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        emailVerified: req.user.emailVerified === true,
        mobile: req.user.mobile,
        profilePhoto: req.user.profilePhoto,
        role: req.user.role,
        customerProfile: req.user.customerProfile,
        ownerProfile: req.user.ownerProfile,
        brokerProfile,
        builderProfile: req.user.builderProfile,
        enquiryCities: req.user.enquiryCities ?? [],
        coinsBalance: wallet?.currentBalance ?? 0, 
        coinsPerEnquiry: leadEnquiryCoinsConfig?.coinsPerEnquiry ?? 0,
        activePlan,
        activeEnquiryPlan,
        showListingPlan,
        showEnquiryPlan,
        myPropertyListingAllowed: !!hasListings,
        isProfileCompleted,
        canListProperty,
        rejectedPropertiesCount,
        haveAssignedInquiries,
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
  sendOtp, verifyOtp, sendEmailOtp, verifyEmailOtp, completeProfile, assignCustomerRole,
  updateProfile, switchRole, logout, getMe, getActiveUsers,
};
