const SystemUser = require("../../systemUsers.model");
const path = require("path");

const OWNER_ROLE_ID = process.env.OWNER_ROLE_ID;

const toUrl = (filePath) =>
  `${process.env.BACKEND_URL}${filePath.replace("/var/www/storage", "/storage")}`;

const fileByField = (files, name) => (files || []).find((f) => f.fieldname === name);

const getOwners = async (req, res) => {
  try {
    const owners = await SystemUser.find({ role: OWNER_ROLE_ID })
      .populate("role", "name permissions isActive")
      .sort({ createdAt: -1 });

    res.json({ success: true, data: owners });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const updateOwner = async (req, res) => {
  try {
    const { id } = req.params;
    const { fullName, email, mobile, bizName, bizType, bizGst, bizEmail, bizMobile, bizWebsite } = req.body;

    const updateData = {};
    if (fullName   !== undefined) updateData["ownerProfile.fullName"]                        = fullName;
    if (email      !== undefined) updateData["ownerProfile.email"]                           = email;
    if (mobile     !== undefined) { updateData["mobile"] = mobile; updateData["ownerProfile.mobile"] = mobile; }
    if (bizName    !== undefined) updateData["ownerProfile.businessDetails.name"]            = bizName;
    if (bizType    !== undefined) updateData["ownerProfile.businessDetails.type"]            = bizType;
    if (bizGst     !== undefined) updateData["ownerProfile.businessDetails.gstNumber"]       = bizGst;
    if (bizEmail   !== undefined) updateData["ownerProfile.businessDetails.email"]           = bizEmail;
    if (bizMobile  !== undefined) updateData["ownerProfile.businessDetails.mobile"]          = bizMobile;
    if (bizWebsite !== undefined) updateData["ownerProfile.businessDetails.website"]         = bizWebsite;

    const logoFile = fileByField(req.files, "businessLogo");
    if (logoFile)
      updateData["ownerProfile.businessDetails.logo"] = toUrl(logoFile.path);

    const owner = await SystemUser.findByIdAndUpdate(
      id,
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

    const owner = await SystemUser.findByIdAndUpdate(
      id,
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

    const owner = await SystemUser.findByIdAndDelete(id);
    if (!owner)
      return res.status(404).json({ success: false, message: "Owner not found" });

    res.json({ success: true, message: "Owner deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { getOwners, updateOwner, updateOwnerStatus, deleteOwner };
