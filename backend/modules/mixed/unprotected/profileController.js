const mongoose = require("mongoose");
const SystemUser = require("../../systemUsers.model");
const { decryptProfileId } = require("../../../utils/generateQr");

const ROLE_FIELDS = {
  [process.env.OWNER_ROLE_ID]: "ownerProfile",
  [process.env.BROKER_ROLE_ID]: "brokerProfile",
  [process.env.BUILDER_ROLE_ID]: "builderProfile",
};

const getPublicProfile = async (req, res) => {
  const encryptedId = req.params.encryptedId;
  try {
    const userId = decryptProfileId(encryptedId);
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(404).json({ success: false, message: "Profile not found" });
    }

    const user = await SystemUser.findOne({
      _id: userId,
      isActive: { $ne: false },
      isDeleted: { $ne: true },
    }).select("+profileEncryptedId").populate("role", "name").lean();

    const roleId = user?.role?._id?.toString();
    const profileField = roleId ? ROLE_FIELDS[roleId] : null;
    const details = profileField ? user?.[profileField] : null;
    if (!user || user.profileEncryptedId !== encryptedId || !profileField || !details || !user.name?.trim() || !user.mobile?.trim()) {
      return res.status(404).json({ success: false, message: "Profile not found" });
    }

    const data = {
      name: user.name,
      mobile: user.mobile,
      email: user.email || "",
      profilePhoto: user.profilePhoto || "",
      role: user.role.name,
      roleKey: profileField.replace("Profile", ""),
      location: details.location?.name || "",
      state: details.state || "",
    };

    if (profileField === "ownerProfile") {
      const business = details.businessDetails || {};
      data.businessDetails = {
        name: business.name || "",
        logo: business.logo || "",
        type: business.type || "",
        gstNumber: business.gstNumber || "",
        email: business.email || "",
        mobile: business.mobile || "",
        website: business.website || "",
      };
    } else if (profileField === "brokerProfile") {
      const rera = details.reraVerification || {};
      data.brokerDetails = {
        agencyName: details.agencyName || "",
        reraId: rera.reraId || "",
        reraVerified: Boolean(rera.verified),
        yearsOfExperience: details.yearsOfExperience ?? null,
        bio: details.bio || "",
      };
    } else {
      data.builderDetails = {
        gstNumber: details.gstNumber || "",
        cinNumber: details.cinNumber || "",
        foundedYear: details.foundedYear ?? null,
        totalProjectsDelivered: details.totalProjectsDelivered ?? null,
      };
    }

    return res.status(200).json({ success: true, data });
  } catch (error) {
    const message = error.message || "";
    if (message.includes("PROFILE_QR_ENCRYPTION_KEY")) {
      return res.status(503).json({ success: false, message: "Public profile links are not configured" });
    }
    return res.status(404).json({ success: false, message: "Profile not found" });
  }
};

module.exports = { getPublicProfile };
