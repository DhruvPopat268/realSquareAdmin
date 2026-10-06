const SystemUser = require("../../systemUsers.model");
const SystemUserSession = require("../../systemUsers.session.model");
const getAdminUserStats = require("../../../utils/adminUserStats");
const { runReraVerification } = require("../../mixed/reraVerification/controller");

const BROKER_ROLE_ID = process.env.BROKER_ROLE_ID;

const toUrl = (filePath) =>
  `${process.env.BACKEND_URL}${filePath.replace("/var/www/storage", "/storage")}`;

const fileByField = (files, name) => (files || []).find((f) => f.fieldname === name);
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const verifyBrokerRera = async (reraId, context) => {
  try {
    return { reraId, ...(await runReraVerification(reraId)) };
  } catch (err) {
    console.error(`[${context}] Broker RERA verification failed:`, err.message);
    return {
      reraId,
      verified: false,
      reason: "RERA verification could not be completed",
      projectDetails: null,
      sources: [],
    };
  }
};

const getBrokers = async (req, res) => {
  try {
    const isDeleted = req.query.isDeleted;
    if (isDeleted && !["true", "false", "all"].includes(isDeleted))
      return res.status(400).json({ success: false, message: "isDeleted must be true, false, or all" });
    const statsFilter = { role: BROKER_ROLE_ID };
    const filter = { ...statsFilter };
    if (isDeleted !== "all") filter.isDeleted = isDeleted === "true" ? true : { $ne: true };
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const skip = (page - 1) * limit;
    if (typeof req.query.search === "string" && req.query.search.trim()) {
      const search = new RegExp(escapeRegex(req.query.search.trim()), "i");
      filter.$or = [{ name: search }, { email: search }, { mobile: search }];
    }

    const [brokers, total, stats] = await Promise.all([
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
      data: brokers,
      stats,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const createBroker = async (req, res) => {
  try {
    const { mobile, fullName, email, yearsOfExperience, agencyName, bio } = req.body;
    const reraId = typeof req.body.reraId === "string" ? req.body.reraId.trim() : "";
    let enquiryCities = req.body.enquiryCities;

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

    const existing = await SystemUser.findOne({ mobile });
    if (existing)
      return res.status(409).json({ success: false, message: "Mobile already registered" });

    const profilePhotoFile = fileByField(req.files, "profilePhoto");
    const brokerProfile = {
      yearsOfExperience: yearsOfExperience ? Number(yearsOfExperience) : undefined,
      agencyName, bio,
    };
    if (reraId) brokerProfile.reraVerification = await verifyBrokerRera(reraId, "createBroker");

    const broker = await SystemUser.create({
      name: fullName,
      email,
      mobile,
      profilePhoto: profilePhotoFile ? toUrl(profilePhotoFile.path) : undefined,
      role: BROKER_ROLE_ID,
      isActive: true,
      enquiryCities,
      brokerProfile,
    });

    const populated = await broker.populate("role", "name permissions isActive");
    res.status(201).json({ success: true, data: populated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const updateBroker = async (req, res) => {
  try {
    const { id } = req.params;
    const { fullName, email, mobile, yearsOfExperience, agencyName, bio } = req.body;
    const submittedReraId = req.body.reraId;
    let { enquiryCities } = req.body;

    const updateData = {};
    const unsetData = {};
    if (fullName          !== undefined) updateData["name"]                            = fullName;
    if (email             !== undefined) updateData["email"]                           = email;
    if (agencyName        !== undefined) updateData["brokerProfile.agencyName"]        = agencyName;
    if (bio               !== undefined) updateData["brokerProfile.bio"]               = bio;
    if (yearsOfExperience !== undefined) updateData["brokerProfile.yearsOfExperience"] = Number(yearsOfExperience);
    if (mobile            !== undefined) updateData["mobile"]                          = mobile;

    if (submittedReraId !== undefined) {
      const reraId = typeof submittedReraId === "string" ? submittedReraId.trim() : "";
      if (!reraId || reraId.toLowerCase() === "null") {
        unsetData["brokerProfile.reraVerification"] = 1;
      } else {
        const existing = await SystemUser.findOne({ _id: id, role: BROKER_ROLE_ID, isDeleted: { $ne: true } })
          .select("brokerProfile.reraVerification.reraId");
        if (!existing) return res.status(404).json({ success: false, message: "Broker not found" });
        if (reraId !== existing.brokerProfile?.reraVerification?.reraId) {
          updateData["brokerProfile.reraVerification"] = await verifyBrokerRera(reraId, "updateBroker");
        }
      }
    }

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

    const profilePhotoFile = fileByField(req.files, "profilePhoto");
    if (profilePhotoFile)
      updateData["profilePhoto"] = toUrl(profilePhotoFile.path);

    const updateOperation = {};
    if (Object.keys(updateData).length) updateOperation.$set = updateData;
    if (Object.keys(unsetData).length) updateOperation.$unset = unsetData;

    const broker = await SystemUser.findOneAndUpdate(
      { _id: id, isDeleted: { $ne: true } },
      updateOperation,
      { new: true, runValidators: true }
    ).populate("role", "name permissions isActive");

    if (!broker)
      return res.status(404).json({ success: false, message: "Broker not found" });

    res.json({ success: true, data: broker });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const updateBrokerStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive, autoApprovalProperties } = req.body;

    if (isActive === undefined && autoApprovalProperties === undefined)
      return res.status(400).json({ success: false, message: "isActive or autoApprovalProperties is required" });

    const updateData = {};
    if (isActive               !== undefined) updateData.isActive               = isActive;
    if (autoApprovalProperties !== undefined) updateData.autoApprovalProperties = autoApprovalProperties;

    const broker = await SystemUser.findOneAndUpdate(
      { _id: id, isDeleted: { $ne: true } },
      { $set: updateData },
      { new: true }
    ).populate("role", "name permissions isActive");

    if (!broker)
      return res.status(404).json({ success: false, message: "Broker not found" });

    res.json({ success: true, data: broker });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const deleteBroker = async (req, res) => {
  try {
    const { id } = req.params;

    const broker = await SystemUser.findOneAndUpdate(
      { _id: id, role: BROKER_ROLE_ID, isDeleted: { $ne: true } },
      { $set: { isDeleted: true } },
      { new: true }
    );
    if (!broker)
      return res.status(404).json({ success: false, message: "Broker not found" });

    await SystemUserSession.deleteMany({ userId: broker._id });

    res.json({ success: true, message: "Broker deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { getBrokers, createBroker, updateBroker, updateBrokerStatus, deleteBroker };
