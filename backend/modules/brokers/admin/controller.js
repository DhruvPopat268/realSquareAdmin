const SystemUser = require("../../systemUsers.model");

const BROKER_ROLE_ID = process.env.BROKER_ROLE_ID;

const toUrl = (filePath) =>
  `${process.env.BACKEND_URL}${filePath.replace("/var/www/storage", "/storage")}`;

const fileByField = (files, name) => (files || []).find((f) => f.fieldname === name);

const getBrokers = async (req, res) => {
  try {
    const brokers = await SystemUser.find({ role: BROKER_ROLE_ID })
      .populate("role", "name permissions isActive")
      .sort({ createdAt: -1 });

    res.json({ success: true, data: brokers });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const createBroker = async (req, res) => {
  try {
    const { mobile, fullName, email, yearsOfExperience, agencyName, bio } = req.body;

    if (!mobile)
      return res.status(400).json({ success: false, message: "mobile is required" });

    const existing = await SystemUser.findOne({ mobile });
    if (existing)
      return res.status(409).json({ success: false, message: "Mobile already registered" });

    const profilePhotoFile = fileByField(req.files, "profilePhoto");
    const brokerProfile = {
      fullName, email, mobile,
      yearsOfExperience: yearsOfExperience ? Number(yearsOfExperience) : undefined,
      agencyName, bio,
      profilePhoto: profilePhotoFile ? toUrl(profilePhotoFile.path) : undefined,
    };

    const broker = await SystemUser.create({
      mobile,
      role: BROKER_ROLE_ID,
      isActive: true,
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

    const updateData = {};
    if (fullName          !== undefined) updateData["brokerProfile.fullName"]          = fullName;
    if (email             !== undefined) updateData["brokerProfile.email"]             = email;
    if (agencyName        !== undefined) updateData["brokerProfile.agencyName"]        = agencyName;
    if (bio               !== undefined) updateData["brokerProfile.bio"]               = bio;
    if (yearsOfExperience !== undefined) updateData["brokerProfile.yearsOfExperience"] = Number(yearsOfExperience);
    if (mobile            !== undefined) { updateData["mobile"] = mobile; updateData["brokerProfile.mobile"] = mobile; }

    const profilePhotoFile = fileByField(req.files, "profilePhoto");
    if (profilePhotoFile)
      updateData["brokerProfile.profilePhoto"] = toUrl(profilePhotoFile.path);

    const broker = await SystemUser.findByIdAndUpdate(
      id,
      { $set: updateData },
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

    const broker = await SystemUser.findByIdAndUpdate(
      id,
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

    const broker = await SystemUser.findByIdAndDelete(id);
    if (!broker)
      return res.status(404).json({ success: false, message: "Broker not found" });

    res.json({ success: true, message: "Broker deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { getBrokers, createBroker, updateBroker, updateBrokerStatus, deleteBroker };
