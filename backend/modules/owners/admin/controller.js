const SystemUser = require("../../systemUsers.model");
const SystemUserSession = require("../../systemUsers.session.model");
const getAdminUserStats = require("../../../utils/adminUserStats");

const OWNER_ROLE_ID = process.env.OWNER_ROLE_ID;

const toUrl = (filePath) =>
  `${process.env.BACKEND_URL}${filePath.replace("/var/www/storage", "/storage")}`;

const fileByField = (files, name) => Array.isArray(files)
  ? files.find((file) => file.fieldname === name)
  : files?.[name]?.[0];
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const getOwners = async (req, res) => {
  try {
    const isDeleted = req.query.isDeleted;
    if (isDeleted && !["true", "false", "all"].includes(isDeleted))
      return res.status(400).json({ success: false, message: "isDeleted must be true, false, or all" });
    const statsFilter = { role: OWNER_ROLE_ID };
    const filter = { ...statsFilter };
    if (isDeleted !== "all") filter.isDeleted = isDeleted === "true" ? true : { $ne: true };
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const skip = (page - 1) * limit;
    if (typeof req.query.search === "string" && req.query.search.trim()) {
      const search = new RegExp(escapeRegex(req.query.search.trim()), "i");
      filter.$or = [{ name: search }, { email: search }, { mobile: search }];
    }

    const [owners, total, stats] = await Promise.all([
      SystemUser.find(filter)
        .populate("role", "name permissions isActive")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      SystemUser.countDocuments(filter),
      getAdminUserStats(statsFilter),
    ]);

    res.json({
      success: true,
      data: owners,
      stats,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const createOwner = async (req, res) => {
  try {
    const fullName = typeof req.body.fullName === "string" ? req.body.fullName.trim() : "";
    const mobile = typeof req.body.mobile === "string" ? req.body.mobile.trim() : "";
    const email = typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const bizName = typeof req.body.bizName === "string" ? req.body.bizName.trim() : "";
    const bizType = typeof req.body.bizType === "string" ? req.body.bizType.trim() : "";
    const bizGst = typeof req.body.bizGst === "string" ? req.body.bizGst.trim() : "";
    const bizMobile = typeof req.body.bizMobile === "string" ? req.body.bizMobile.trim() : "";
    const bizWebsite = typeof req.body.bizWebsite === "string" ? req.body.bizWebsite.trim() : "";
    let enquiryCities = req.body.enquiryCities;

    if (!fullName || !mobile)
      return res.status(400).json({ success: false, message: "Name and mobile are required" });
    if (!/^\d{10}$/.test(mobile))
      return res.status(400).json({ success: false, message: "Mobile must be exactly 10 digits" });
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return res.status(400).json({ success: false, message: "Please provide a valid email address" });
    if (bizType && !["private_owner", "real_estate_investment_trust", "property_management_group", "family_office"].includes(bizType))
      return res.status(400).json({ success: false, message: "Invalid business type" });
    if (!OWNER_ROLE_ID)
      return res.status(500).json({ success: false, message: "Owner role is not configured" });

    if (typeof enquiryCities === "string") {
      try {
        enquiryCities = JSON.parse(enquiryCities);
      } catch {
        return res.status(400).json({ success: false, message: "enquiryCities must be a valid JSON array" });
      }
    }
    if (enquiryCities === undefined) enquiryCities = [];
    if (!Array.isArray(enquiryCities))
      return res.status(400).json({ success: false, message: "enquiryCities must be an array" });
    enquiryCities = [...new Set(enquiryCities.map((city) => String(city).trim()).filter(Boolean))];

    const existingMobile = await SystemUser.findOne({ mobile });
    if (existingMobile)
      return res.status(409).json({ success: false, message: "Mobile already registered" });
    if (email) {
      const existingEmail = await SystemUser.findOne({ email });
      if (existingEmail)
        return res.status(409).json({ success: false, message: "Email already registered" });
    }

    const profilePhoto = fileByField(req.files, "profilePhoto");
    const businessLogo = fileByField(req.files, "businessLogo");
    const businessDetails = {
      ...(bizName ? { name: bizName } : {}),
      ...(bizType ? { type: bizType } : {}),
      ...(bizGst ? { gstNumber: bizGst } : {}),
      ...(bizMobile ? { mobile: bizMobile } : {}),
      ...(bizWebsite ? { website: bizWebsite } : {}),
      ...(businessLogo ? { logo: toUrl(businessLogo.path) } : {}),
    };
    const owner = await SystemUser.create({
      name: fullName,
      mobile,
      ...(email ? { email } : {}),
      ...(profilePhoto ? { profilePhoto: toUrl(profilePhoto.path) } : {}),
      enquiryCities,
      role: OWNER_ROLE_ID,
      ...(Object.keys(businessDetails).length ? { ownerProfile: { businessDetails } } : {}),
    });
    await owner.populate("role", "name permissions isActive");
    return res.status(201).json({ success: true, data: owner });
  } catch (err) {
    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern || {})[0];
      return res.status(409).json({ success: false, message: field === "email" ? "Email already registered" : "Mobile already registered" });
    }
    return res.status(500).json({ success: false, message: err.message });
  }
};

const updateOwner = async (req, res) => {
  try {
    const { id } = req.params;
    const { fullName, email, mobile, bizName, bizType, bizGst, bizEmail, bizMobile, bizWebsite } = req.body;
    let { enquiryCities } = req.body;

    const updateData = {};
    if (fullName   !== undefined) updateData["name"]                                         = fullName;
    if (email      !== undefined) updateData["email"]                                        = email;
    if (mobile     !== undefined) updateData["mobile"]                                       = mobile;
    if (bizName    !== undefined) updateData["ownerProfile.businessDetails.name"]            = bizName;
    if (bizType    !== undefined) updateData["ownerProfile.businessDetails.type"]            = bizType;
    if (bizGst     !== undefined) updateData["ownerProfile.businessDetails.gstNumber"]       = bizGst;
    if (bizEmail   !== undefined) updateData["ownerProfile.businessDetails.email"]           = bizEmail;
    if (bizMobile  !== undefined) updateData["ownerProfile.businessDetails.mobile"]          = bizMobile;
    if (bizWebsite !== undefined) updateData["ownerProfile.businessDetails.website"]         = bizWebsite;

    if (enquiryCities !== undefined) {
      if (typeof enquiryCities === "string") {
        try {
          enquiryCities = JSON.parse(enquiryCities);
        } catch {
          return res.status(400).json({ success: false, message: "enquiryCities must be a valid JSON array" });
        }
      }
      if (!Array.isArray(enquiryCities))
        return res.status(400).json({ success: false, message: "enquiryCities must be an array" });
      updateData.enquiryCities = [...new Set(enquiryCities.map((city) => String(city).trim()).filter(Boolean))];
    }

    const logoFile = fileByField(req.files, "businessLogo");
    if (logoFile)
      updateData["ownerProfile.businessDetails.logo"] = toUrl(logoFile.path);
    const profilePhotoFile = fileByField(req.files, "profilePhoto");
    if (profilePhotoFile)
      updateData.profilePhoto = toUrl(profilePhotoFile.path);

    const owner = await SystemUser.findOneAndUpdate(
      { _id: id, isDeleted: { $ne: true } },
      { $set: updateData },
      { new: true, runValidators: true }
    ).populate("role", "name permissions isActive");

    if (!owner)
      return res.status(404).json({ success: false, message: "Owner not found" });

    res.json({ success: true, data: owner });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const updateOwnerStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive, autoApprovalProperties } = req.body;

    if (isActive === undefined && autoApprovalProperties === undefined)
      return res.status(400).json({ success: false, message: "isActive or autoApprovalProperties is required" });

    const updateData = {};
    if (isActive               !== undefined) updateData.isActive               = isActive;
    if (autoApprovalProperties !== undefined) updateData.autoApprovalProperties = autoApprovalProperties;

    const owner = await SystemUser.findOneAndUpdate(
      { _id: id, isDeleted: { $ne: true } },
      { $set: updateData },
      { new: true }
    ).populate("role", "name permissions isActive");

    if (!owner)
      return res.status(404).json({ success: false, message: "Owner not found" });

    res.json({ success: true, data: owner });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const deleteOwner = async (req, res) => {
  try {
    const { id } = req.params;

    const owner = await SystemUser.findOneAndUpdate(
      { _id: id, role: OWNER_ROLE_ID, isDeleted: { $ne: true } },
      { $set: { isDeleted: true } },
      { new: true }
    );
    if (!owner)
      return res.status(404).json({ success: false, message: "Owner not found" });

    await SystemUserSession.deleteMany({ userId: owner._id });

    res.json({ success: true, message: "Owner deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { getOwners, createOwner, updateOwner, updateOwnerStatus, deleteOwner };
