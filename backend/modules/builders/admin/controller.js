const SystemUser = require("../../systemUsers.model");

const BUILDER_ROLE_ID = process.env.BUILDER_ROLE_ID;

const toUrl = (filePath) =>
  `${process.env.BACKEND_URL}${filePath.replace("/var/www/storage", "/storage")}`;

const fileByField = (files, name) => (files || []).find((f) => f.fieldname === name);

const getBuilders = async (req, res) => {
  try {
    const builders = await SystemUser.find({ role: BUILDER_ROLE_ID })
      .populate("role", "name permissions isActive")
      .sort({ createdAt: -1 });

    res.json({ success: true, data: builders });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const createBuilder = async (req, res) => {
  try {
    const { mobile, name, email, gstNumber, cinNumber, foundedYear, totalProjectsDelivered } = req.body;

    if (!mobile)
      return res.status(400).json({ success: false, message: "mobile is required" });

    const existing = await SystemUser.findOne({ mobile });
    if (existing)
      return res.status(409).json({ success: false, message: "Mobile already registered" });

    const profilePhotoFile = fileByField(req.files, "profilePhoto");
    const builderProfile = {
      name, email, mobile,
      gstNumber,
      cinNumber,
      foundedYear:            foundedYear            ? Number(foundedYear)            : undefined,
      totalProjectsDelivered: totalProjectsDelivered ? Number(totalProjectsDelivered) : undefined,
      profilePhoto: profilePhotoFile ? toUrl(profilePhotoFile.path) : undefined,
    };

    const builder = await SystemUser.create({
      mobile,
      role: BUILDER_ROLE_ID,
      isActive: true,
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

    const updateData = {};
    if (name                   !== undefined) updateData["builderProfile.name"]                   = name;
    if (email                  !== undefined) updateData["builderProfile.email"]                  = email;
    if (gstNumber              !== undefined) updateData["builderProfile.gstNumber"]              = gstNumber;
    if (cinNumber              !== undefined) updateData["builderProfile.cinNumber"]              = cinNumber;
    if (foundedYear            !== undefined) updateData["builderProfile.foundedYear"]            = Number(foundedYear);
    if (totalProjectsDelivered !== undefined) updateData["builderProfile.totalProjectsDelivered"] = Number(totalProjectsDelivered);
    if (mobile                 !== undefined) { updateData["mobile"] = mobile; updateData["builderProfile.mobile"] = mobile; }

    const profilePhotoFile = fileByField(req.files, "profilePhoto");
    if (profilePhotoFile)
      updateData["builderProfile.profilePhoto"] = toUrl(profilePhotoFile.path);

    const builder = await SystemUser.findByIdAndUpdate(
      id,
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

    const builder = await SystemUser.findByIdAndUpdate(
      id,
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

    const builder = await SystemUser.findByIdAndDelete(id);
    if (!builder)
      return res.status(404).json({ success: false, message: "Builder not found" });

    res.json({ success: true, message: "Builder deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { getBuilders, createBuilder, updateBuilder, updateBuilderStatus, deleteBuilder };
