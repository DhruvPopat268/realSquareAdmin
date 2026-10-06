const SystemUser = require("../../systemUsers.model");
const SystemUserSession = require("../../systemUsers.session.model");
const getAdminUserStats = require("../../../utils/adminUserStats");

const BUILDER_ROLE_ID = process.env.BUILDER_ROLE_ID;

const toUrl = (filePath) =>
  `${process.env.BACKEND_URL}${filePath.replace("/var/www/storage", "/storage")}`;

const fileByField = (files, name) => (files || []).find((f) => f.fieldname === name);
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const getBuilders = async (req, res) => {
  try {
    const isDeleted = req.query.isDeleted;
    if (isDeleted && !["true", "false", "all"].includes(isDeleted))
      return res.status(400).json({ success: false, message: "isDeleted must be true, false, or all" });
    const statsFilter = { role: BUILDER_ROLE_ID };
    const filter = { ...statsFilter };
    if (isDeleted !== "all") filter.isDeleted = isDeleted === "true" ? true : { $ne: true };
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const skip = (page - 1) * limit;
    if (typeof req.query.search === "string" && req.query.search.trim()) {
      const search = new RegExp(escapeRegex(req.query.search.trim()), "i");
      filter.$or = [{ name: search }, { email: search }, { mobile: search }];
    }

    const [builders, total, stats] = await Promise.all([
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
      data: builders,
      stats,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const createBuilder = async (req, res) => {
  try {
    const { mobile, name, email, gstNumber, cinNumber, foundedYear, totalProjectsDelivered } = req.body;
    let { enquiryCities, location } = req.body;

    if (!mobile)
      return res.status(400).json({ success: false, message: "mobile is required" });

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

    if (typeof location === "string") {
      try {
        location = JSON.parse(location);
      } catch {
        return res.status(400).json({ success: false, message: "location must be valid JSON" });
      }
    }
    if (location !== undefined && location !== null) {
      const latitude = Number(location.latitude);
      const longitude = Number(location.longitude);
      if (typeof location.name !== "string" || !location.name.trim() || !Number.isFinite(latitude) || !Number.isFinite(longitude))
        return res.status(400).json({ success: false, message: "location must include a name, latitude, and longitude" });
      location = { name: location.name.trim(), latitude, longitude };
    }

    const existing = await SystemUser.findOne({ mobile });
    if (existing)
      return res.status(409).json({ success: false, message: "Mobile already registered" });

    const profilePhotoFile = fileByField(req.files, "profilePhoto");
    const builderProfile = {
      gstNumber,
      cinNumber,
      foundedYear:            foundedYear            ? Number(foundedYear)            : undefined,
      totalProjectsDelivered: totalProjectsDelivered ? Number(totalProjectsDelivered) : undefined,
      location: location || undefined,
    };

    const builder = await SystemUser.create({
      mobile,
      name,
      email,
      profilePhoto: profilePhotoFile ? toUrl(profilePhotoFile.path) : undefined,
      role: BUILDER_ROLE_ID,
      isActive: true,
      enquiryCities,
      builderProfile,
    });

    const populated = await builder.populate("role", "name permissions isActive");
    res.status(201).json({ success: true, data: populated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const updateBuilder = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, mobile, gstNumber, cinNumber, foundedYear, totalProjectsDelivered } = req.body;
    let { enquiryCities, location } = req.body;

    const updateData = {};
    if (name                   !== undefined) updateData["name"]                                  = name;
    if (email                  !== undefined) updateData["email"]                                 = email;
    if (mobile                 !== undefined) updateData["mobile"]                                = mobile;
    if (gstNumber              !== undefined) updateData["builderProfile.gstNumber"]              = gstNumber;
    if (cinNumber              !== undefined) updateData["builderProfile.cinNumber"]              = cinNumber;
    if (foundedYear            !== undefined) updateData["builderProfile.foundedYear"]            = Number(foundedYear);
    if (totalProjectsDelivered !== undefined) updateData["builderProfile.totalProjectsDelivered"] = Number(totalProjectsDelivered);

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

    if (typeof location === "string") {
      try {
        location = JSON.parse(location);
      } catch {
        return res.status(400).json({ success: false, message: "location must be valid JSON" });
      }
    }
    if (location !== undefined && location !== null) {
      const latitude = Number(location.latitude);
      const longitude = Number(location.longitude);
      if (typeof location.name !== "string" || !location.name.trim() || !Number.isFinite(latitude) || !Number.isFinite(longitude))
        return res.status(400).json({ success: false, message: "location must include a name, latitude, and longitude" });
      updateData["builderProfile.location"] = { name: location.name.trim(), latitude, longitude };
    }

    const profilePhotoFile = fileByField(req.files, "profilePhoto");
    if (profilePhotoFile)
      updateData["profilePhoto"] = toUrl(profilePhotoFile.path);

    const builder = await SystemUser.findOneAndUpdate(
      { _id: id, isDeleted: { $ne: true } },
      { $set: updateData },
      { new: true, runValidators: true }
    ).populate("role", "name permissions isActive");

    if (!builder)
      return res.status(404).json({ success: false, message: "Builder not found" });

    res.json({ success: true, data: builder });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const updateBuilderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive, autoApprovalProperties } = req.body;

    if (isActive === undefined && autoApprovalProperties === undefined)
      return res.status(400).json({ success: false, message: "isActive or autoApprovalProperties is required" });

    const updateData = {};
    if (isActive               !== undefined) updateData.isActive               = isActive;
    if (autoApprovalProperties !== undefined) updateData.autoApprovalProperties = autoApprovalProperties;

    const builder = await SystemUser.findOneAndUpdate(
      { _id: id, isDeleted: { $ne: true } },
      { $set: updateData },
      { new: true }
    ).populate("role", "name permissions isActive");

    if (!builder)
      return res.status(404).json({ success: false, message: "Builder not found" });

    res.json({ success: true, data: builder });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const deleteBuilder = async (req, res) => {
  try {
    const { id } = req.params;

    const builder = await SystemUser.findOneAndUpdate(
      { _id: id, role: BUILDER_ROLE_ID, isDeleted: { $ne: true } },
      { $set: { isDeleted: true } },
      { new: true }
    );
    if (!builder)
      return res.status(404).json({ success: false, message: "Builder not found" });

    await SystemUserSession.deleteMany({ userId: builder._id });

    res.json({ success: true, message: "Builder deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { getBuilders, createBuilder, updateBuilder, updateBuilderStatus, deleteBuilder };
